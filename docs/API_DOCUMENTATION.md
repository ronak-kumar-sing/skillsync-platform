# SkillSync Platform API Documentation

## Overview

The SkillSync Platform API provides comprehensive endpoints for user management, matching, video calling, and analytics. All endpoints use RESTful conventions and return JSON responses.

## Base URL

```
Production: https://api.skillsync.com
Development: http://localhost:3000/api
```

## Authentication

All protected endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Authentication Flow

1. **Register**: `POST /auth/register`
2. **Login**: `POST /auth/login`
3. **Refresh Token**: `POST /auth/refresh`
4. **Logout**: `POST /auth/logout`

## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securePassword123",
  "confirmPassword": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "isVerified": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

#### POST /api/auth/login

Authenticate user and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "johndoe",
      "profileComplete": true,
      "lastActive": "2024-01-01T00:00:00.000Z"
    },
    "tokens": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```

#### POST /api/auth/refresh

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "new-jwt-access-token"
  }
}
```

### User Profile Endpoints

#### GET /api/profile

Get current user's profile information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "avatar": "https://example.com/avatar.jpg",
    "timezone": "America/New_York",
    "skills": [
      {
        "id": "uuid",
        "name": "JavaScript",
        "category": "Programming",
        "proficiencyLevel": 4,
        "verified": true,
        "endorsements": 12
      }
    ],
    "learningGoals": ["React", "Node.js", "TypeScript"],
    "preferences": {
      "sessionDuration": 60,
      "communicationStyle": "collaborative",
      "availability": {
        "timezone": "America/New_York",
        "schedule": {
          "monday": ["09:00", "17:00"],
          "tuesday": ["09:00", "17:00"]
        }
      }
    },
    "stats": {
      "totalSessions": 45,
      "totalHours": 67.5,
      "averageRating": 4.8,
      "achievementCount": 12
    }
  }
}
```

#### PUT /api/profile

Update user profile information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "username": "newusername",
  "timezone": "America/Los_Angeles",
  "learningGoals": ["React", "Vue.js"],
  "preferences": {
    "sessionDuration": 90,
    "communicationStyle": "structured"
  }
}
```

#### POST /api/profile/skills

Add or update user skills.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "skills": [
    {
      "name": "Python",
      "category": "Programming",
      "proficiencyLevel": 3
    },
    {
      "name": "Machine Learning",
      "category": "Data Science",
      "proficiencyLevel": 2
    }
  ]
}
```

### Matching Endpoints

#### POST /api/matching/request

Request to be matched with a learning partner.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "preferredSkills": ["javascript", "react"],
  "sessionType": "learning",
  "duration": 60,
  "urgency": "medium",
  "preferences": {
    "experienceLevel": "intermediate",
    "communicationStyle": "collaborative"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "queueId": "uuid",
    "position": 3,
    "estimatedWaitTime": 120,
    "status": "queued"
  }
}
```

#### GET /api/matching/queue-status

Get current queue status for the user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "inQueue": true,
    "position": 2,
    "estimatedWaitTime": 60,
    "queuedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### DELETE /api/matching/queue

Remove user from matching queue.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Removed from queue successfully"
}
```

### Session Endpoints

#### GET /api/sessions

Get user's session history.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by status (active, completed, cancelled)

**Response:**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "uuid",
        "partnerId": "uuid",
        "partnerUsername": "janedoe",
        "startTime": "2024-01-01T14:00:00.000Z",
        "endTime": "2024-01-01T15:00:00.000Z",
        "duration": 60,
        "sessionType": "learning",
        "topics": ["JavaScript", "React"],
        "rating": 5,
        "feedback": "Great session!",
        "status": "completed"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

#### POST /api/sessions/:sessionId/feedback

Submit feedback for a completed session.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "rating": 5,
  "feedback": "Excellent learning session. Very helpful partner!",
  "topics": ["JavaScript", "React Hooks"],
  "skillsImproved": ["javascript"],
  "wouldRecommend": true
}
```

### Achievement Endpoints

#### GET /api/achievements

Get user's achievements and progress.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "achievements": [
      {
        "id": "uuid",
        "name": "First Session",
        "description": "Complete your first learning session",
        "icon": "🎯",
        "category": "milestone",
        "points": 100,
        "rarity": "common",
        "earnedAt": "2024-01-01T15:00:00.000Z"
      }
    ],
    "stats": {
      "totalPoints": 1250,
      "totalAchievements": 8,
      "rank": "Intermediate Learner",
      "nextRankPoints": 500
    }
  }
}
```

#### GET /api/leaderboard

Get platform leaderboard.

**Query Parameters:**
- `category` (optional): Filter by category (points, sessions, hours)
- `timeframe` (optional): Filter by timeframe (week, month, all)
- `limit` (optional): Number of results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "leaderboard": [
      {
        "rank": 1,
        "userId": "uuid",
        "username": "toplearner",
        "avatar": "https://example.com/avatar.jpg",
        "points": 5000,
        "sessions": 120,
        "hours": 180
      }
    ],
    "userRank": {
      "rank": 45,
      "points": 1250,
      "sessions": 25,
      "hours": 37.5
    }
  }
}
```

