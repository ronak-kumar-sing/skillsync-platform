import { NextRequest, NextResponse } from 'next/server';
import { SecurityMiddleware } from '@/lib/middleware';
import { WebRTCSecurity } from '@/lib/security';
import { SecurityValidationSchemas } from '@/lib/input-validation';
import { validateRequest } from '@/lib/validation';
import Joi from 'joi';

// WebRTC signaling validation schema
const signalingSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
  type: Joi.string().valid('offer', 'answer', 'ice-candidate').required(),
  data: Joi.object({
    sdp: Joi.string().max(100000).when('$type', {
      is: Joi.valid('offer', 'answer'),
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    candidate: Joi.string().max(1000).when('$type', {
      is: 'ice-candidate',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    sdpMLineIndex: Joi.number().integer().min(0).when('$type', {
      is: 'ice-candidate',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    sdpMid: Joi.string().max(100).when('$type', {
      is: 'ice-candidate',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
  }).required(),
}).external((value) => {
  // Set context for conditional validation
  return { ...value, $type: value.type };
});

/**
 * Secure WebRTC signaling endpoint
 */
export const POST = SecurityMiddleware.createSecureAPIWrapper(
  async (request: NextRequest) => {
    try {
      // Parse and validate request body
      const body = await request.json();
      const validation = validateRequest(signalingSchema, body);

      if (!validation.isValid) {
        return NextResponse.json(
          {
            error: 'Invalid signaling data',
            details: validation.errors,
          },
          { status: 400 }
        );
      }

      const { sessionId, type, data } = validation.data!;

      // Additional WebRTC-specific validation
      if (!WebRTCSecurity.validateSignalingData({ type, ...data })) {
        return NextResponse.json(
          {
            error: 'Invalid WebRTC signaling data',
            message: 'Signaling data failed security validation',
          },
          { status: 400 }
        );
      }

      // Get authenticated user from middleware
      const authHeader = request.headers.get('authorization');
      if (!authHeader) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }

      // Extract user ID from token (this would be done by auth middleware)
      // For now, we'll simulate it
      const userId = 'user-123'; // This would come from the verified JWT

      // Validate session access
      const hasAccess = await validateSessionAccess(userId, sessionId);
      if (!hasAccess) {
        return NextResponse.json(
          {
            error: 'Access denied',
            message: 'You do not have access to this session',
          },
          { status: 403 }
        );
      }

      // Process signaling data based on type
      let result;
      switch (type) {
        case 'offer':
          result = await handleOffer(sessionId, userId, data);
          break;
        case 'answer':
          result = await handleAnswer(sessionId, userId, data);
          break;
        case 'ice-candidate':
          result = await handleIceCandidate(sessionId, userId, data);
          break;
        default:
          return NextResponse.json(
            { error: 'Unknown signaling type' },
            { status: 400 }
          );
      }

      return NextResponse.json({
        success: true,
        sessionId,
        type,
        result,
      });

    } catch (error) {
      console.error('WebRTC signaling error:', error);

      return NextResponse.json(
        {
          error: 'Signaling failed',
          message: 'Unable to process signaling data',
        },
        { status: 500 }
      );
    }
  },
  {
    requireAuth: true,
    rateLimitType: 'api',
    validateInput: true,
    requireCSRF: true,
    maxBodySize: 200 * 1024, // 200KB for WebRTC signaling data
    allowedMethods: ['POST'],
  }
);

/**
 * Get secure ICE servers configuration
 */
export const GET = SecurityMiddleware.createSecureAPIWrapper(
  async (request: NextRequest) => {
    try {
      // Get secure ICE server configuration
      const iceServers = WebRTCSecurity.getSecureICEServers();

      return NextResponse.json({
        iceServers,
        // Additional WebRTC configuration
        configuration: {
          iceTransportPolicy: 'all',
          bundlePolicy: 'balanced',
          rtcpMuxPolicy: 'require',
          iceCandidatePoolSize: 10,
        },
      });

    } catch (error) {
      console.error('ICE servers configuration error:', error);

      return NextResponse.json(
        {
          error: 'Configuration unavailable',
          message: 'Unable to retrieve WebRTC configuration',
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

// Helper functions for signaling processing
async function validateSessionAccess(userId: string, sessionId: string): Promise<boolean> {
  // This would check if the user has access to the session
  // For now, we'll return true as a placeholder
  return true;
}

async function handleOffer(sessionId: string, userId: string, data: any) {
  // Process WebRTC offer
  // This would typically involve:
  // 1. Storing the offer in Redis/database
  // 2. Notifying the other participant via WebSocket
  // 3. Returning confirmation

  console.log(`Processing offer for session ${sessionId} from user ${userId}`);

  return {
    message: 'Offer processed successfully',
    timestamp: Date.now(),
  };
}

async function handleAnswer(sessionId: string, userId: string, data: any) {
  // Process WebRTC answer
  console.log(`Processing answer for session ${sessionId} from user ${userId}`);

  return {
    message: 'Answer processed successfully',
    timestamp: Date.now(),
  };
}

async function handleIceCandidate(sessionId: string, userId: string, data: any) {
  // Process ICE candidate
  console.log(`Processing ICE candidate for session ${sessionId} from user ${userId}`);

  return {
    message: 'ICE candidate processed successfully',
    timestamp: Date.now(),
  };
}

// Disable other HTTP methods
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });