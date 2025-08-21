import { NextRequest } from 'next/server';
import Joi from 'joi';
import { InputSanitizer, CSRFProtection } from './security';

/**
 * Enhanced validation schemas with security considerations
 */
export const SecurityValidationSchemas = {
  // User input validation with XSS protection
  userInput: Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required()
      .custom((value, helpers) => {
        // Additional security checks
        if (/[<>'"&]/.test(value)) {
          return helpers.error('string.unsafe');
        }
        return value;
      })
      .messages({
        'string.unsafe': 'Username contains unsafe characters',
      }),

    email: Joi.string()
      .email({ tlds: { allow: false } })
      .max(254) // RFC 5321 limit
      .required()
      .custom((value, helpers) => {
        const sanitized = InputSanitizer.sanitizeEmail(value);
        if (sanitized !== value) {
          return helpers.error('string.unsafe');
        }
        return sanitized;
      }),

    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/)
      .required()
      .custom((value, helpers) => {
        // Check for common injection patterns
        if (/[<>'"&;\\]/.test(value)) {
          return helpers.error('string.unsafe');
        }
        return value;
      }),
  }),

  // API request validation
  apiRequest: Joi.object({
    // Limit request size
    body: Joi.object().max(100).unknown(true), // Max 100 properties

    // Validate common parameters
    id: Joi.string().uuid().when('$context.requireId', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

    page: Joi.number().integer().min(1).max(1000).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),

    // Search parameters with injection protection
    search: Joi.string()
      .max(200)
      .custom((value, helpers) => {
        const sanitized = InputSanitizer.sanitizeSqlInput(value);
        if (sanitized !== value) {
          return helpers.error('string.unsafe');
        }
        return sanitized;
      })
      .optional(),
  }),

  // File upload validation
  fileUpload: Joi.object({
    filename: Joi.string()
      .max(255)
      .pattern(/^[a-zA-Z0-9._-]+$/)
      .required()
      .messages({
        'string.pattern.base': 'Filename contains invalid characters',
      }),

    mimetype: Joi.string()
      .valid(
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain'
      )
      .required(),

    size: Joi.number()
      .integer()
      .max(10 * 1024 * 1024) // 10MB max
      .required(),
  }),

  // WebRTC signaling validation
  webrtcSignaling: Joi.object({
    type: Joi.string().valid('offer', 'answer', 'ice-candidate').required(),

    sdp: Joi.string()
      .max(100000) // Reasonable SDP size limit
      .when('type', {
        is: Joi.valid('offer', 'answer'),
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),

    candidate: Joi.string()
      .max(1000)
      .when('type', {
        is: 'ice-candidate',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),

    sdpMLineIndex: Joi.number()
      .integer()
      .min(0)
      .when('type', {
        is: 'ice-candidate',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),

    sdpMid: Joi.string()
      .max(100)
      .when('type', {
        is: 'ice-candidate',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
      }),
  }),
};

/**
 * Request validation middleware with security enhancements
 */
export class SecureRequestValidator {
  /**
   * Validate and sanitize request body
   */
  static async validateRequest<T>(
    request: NextRequest,
    schema: Joi.ObjectSchema<T>,
    options: {
      requireCSRF?: boolean;
      maxBodySize?: number;
      allowedMethods?: string[];
    } = {}
  ): Promise<{
    isValid: boolean;
    data?: T;
    errors?: Record<string, string>;
    securityViolation?: string;
  }> {
    try {
      // Check HTTP method
      if (options.allowedMethods && !options.allowedMethods.includes(request.method)) {
        return {
          isValid: false,
          securityViolation: `Method ${request.method} not allowed`,
        };
      }

      // Check content length
      const contentLength = request.headers.get('content-length');
      const maxSize = options.maxBodySize || 1024 * 1024; // 1MB default

      if (contentLength && parseInt(contentLength, 10) > maxSize) {
        return {
          isValid: false,
          securityViolation: 'Request body too large',
        };
      }

      // Parse and validate request body
      let body: any;
      try {
        const text = await request.text();
        if (text) {
          body = JSON.parse(text);
        } else {
          body = {};
        }
      } catch (error) {
        return {
          isValid: false,
          securityViolation: 'Invalid JSON format',
        };
      }

      // CSRF protection for state-changing operations
      if (options.requireCSRF && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        const csrfToken = request.headers.get('x-csrf-token') || body._csrf;
        const sessionToken = request.headers.get('x-session-csrf');

        if (!csrfToken || !sessionToken || !CSRFProtection.validateToken(csrfToken, sessionToken)) {
          return {
            isValid: false,
            securityViolation: 'Invalid CSRF token',
          };
        }

        // Remove CSRF token from body before validation
        delete body._csrf;
      }

      // Sanitize input data
      const sanitizedBody = InputSanitizer.sanitizeInput(body);

      // Validate against schema
      const { error, value } = schema.validate(sanitizedBody, {
        abortEarly: false,
        stripUnknown: true,
        allowUnknown: false,
      });

      if (error) {
        const errors: Record<string, string> = {};
        error.details.forEach((detail) => {
          const key = detail.path.join('.');
          errors[key] = detail.message;
        });

        return {
          isValid: false,
          errors,
        };
      }

      return {
        isValid: true,
        data: value,
      };
    } catch (error) {
      console.error('Request validation error:', error);
      return {
        isValid: false,
        securityViolation: 'Validation failed',
      };
    }
  }

  /**
   * Validate query parameters
   */
  static validateQueryParams(
    request: NextRequest,
    schema: Joi.ObjectSchema
  ): {
    isValid: boolean;
    data?: any;
    errors?: Record<string, string>;
  } {
    try {
      const url = new URL(request.url);
      const params: Record<string, any> = {};

      // Convert URLSearchParams to object
      url.searchParams.forEach((value, key) => {
        // Handle array parameters (e.g., ?tags=js&tags=react)
        if (params[key]) {
          if (Array.isArray(params[key])) {
            params[key].push(value);
          } else {
            params[key] = [params[key], value];
          }
        } else {
          params[key] = value;
        }
      });

      // Sanitize query parameters
      const sanitizedParams = InputSanitizer.sanitizeInput(params);

      // Validate against schema
      const { error, value } = schema.validate(sanitizedParams, {
        abortEarly: false,
        stripUnknown: true,
      });

      if (error) {
        const errors: Record<string, string> = {};
        error.details.forEach((detail) => {
          const key = detail.path.join('.');
          errors[key] = detail.message;
        });

        return {
          isValid: false,
          errors,
        };
      }

      return {
        isValid: true,
        data: value,
      };
    } catch (error) {
      console.error('Query parameter validation error:', error);
      return {
        isValid: false,
        errors: { general: 'Invalid query parameters' },
      };
    }
  }

  /**
   * Validate file uploads with security checks
   */
  static validateFileUpload(file: {
    name: string;
    type: string;
    size: number;
    buffer?: Buffer;
  }): {
    isValid: boolean;
    errors?: string[];
    securityViolation?: string;
  } {
    const errors: string[] = [];

    // File extension validation
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      errors.push('File type not allowed');
    }

    // MIME type validation
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(file.type)) {
      errors.push('Invalid MIME type');
    }

    // File size validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push('File size exceeds limit');
    }

    // Filename security check
    if (/[<>:"/\\|?*]/.test(file.name)) {
      return {
        isValid: false,
        securityViolation: 'Filename contains unsafe characters',
      };
    }

    // Magic number validation (if buffer is provided)
    if (file.buffer) {
      const magicNumbers = {
        'image/jpeg': [0xFF, 0xD8, 0xFF],
        'image/png': [0x89, 0x50, 0x4E, 0x47],
        'image/gif': [0x47, 0x49, 0x46],
        'application/pdf': [0x25, 0x50, 0x44, 0x46],
      };

      const expectedMagic = magicNumbers[file.type as keyof typeof magicNumbers];
      if (expectedMagic) {
        const actualMagic = Array.from(file.buffer.slice(0, expectedMagic.length));
        if (!expectedMagic.every((byte, index) => byte === actualMagic[index])) {
          return {
            isValid: false,
            securityViolation: 'File content does not match declared type',
          };
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

/**
 * SQL injection prevention utilities
 */
export class SQLInjectionPrevention {
  private static readonly dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(UNION\s+SELECT)/gi,
    /(\bOR\s+1\s*=\s*1\b)/gi,
    /(\bAND\s+1\s*=\s*1\b)/gi,
    /(--|\#|\/\*|\*\/)/g,
    /(\bxp_cmdshell\b)/gi,
    /(\bsp_executesql\b)/gi,
  ];

  /**
   * Check if input contains potential SQL injection patterns
   */
  static containsSQLInjection(input: string): boolean {
    return this.dangerousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize input to prevent SQL injection
   */
  static sanitizeForSQL(input: string): string {
    return input
      .replace(/[';\\]/g, '') // Remove dangerous characters
      .replace(/--/g, '') // Remove SQL comments
      .replace(/\/\*/g, '') // Remove block comment start
      .replace(/\*\//g, '') // Remove block comment end
      .replace(/\bxp_\w+/gi, '') // Remove extended procedures
      .trim();
  }
}

/**
 * NoSQL injection prevention utilities
 */
export class NoSQLInjectionPrevention {
  /**
   * Sanitize MongoDB query objects
   */
  static sanitizeMongoQuery(query: any): any {
    if (typeof query !== 'object' || query === null) {
      return query;
    }

    const sanitized: any = {};

    for (const [key, value] of Object.entries(query)) {
      // Remove dangerous operators
      if (key.startsWith('$') && !this.isAllowedOperator(key)) {
        continue;
      }

      // Recursively sanitize nested objects
      if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMongoQuery(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private static isAllowedOperator(operator: string): boolean {
    const allowedOperators = [
      '$eq', '$ne', '$gt', '$gte', '$lt', '$lte',
      '$in', '$nin', '$and', '$or', '$not',
      '$exists', '$type', '$regex', '$options'
    ];

    return allowedOperators.includes(operator);
  }
}

/**
 * Command injection prevention utilities
 */
export class CommandInjectionPrevention {
  private static readonly dangerousPatterns = [
    /[;&|`$(){}[\]]/g,
    /(\b(rm|del|format|shutdown|reboot|halt)\b)/gi,
    /(>|<|>>)/g,
  ];

  /**
   * Check if input contains potential command injection patterns
   */
  static containsCommandInjection(input: string): boolean {
    return this.dangerousPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Sanitize input to prevent command injection
   */
  static sanitizeForCommand(input: string): string {
    return input
      .replace(/[;&|`$(){}[\]<>]/g, '') // Remove shell metacharacters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }
}