import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

const WINDOW_MINUTES = 20;
const WINDOW_MS = WINDOW_MINUTES * 60 * 1000;

type ModelKey = 'grok' | 'gpt';
type ModelStatus = 'normal' | 'busy' | 'unavailable';

type ModelUsageSummary = {
  key: ModelKey;
  name: string;
  status: ModelStatus;
  total: number;
  success: number;
  failed: number;
  failureRate: number;
  lastUsedAt: string | null;
  updatedAt: string;
};

const emptySummary = (key: ModelKey, name: string, updatedAt: Date): ModelUsageSummary => ({
  key,
  name,
  status: 'normal',
  total: 0,
  success: 0,
  failed: 0,
  failureRate: 0,
  lastUsedAt: null,
  updatedAt: updatedAt.toISOString()
});

const getModelKey = (model?: string | null, endpoint?: string | null): ModelKey | null => {
  const raw = `${model || ''} ${endpoint || ''}`.toLowerCase();
  if (/grok|x\.ai|bayunzi/.test(raw)) return 'grok';
  if (/gpt|openai|yzgpt/.test(raw)) return 'gpt';
  return null;
};

const getStatus = (total: number, failed: number): ModelStatus => {
  if (total === 0) return 'normal';

  const failureRate = failed / total;
  if ((total >= 3 && failureRate >= 0.6) || failed >= 5) return 'unavailable';
  if (failed > 0 || total >= 12) return 'busy';
  return 'normal';
};

export async function GET() {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - WINDOW_MS);
    const logs = await prisma.generationLog.findMany({
      where: {
        createdAt: { gte: since },
        OR: [
          { model: { not: null } },
          { endpoint: { not: null } }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        model: true,
        endpoint: true,
        success: true,
        createdAt: true
      }
    });

    const summaries: Record<ModelKey, ModelUsageSummary> = {
      grok: emptySummary('grok', 'Grok', now),
      gpt: emptySummary('gpt', 'GPT', now)
    };

    for (const log of logs) {
      const key = getModelKey(log.model, log.endpoint);
      if (!key) continue;

      const summary = summaries[key];
      summary.total += 1;
      if (log.success) {
        summary.success += 1;
      } else {
        summary.failed += 1;
      }
      if (!summary.lastUsedAt || log.createdAt > new Date(summary.lastUsedAt)) {
        summary.lastUsedAt = log.createdAt.toISOString();
      }
    }

    for (const key of Object.keys(summaries) as ModelKey[]) {
      const summary = summaries[key];
      summary.failureRate = summary.total > 0 ? Number((summary.failed / summary.total).toFixed(2)) : 0;
      summary.status = getStatus(summary.total, summary.failed);
    }

    return NextResponse.json({
      windowMinutes: WINDOW_MINUTES,
      updatedAt: now.toISOString(),
      models: [summaries.grok, summaries.gpt]
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取模型使用状态失败' },
      { status: 500 }
    );
  }
}
