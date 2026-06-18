import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
      },
    },
    // 增加超时配置,解决 SQLite 操作超时问题
    __internal: {
      engine: {
        requestTimeout: 30000, // 30秒超时
      },
    },
  });

// 优雅关闭连接
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
