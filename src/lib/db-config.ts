// Database configuration and optimization settings
export const dbConfig = {
  // Connection pool settings
  pool: {
    min: 2,
    max: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
    acquireTimeoutMillis: parseInt(process.env.DATABASE_POOL_TIMEOUT || '20000'),
    createTimeoutMillis: 30000,
    destroyTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100,
  },

  // Query optimization settings
  query: {
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second
  },

  // Transaction settings
  transaction: {
    maxWait: 5000, // 5 seconds
    timeout: 10000, // 10 seconds
    isolationLevel: 'ReadCommitted' as const,
  },

  // Logging configuration
  logging: {
    enabled: process.env.NODE_ENV === 'development',
    logQueries: process.env.NODE_ENV === 'development',
    logErrors: true,
    logWarnings: true,
  },
} as const;

// Database health check configuration
export const healthCheckConfig = {
  interval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  retries: 3,
} as const;

// Migration settings
export const migrationConfig = {
  autoMigrate: process.env.NODE_ENV === 'development',
  seedOnMigrate: process.env.NODE_ENV === 'development',
} as const;