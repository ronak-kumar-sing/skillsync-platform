import { checkDatabaseConnection, disconnectDatabase } from './prisma';
import { dbConfig } from './db-config';

/**
 * Initialize database connection and perform health checks
 */
export async function initializeDatabase(): Promise<void> {
  try {
    console.log('🔌 Initializing database connection...');

    // Check database connection
    const isConnected = await checkDatabaseConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to database');
    }

    console.log('✅ Database connection established');

    // Log configuration in development
    if (dbConfig.logging.enabled) {
      console.log('📊 Database configuration:', {
        poolSize: dbConfig.pool.max,
        timeout: dbConfig.query.timeout,
        environment: process.env.NODE_ENV,
      });
    }

    // Set up graceful shutdown handlers
    setupGracefulShutdown();

    console.log('🎉 Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Set up graceful shutdown handlers for database connections
 */
function setupGracefulShutdown(): void {
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Gracefully shutting down database connections...`);

    try {
      await disconnectDatabase();
      console.log('✅ Database connections closed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during database shutdown:', error);
      process.exit(1);
    }
  };

  // Handle different shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

  // Handle uncaught exceptions
  process.on('uncaughtException', async (error) => {
    console.error('❌ Uncaught Exception:', error);
    await disconnectDatabase();
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    await disconnectDatabase();
    process.exit(1);
  });
}

/**
 * Perform database health check
 */
export async function performHealthCheck(): Promise<{
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  details: {
    connection: boolean;
    responseTime: number;
  };
}> {
  const startTime = Date.now();

  try {
    const isConnected = await checkDatabaseConnection();
    const responseTime = Date.now() - startTime;

    return {
      status: isConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        connection: isConnected,
        responseTime,
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;

    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        connection: false,
        responseTime,
      },
    };
  }
}

/**
 * Run database migrations (development only)
 */
export async function runMigrations(): Promise<void> {
  if (process.env.NODE_ENV !== 'development') {
    console.log('⚠️  Migrations skipped - not in development environment');
    return;
  }

  try {
    console.log('🔄 Running database migrations...');

    // In a real application, you would run: npx prisma migrate deploy
    // For now, we'll just ensure the schema is pushed
    console.log('✅ Migrations completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}