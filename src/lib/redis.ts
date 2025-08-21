import Redis from 'ioredis';

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

// Create Redis client instance
const redis = new Redis(redisConfig);

// Redis client for pub/sub operations
const redisPubSub = new Redis(redisConfig);

// Error handling
redis.on('error', (error) => {
  console.error('Redis connection error:', error);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('ready', () => {
  console.log('Redis client ready');
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

redisPubSub.on('error', (error) => {
  console.error('Redis Pub/Sub connection error:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing Redis connections...');
  await redis.quit();
  await redisPubSub.quit();
});

process.on('SIGTERM', async () => {
  console.log('Closing Redis connections...');
  await redis.quit();
  await redisPubSub.quit();
});

export { redis, redisPubSub };
export default redis;