# SkillSync Platform Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the SkillSync platform to production environments. The platform is designed to be deployed on modern cloud platforms with support for containerization and serverless architectures.

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed
- Docker and Docker Compose (for containerized deployment)
- Access to a PostgreSQL database
- Redis instance for caching and sessions
- STUN/TURN servers for WebRTC (or use public servers)
- SSL certificates for HTTPS

## Pre-Deployment Checklist

Run the production readiness check:

```bash
npm run production-check
```

This script will verify:
- ✅ Environment configuration
- ✅ Dependencies and security
- ✅ Code quality and linting
- ✅ Test coverage
- ✅ Build process
- ✅ Performance optimizations
- ✅ Security configurations

## Environment Configuration

### Required Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Database
DATABASE_URL="postgresql://username:password@host:5432/skillsync_prod"
REDIS_URL="redis://username:password@host:6379"

# Authentication
NEXTAUTH_SECRET="your-super-secret-key-here"
NEXTAUTH_URL="https://your-domain.com"

# API Configuration
API_BASE_URL="https://api.your-domain.com"
WEBSOCKET_URL="wss://ws.your-domain.com"

# External Services
STUN_SERVER_URL="stun:stun.l.google.com:19302"
TURN_SERVER_URL="turn:your-turn-server.com:3478"
TURN_SERVER_USERNAME="username"
TURN_SERVER_CREDENTIAL="password"

# Email Service (optional)
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_USER="your-email@domain.com"
SMTP_PASS="your-email-password"

# Analytics (optional)
ANALYTICS_ID="your-analytics-id"

# Security
CORS_ORIGIN="https://your-domain.com"
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="900000"

# Performance
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="1"
```

### Security Considerations

1. **Never commit `.env.production` to version control**
2. Use strong, unique secrets for all keys
3. Enable HTTPS in production
4. Configure proper CORS origins
5. Set up rate limiting
6. Use environment-specific database credentials

## Deployment Options

### Option 1: Vercel Deployment (Recommended)

Vercel provides the easiest deployment for Next.js applications.

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Configure Project

```bash
# Login to Vercel
vercel login

# Initialize project
vercel

# Set environment variables
vercel env add DATABASE_URL production
vercel env add NEXTAUTH_SECRET production
# ... add all required environment variables
```

#### Step 3: Deploy

```bash
# Deploy to production
vercel --prod
```

#### Step 4: Configure Custom Domain

```bash
vercel domains add your-domain.com
```

### Option 2: Docker Deployment

#### Step 1: Build Docker Image

```bash
# Build the production image
docker build -t skillsync-platform:latest .

# Or use docker-compose
docker-compose -f docker-compose.prod.yml build
```

#### Step 2: Run with Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: skillsync_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

#### Step 3: Deploy

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Option 3: AWS Deployment

#### Using AWS App Runner

1. **Create App Runner Service**
   ```bash
   aws apprunner create-service \
     --service-name skillsync-platform \
     --source-configuration '{
       "ImageRepository": {
         "ImageIdentifier": "your-ecr-repo/skillsync:latest",
         "ImageConfiguration": {
           "Port": "3000",
           "RuntimeEnvironmentVariables": {
             "NODE_ENV": "production"
           }
         }
       }
     }'
   ```

2. **Configure Environment Variables**
   - Use AWS Systems Manager Parameter Store
   - Set up RDS for PostgreSQL
   - Use ElastiCache for Redis

#### Using ECS with Fargate

1. **Create Task Definition**
2. **Set up Application Load Balancer**
3. **Configure Auto Scaling**
4. **Set up CloudWatch monitoring**

### Option 4: Google Cloud Platform

#### Using Cloud Run

```bash
# Build and push to Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/skillsync-platform

# Deploy to Cloud Run
gcloud run deploy skillsync-platform \
  --image gcr.io/PROJECT_ID/skillsync-platform \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

## Database Setup

### PostgreSQL Setup

1. **Create Production Database**
   ```sql
   CREATE DATABASE skillsync_prod;
   CREATE USER skillsync_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE skillsync_prod TO skillsync_user;
   ```

2. **Run Migrations**
   ```bash
   npx prisma migrate deploy
   npx prisma generate
   ```

3. **Seed Initial Data**
   ```bash
   npx prisma db seed
   ```

### Redis Setup

Configure Redis for:
- Session storage
- Caching
- Real-time data
- Queue management

```bash
# Redis configuration
redis-cli CONFIG SET maxmemory 256mb
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## SSL/TLS Configuration

### Using Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Nginx Configuration

```nginx
# nginx.conf
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Proxy to Next.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Logging

