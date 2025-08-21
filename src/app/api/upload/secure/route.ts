import { NextRequest, NextResponse } from 'next/server';
import { SecurityMiddleware, FileUploadSecurity } from '@/lib/middleware';
import { DataEncryption } from '@/lib/security';
import { UserRateLimiter } from '@/lib/rate-limiter';

/**
 * Secure file upload endpoint with comprehensive security measures
 */
export const POST = SecurityMiddleware.createSecureAPIWrapper(
  async (request: NextRequest) => {
    try {
      // Get authenticated user (this would come from auth middleware)
      const userId = 'user-123'; // Placeholder - would come from verified JWT

      // Check user-specific upload rate limits
      const userRateLimit = await UserRateLimiter.checkUserRateLimit(userId, 'api');
      if (!userRateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Upload rate limit exceeded',
            message: 'Too many uploads. Please try again later.',
            retryAfter: Math.ceil((userRateLimit.resetTime - Date.now()) / 1000)
          },
          {
            status: 429,
            headers: {
              'Retry-After': Math.ceil((userRateLimit.resetTime - Date.now()) / 1000).toString()
            }
          }
        );
      }

      // Parse multipart form data
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const fileType = formData.get('type') as string || 'general';

      if (!file) {
        return NextResponse.json(
          {
            error: 'No file provided',
            message: 'Please select a file to upload',
          },
          { status: 400 }
        );
      }

      // Convert file to buffer for security validation
      const buffer = Buffer.from(await file.arrayBuffer());

      // Comprehensive file validation
      const fileValidation = FileUploadSecurity.validateUploadedFile({
        name: file.name,
        type: file.type,
        size: file.size,
        buffer,
      });

      if (!fileValidation.isValid) {
        return NextResponse.json(
          {
            error: 'File validation failed',
            message: fileValidation.securityViolation || 'Invalid file',
            details: fileValidation.errors,
          },
          { status: 400 }
        );
      }

      // Scan file for malware
      const malwareScan = await FileUploadSecurity.scanFileForMalware(buffer);
      if (!malwareScan.isSafe) {
        console.warn(`Malware detected in file upload from user ${userId}:`, malwareScan.threats);

        return NextResponse.json(
          {
            error: 'Security threat detected',
            message: 'File contains potentially malicious content',
          },
          { status: 400 }
        );
      }

      // Generate secure filename
      const fileExtension = file.name.substring(file.name.lastIndexOf('.'));
      const secureFilename = `${DataEncryption.generateSecureToken(16)}${fileExtension}`;

      // Encrypt file content if it contains sensitive data
      let processedBuffer = buffer;
      if (fileType === 'sensitive' || file.type === 'text/plain') {
        try {
          const encryptedContent = DataEncryption.encrypt(buffer.toString('base64'));
          processedBuffer = Buffer.from(encryptedContent);
        } catch (error) {
          console.error('File encryption error:', error);
          return NextResponse.json(
            {
              error: 'File processing failed',
              message: 'Unable to secure file content',
            },
            { status: 500 }
          );
        }
      }

      // Store file metadata securely
      const fileMetadata = {
        id: DataEncryption.generateSecureToken(16),
        originalName: file.name,
        secureFilename,
        mimeType: file.type,
        size: file.size,
        uploadedBy: userId,
        uploadedAt: new Date().toISOString(),
        encrypted: fileType === 'sensitive' || file.type === 'text/plain',
        hash: DataEncryption.hash(buffer.toString('base64')),
      };

      // In a real implementation, you would:
      // 1. Store the file in secure cloud storage (S3, etc.)
      // 2. Save metadata to database
      // 3. Set up proper access controls

      // For this example, we'll simulate successful upload
      console.log('File uploaded successfully:', fileMetadata);

      return NextResponse.json(
        {
          success: true,
          file: {
            id: fileMetadata.id,
            name: fileMetadata.originalName,
            size: fileMetadata.size,
            type: fileMetadata.mimeType,
            uploadedAt: fileMetadata.uploadedAt,
            encrypted: fileMetadata.encrypted,
          },
          message: 'File uploaded successfully',
        },
        { status: 201 }
      );

    } catch (error) {
      console.error('Secure file upload error:', error);

      return NextResponse.json(
        {
          error: 'Upload failed',
          message: 'Unable to process file upload',
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    rateLimitType: 'upload',
    validateInput: false, // We handle multipart data manually
    requireCSRF: true,
    maxBodySize: 10 * 1024 * 1024, // 10MB
    allowedMethods: ['POST'],
  }
);

/**
 * Secure file download endpoint
 */
export const GET = SecurityMiddleware.createSecureAPIWrapper(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const fileId = searchParams.get('id');

      if (!fileId) {
        return NextResponse.json(
          { error: 'File ID required' },
          { status: 400 }
        );
      }

      // Get authenticated user
      const userId = 'user-123'; // Placeholder

      // Validate file access permissions
      const hasAccess = await validateFileAccess(userId, fileId);
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: 'Access denied',
            message: 'You do not have permission to access this file',
          },
          { status: 403 }
        );
      }

      // Get file metadata and content
      const fileData = await getSecureFile(fileId);
      if (!fileData) {
        return NextResponse.json(
          { error: 'File not found' },
          { status: 404 }
        );
      }

      // Decrypt file content if encrypted
      let fileContent = fileData.content;
      if (fileData.encrypted) {
        try {
          const decryptedBase64 = DataEncryption.decrypt(fileData.content.toString());
          fileContent = Buffer.from(decryptedBase64, 'base64');
        } catch (error) {
          console.error('File decryption error:', error);
          return NextResponse.json(
            {
              error: 'File access failed',
              message: 'Unable to decrypt file content',
            },
            { status: 500 }
          );
        }
      }

      // Return file with security headers
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          'Content-Type': fileData.mimeType,
          'Content-Disposition': `attachment; filename="${fileData.originalName}"`,
          'Content-Length': fileContent.length.toString(),
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        },
      });

    } catch (error) {
      console.error('Secure file download error:', error);

      return NextResponse.json(
        {
          error: 'Download failed',
          message: 'Unable to retrieve file',
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    rateLimitType: 'api',
    allowedMethods: ['GET'],
  }
);

// Helper functions
async function validateFileAccess(userId: string, fileId: string): Promise<boolean> {
  // This would check if the user has access to the file
  // Implementation would involve database queries to check ownership/permissions
  return true; // Placeholder
}

async function getSecureFile(fileId: string): Promise<{
  originalName: string;
  mimeType: string;
  content: Buffer;
  encrypted: boolean;
} | null> {
  // This would retrieve file metadata and content from secure storage
  // For this example, we'll return null to simulate file not found
  return null; // Placeholder
}

// Disable other HTTP methods
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });