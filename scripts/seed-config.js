// scripts/seed-config.js
// 初始化默认配置到数据库
// 用法: node scripts/seed-config.js

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: { db: { url: 'file:./prisma/dev.db' } },
});

const DEFAULT_CONFIG = {
  GROK_PROMPT_API_KEY: "sk-aT8zbZSLI8mNNm91bVmAUqPLpVmpqIuo",
  GROK_PROMPT_API_ENDPOINT: "http://124.156.219.145:8000/v1",
  GROK_PROMPT_MODEL: "grok-4.20-0309-non-reasoning",
  VISION_API_KEY: "sk-w7Eit87AWrFGwLYLrIcSOgdDW204j0euC2Zlg5DACz4xx7nT",
  VISION_API_ENDPOINT: "https://happyapi.org/v1/chat/completions",
  VISION_MODEL: "grok-4.20-0309-non-reasoning",
  GROK_IMAGE_API_KEY: "sk-aT8zbZSLI8mNNm91bVmAUqPLpVmpqIuo",
  GROK_IMAGE_API_ENDPOINT: "http://124.156.219.145:8000/v1",
  GROK_IMAGE_MODEL: "grok-imagine-image-lite",
  GROK_IMG2IMG_MODEL: "grok-imagine-image-lite",
  GPT_IMAGE2_API_KEY: "sk-eccd9e1e2ab7bdd6e808e4f8f41c1adfb66e7983c057eaf5fe7f879b5bb3bdb2",
  GPT_IMAGE2_API_ENDPOINT: "https://shumai.siphot.com/v1/images/generations",
  GPT_IMAGE2_MODEL: "gpt-image-2",
  VIDEO_API_KEY: "xai-I1k5xdu1X9fAxANwIXP2sBSdrJZkravAOfbDffwv0P6YgGFj3u597hVEb6B3kvOeClJFNCkx7vQeJsnh",
  VIDEO_API_ENDPOINT: "https://api.x.ai/v1/videos/generations",
  VIDEO_MODEL: "grok-imagine-video",
  FREE_IMG_DAILY_LIMIT: "100",
  COOLDOWN_SECONDS: "10",
  VIDEO_DAILY_LIMIT: "10",
  ADMIN_EMAILS: "1585062016@qq.com",
  VIDEO_LIMIT_EXEMPT_EMAIL: "1585062016@qq.com",
};

async function main() {
  console.log('Checking existing configs...');
  const count = await prisma.config.count();
  if (count > 0) {
    console.log(`Database already has ${count} configs. Skipping seed.`);
    return;
  }

  console.log('Seeding default configs...');
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await prisma.config.create({ data: { key, value } });
    console.log(`  ✓ ${key}`);
  }
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
