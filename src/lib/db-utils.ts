import prisma from './prisma';
import { Prisma } from '../generated/prisma';

// Database utility functions for common operations

/**
 * Execute a database operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain types of errors
      if (error instanceof Prisma.PrismaClientValidationError ||
          error instanceof Prisma.PrismaClientKnownRequestError) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }

  throw lastError!;
}

/**
 * Paginate query results
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function paginate<T>(
  model: any,
  options: PaginationOptions = {},
  where?: any,
  include?: any
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 10));
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      skip,
      take: limit,
      orderBy: options.orderBy || { createdAt: 'desc' },
    }),
    model.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Soft delete utility (for models that support it)
 */
export async function softDelete(model: any, id: string): Promise<void> {
  await model.update({
    where: { id },
    data: {
      isActive: false,
      updatedAt: new Date(),
    },
  });
}

/**
 * Bulk operations utility
 */
export async function bulkCreate<T>(
  model: any,
  data: T[],
  batchSize: number = 100
): Promise<void> {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await model.createMany({
      data: batch,
      skipDuplicates: true,
    });
  }
}

/**
 * Search utility with full-text search capabilities
 */
export async function searchUsers(
  query: string,
  options: PaginationOptions = {}
): Promise<PaginatedResult<any>> {
  const searchTerms = query.split(' ').filter(term => term.length > 0);

  const where = {
    OR: searchTerms.flatMap(term => [
      { username: { contains: term, mode: 'insensitive' as const } },
      { email: { contains: term, mode: 'insensitive' as const } },
    ]),
    isActive: true,
  };

  return paginate(prisma.user, options, where, {
    userSkills: {
      include: {
        skill: true,
      },
    },
  });
}

/**
 * Database statistics utility
 */
export async function getDatabaseStats(): Promise<{
  users: number;
  skills: number;
  sessions: number;
  achievements: number;
}> {
  const [users, skills, sessions, achievements] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.skill.count(),
    prisma.session.count(),
    prisma.achievement.count(),
  ]);

  return { users, skills, sessions, achievements };
}

/**
 * Clean up expired records
 */
export async function cleanupExpiredRecords(): Promise<void> {
  const now = new Date();

  // Clean up expired matching queue entries
  await prisma.matchingQueue.deleteMany({
    where: {
      expiresAt: {
        lt: now,
      },
      status: 'waiting',
    },
  });

  // Update user last active status
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  await prisma.user.updateMany({
    where: {
      lastActive: {
        lt: thirtyDaysAgo,
      },
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });
}