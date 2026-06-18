// scripts/migrate.js
// 运行时安全建表，不依赖 prisma CLI
// 用法: node scripts/migrate.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // 检查 Config 表是否存在
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Config" (
        "key" TEXT NOT NULL PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('[migrate] Config 表已确认存在');

    // 检查是否需要 seed config
    const count = await prisma.config.count();
    if (count === 0) {
      console.log('[migrate] Config 表为空，开始 seed...');
      const { execSync } = require('child_process');
      execSync('node scripts/seed-config.js', { stdio: 'inherit', cwd: __dirname + '/..' });
    } else {
      console.log(`[migrate] Config 表已有 ${count} 条记录，跳过 seed`);
    }
  } catch (e) {
    console.error('[migrate] 建表失败:', e.message);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

main();
