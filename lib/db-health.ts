import { prisma } from './db';

/**
 * 数据库健康检查
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * 数据库重连
 */
export async function reconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    await prisma.$connect();
    console.log('Database reconnected successfully');
  } catch (error) {
    console.error('Database reconnection failed:', error);
    throw error;
  }
}

/**
 * 带重试的数据库操作
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // 如果是 Prisma 超时错误，尝试重连
      if (error.code === 'P1008' || error.code === 'P2024') {
        console.warn(`Database timeout (attempt ${i + 1}/${maxRetries}), reconnecting...`);
        try {
          await reconnectDatabase();
        } catch (reconnectError) {
          console.error('Reconnection failed:', reconnectError);
        }
      }

      // 如果不是最后一次尝试，等待后重试
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