### Application Monitoring

1. **Health Check Endpoint**
   ```typescript
   // pages/api/health.ts
   export default function handler(req, res) {
     res.status(200).json({
       status: 'healthy',
       timestamp: new Date().toISOString(),
       uptime: process.uptime(),
       memory: process.memoryUsage()
     });
   }
   ```

2. **Error Tracking**
   - Integrate Sentry for error tracking
   - Set up custom error boundaries
   - Configure logging levels

3. **Performance Monitoring**
   - Use Web Vitals tracking
   - Monitor API response times
   - Track WebRTC connection quality

### Logging Configuration

```typescript
// lib/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    ...(process.env.NODE_ENV !== 'production'
      ? [new winston.transports.Console()]
      : [])
  ]
});
```

## Performance Optimization

### Build Optimization

```javascript
// next.config.js
const nextConfig = {
  // Enable compression
  compress: true,

  // Optimize images
  images: {
    domains: ['your-cdn-domain.com'],
    formats: ['image/webp', 'image/avif']
  },

  // Bundle analyzer
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(new BundleAnalyzerPlugin());
      return config;
    }
  }),

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          }
        ]
      }
    ];
  }
};
```

### CDN Configuration

1. **Static Assets**
   - Use CDN for images, fonts, and static files
   - Configure proper cache headers
   - Enable compression (gzip/brotli)

2. **API Caching**
   - Implement Redis caching for API responses
   - Use appropriate cache-control headers
   - Set up cache invalidation strategies

## Backup and Recovery

### Database Backups

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="skillsync_backup_$DATE.sql"

pg_dump $DATABASE_URL > "$BACKUP_DIR/$FILENAME"
gzip "$BACKUP_DIR/$FILENAME"

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
```

### File Backups

```bash
# Backup uploaded files
rsync -av --delete /app/uploads/ /backups/uploads/
```

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancing**
   - Use multiple application instances
   - Configure session affinity for WebSocket connections
   - Implement health checks

2. **Database Scaling**
   - Set up read replicas
   - Implement connection pooling
   - Consider database sharding for large datasets

3. **Caching Strategy**
   - Use Redis Cluster for high availability
   - Implement distributed caching
   - Cache frequently accessed data

### Auto Scaling

```yaml
# Kubernetes HPA example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: skillsync-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: skillsync-platform
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Security Hardening

### Application Security

1. **Rate Limiting**
   ```typescript
   import rateLimit from 'express-rate-limit';

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
     message: 'Too many requests from this IP'
   });
   ```

2. **Input Validation**
   - Validate all user inputs
   - Sanitize data before database operations
   - Use parameterized queries

3. **Authentication Security**
   - Implement proper session management
   - Use secure JWT tokens
   - Enable two-factor authentication

### Infrastructure Security

1. **Network Security**
   - Configure firewalls
   - Use VPC/private networks
   - Implement DDoS protection

2. **Access Control**
   - Use IAM roles and policies
   - Implement least privilege principle
   - Regular security audits

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   npm run build
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   npx prisma db pull
   ```

3. **WebSocket Connection Problems**
   - Check firewall settings
   - Verify proxy configuration
   - Test STUN/TURN servers

### Debugging Tools

```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f postgres

# System resources
htop
df -h
free -m
```

## Maintenance

### Regular Tasks

1. **Weekly**
   - Review application logs
   - Check system resources
   - Update dependencies

2. **Monthly**
   - Security patches
   - Database maintenance
   - Performance review

3. **Quarterly**
   - Backup testing
   - Security audit
   - Capacity planning

### Update Process

```bash
# 1. Backup current version
docker-compose exec postgres pg_dump -U user database > backup.sql

# 2. Pull latest changes
git pull origin main

# 3. Update dependencies
npm ci

# 4. Run migrations
npx prisma migrate deploy

# 5. Build and deploy
npm run build
docker-compose up -d --build
```

## Support and Documentation

- **API Documentation**: `/docs/API_DOCUMENTATION.md`
- **Component Documentation**: `/docs/COMPONENT_DOCUMENTATION.md`
- **Architecture Overview**: `/docs/ARCHITECTURE.md`
- **Contributing Guide**: `/docs/CONTRIBUTING.md`

For deployment support:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting section

---

**Note**: This deployment guide assumes familiarity with cloud platforms and DevOps practices. For specific platform configurations, refer to the respective cloud provider documentation.