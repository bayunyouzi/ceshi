import { prisma } from '@/lib/db';
import { getChinaDayRange } from '@/lib/utils';
import { getConfig, getConfigInt } from '@/lib/config';

export const getVideoDailyLimit = async () => getConfigInt('VIDEO_DAILY_LIMIT', 10);
export const getVideoLimitExemptEmail = async () => getConfig('VIDEO_LIMIT_EXEMPT_EMAIL', '1585062016@qq.com');

// 兼容旧代码的静态导出（使用默认值）
export const VIDEO_DAILY_LIMIT = 10;
export const VIDEO_LIMIT_EXEMPT_EMAIL = '1585062016@qq.com';

export const isVideoLimitExempt = async (email?: string | null) => {
  const exemptEmail = await getVideoLimitExemptEmail();
  return String(email || '').trim().toLowerCase() === exemptEmail.toLowerCase();
};

export const getVideoQuotaForUser = async (userId?: string | null, email?: string | null) => {
  const exempt = await isVideoLimitExempt(email);
  const dailyLimit = await getVideoDailyLimit();

  if (!userId) {
    return {
      isVideoLimitExempt: exempt,
      videoDailyLimit: dailyLimit,
      videoUsedToday: 0,
      videoRemainingToday: exempt ? null : dailyLimit
    };
  }

  if (exempt) {
    return {
      isVideoLimitExempt: true,
      videoDailyLimit: dailyLimit,
      videoUsedToday: 0,
      videoRemainingToday: null
    };
  }

  const { start, end } = getChinaDayRange();
  const videoUsedToday = await prisma.generationLog.count({
    where: {
      type: 'VIDEO',
      userId,
      success: true,
      createdAt: { gte: start, lt: end }
    }
  });

  return {
    isVideoLimitExempt: false,
    videoDailyLimit: dailyLimit,
    videoUsedToday,
    videoRemainingToday: Math.max(0, dailyLimit - videoUsedToday)
  };
};
