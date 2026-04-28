import { prisma } from '@/lib/db';
import { getChinaDayRange } from '@/lib/utils';

export const VIDEO_DAILY_LIMIT = 10;
export const VIDEO_LIMIT_EXEMPT_EMAIL = '1585062016@qq.com';

export const isVideoLimitExempt = (email?: string | null) =>
  String(email || '').trim().toLowerCase() === VIDEO_LIMIT_EXEMPT_EMAIL;

export const getVideoQuotaForUser = async (userId?: string | null, email?: string | null) => {
  const exempt = isVideoLimitExempt(email);
  if (!userId) {
    return {
      isVideoLimitExempt: exempt,
      videoDailyLimit: VIDEO_DAILY_LIMIT,
      videoUsedToday: 0,
      videoRemainingToday: exempt ? null : VIDEO_DAILY_LIMIT
    };
  }

  if (exempt) {
    return {
      isVideoLimitExempt: true,
      videoDailyLimit: VIDEO_DAILY_LIMIT,
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
    videoDailyLimit: VIDEO_DAILY_LIMIT,
    videoUsedToday,
    videoRemainingToday: Math.max(0, VIDEO_DAILY_LIMIT - videoUsedToday)
  };
};
