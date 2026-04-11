import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

const ADMIN_EMAILS = ['1585062016@qq.com'];

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: '登录已失效' }, { status: 401 });
    }

    const me = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true }
    });
    if (!me) {
      return NextResponse.json({ error: '用户不存在' }, { status: 401 });
    }
    if (!ADMIN_EMAILS.includes(me.email)) {
      return NextResponse.json({ error: '无管理员权限' }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      orderBy: [{ imageCount: 'desc' }, { promptCount: 'desc' }],
      select: {
        id: true,
        email: true,
        promptCount: true,
        imageCount: true,
        dailyImageCount: true,
        lastImageGeneratedAt: true,
        createdAt: true
      }
    });

    const recentLogs = await prisma.generationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        type: true,
        userId: true,
        userEmail: true,
        model: true,
        requestPrompt: true,
        imageUrl: true,
        success: true,
        errorMessage: true,
        createdAt: true,
        user: { select: { email: true } }
      }
    });

    const recentImageLogs = await prisma.generationLog.findMany({
      where: {
        type: 'IMAGE',
        success: true,
        imageUrl: { not: null }
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        userEmail: true,
        model: true,
        requestPrompt: true,
        imageUrl: true,
        createdAt: true,
        user: { select: { email: true } }
      }
    });

    const totalUsers = users.length;
    const totalPromptCount = users.reduce((sum, u) => sum + u.promptCount, 0);
    const totalImageCount = users.reduce((sum, u) => sum + u.imageCount, 0);
    const totalPromptLogs = recentLogs.filter((x) => x.type === 'PROMPT').length;
    const totalImageLogs = recentLogs.filter((x) => x.type === 'IMAGE').length;

    const logs = recentLogs.map((x) => ({
      id: x.id,
      type: x.type,
      userEmail: x.user?.email || x.userEmail || '游客',
      model: x.model,
      requestPrompt: x.requestPrompt,
      imageUrl: x.imageUrl,
      success: x.success,
      errorMessage: x.errorMessage,
      createdAt: x.createdAt
    }));

    return NextResponse.json({
      me,
      stats: {
        totalUsers,
        totalPromptCount,
        totalImageCount,
        totalPromptLogs,
        totalImageLogs
      },
      users,
      logs,
      imageGallery: recentImageLogs.map((x) => ({
        id: x.id,
        userEmail: x.user?.email || x.userEmail || '游客',
        model: x.model,
        requestPrompt: x.requestPrompt,
        imageUrl: x.imageUrl,
        createdAt: x.createdAt
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