### Dashboard Endpoints

#### GET /api/dashboard/stats

Get dashboard statistics and metrics.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "totalSessions": 25,
      "totalHours": 37.5,
      "averageRating": 4.8,
      "currentStreak": 7,
      "longestStreak": 12
    },
    "platform": {
      "onlineUsers": 1247,
      "activeMatches": 89,
      "queueLength": 23,
      "totalSessions": 50000
    },
    "recent": {
      "lastSession": "2024-01-01T15:00:00.000Z",
      "nextScheduled": null,
      "recentAchievements": 2
    }
  }
}
```

#### GET /api/dashboard/activity

Get recent activity feed.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "activities": [
      {
        "id": "uuid",
        "type": "session_completed",
        "title": "Completed session with @janedoe",
        "description": "60-minute JavaScript learning session",
        "timestamp": "2024-01-01T15:00:00.000Z",
        "metadata": {
          "sessionId": "uuid",
          "partnerId": "uuid",
          "rating": 5
        }
      }
    ]
  }
}
```

## WebSocket Events

The platform uses Socket.io for real-time communication.

### Connection

```javascript
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### Events

#### Client to Server

**matching:join-queue**
```javascript
socket.emit('matching:join-queue', {
  preferredSkills: ['javascript', 'react'],
  sessionType: 'learning',
  duration: 60
});
```

**matching:leave-queue**
```javascript
socket.emit('matching:leave-queue');
```

**call:offer**
```javascript
socket.emit('call:offer', {
  sessionId: 'uuid',
  offer: rtcSessionDescription
});
```

#### Server to Client

**matching:found**
```javascript
socket.on('matching:found', (data) => {
  console.log('Match found:', data);
  // data: { sessionId, partnerId, partnerInfo }
});
```

**matching:queue-update**
```javascript
socket.on('matching:queue-update', (data) => {
  console.log('Queue update:', data);
  // data: { position, estimatedWaitTime }
});
```

**call:incoming**
```javascript
socket.on('call:incoming', (data) => {
  console.log('Incoming call:', data);
  // data: { sessionId, callerId, callerInfo }
});
```

## Error Handling

All API responses follow a consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "requestId": "uuid"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Rate Limiting

API endpoints are rate limited to ensure fair usage:

- **Authentication endpoints**: 5 requests per minute
- **General endpoints**: 100 requests per minute
- **WebSocket connections**: 1 connection per user

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## Pagination

List endpoints support pagination with consistent parameters:

- `page`: Page number (1-based)
- `limit`: Items per page (max 100)
- `sort`: Sort field
- `order`: Sort order (asc/desc)

Response format:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## SDK Examples

### JavaScript/TypeScript

```typescript
import { SkillSyncAPI } from '@skillsync/sdk';

const api = new SkillSyncAPI({
  baseURL: 'https://api.skillsync.com',
  apiKey: 'your-api-key'
});

// Login
const { user, tokens } = await api.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Request matching
const matchRequest = await api.matching.request({
  preferredSkills: ['javascript', 'react'],
  sessionType: 'learning'
});

// Get profile
const profile = await api.profile.get();
```

### cURL Examples

```bash
# Login
curl -X POST https://api.skillsync.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get profile
curl -X GET https://api.skillsync.com/api/profile \
  -H "Authorization: Bearer your-jwt-token"

# Request matching
curl -X POST https://api.skillsync.com/api/matching/request \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"preferredSkills":["javascript"],"sessionType":"learning"}'
```

## Webhooks

SkillSync supports webhooks for real-time notifications:

### Webhook Events

- `session.started`: Session has begun
- `session.completed`: Session has ended
- `achievement.earned`: User earned an achievement
- `match.found`: User was matched with a partner

### Webhook Payload

```json
{
  "event": "session.completed",
  "timestamp": "2024-01-01T15:00:00.000Z",
  "data": {
    "sessionId": "uuid",
    "userId": "uuid",
    "partnerId": "uuid",
    "duration": 60,
    "rating": 5
  }
}
```

## Support

For API support and questions:
- Documentation: https://docs.skillsync.com
- Support Email: api-support@skillsync.com
- Discord: https://discord.gg/skillsync