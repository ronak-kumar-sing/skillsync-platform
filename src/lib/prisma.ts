import { PrismaClient } from '../generated/prisma';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Database connection configuration with pooling and optimization
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL!,
      },
    },
  });
};

// Singleton pattern for Prisma client to prevent connection issues
const prisma = globalThis.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

// Connection pool configuration
export const dbConfig = {
  maxConnections: parseInt(process.env.DATABASE_POOL_SIZE || '10'),
  connectionTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT || '20000'),
};

// Graceful shutdown handler
export const disconnectDatabase = async () => {
  await prisma.$disconnect();
};

// Health check function
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    // For MongoDB, we can use a simple findFirst query or $runCommandRaw
    await prisma.$runCommandRaw({ ping: 1 });
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Database transaction helper
export const withTransaction = async <T>(
  callback: (prisma: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>) => Promise<T>
): Promise<T> => {
  return await prisma.$transaction(callback, {
    maxWait: 5000, // 5 seconds
    timeout: 10000, // 10 seconds
  });
};

export default prisma;