import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getAllConfigs, setConfigs, initDefaultConfigs, getAdminEmails, DEFAULT_CONFIG } from '@/lib/config';

// 验证管理员权限
async function verifyAdmin(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { error: '未登录', status: 401 };
  }

  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return { error: '登录已失效', status: 401 };
  }

  const me = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, email: true }
  });
  if (!me) {
    return { error: '用户不存在', status: 401 };
  }

  const adminEmails = await getAdminEmails();
  if (!adminEmails.includes(me.email.toLowerCase())) {
    return { error: '无管理员权限', status: 403 };
  }

  return { user: me };
}

// GET - 获取所有配置
export async function GET(req: Request) {
  try {
    const auth = await verifyAdmin(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // 确保默认配置已初始化
    await initDefaultConfigs();

    const configs = await getAllConfigs();

    return NextResponse.json({
      configs,
      defaults: DEFAULT_CONFIG,
    });
  } catch (error: any) {
    console.error('[admin/config] GET error:', error);
    return NextResponse.json(
      { error: error.message || '获取配置失败' },
      { status: 500 }
    );
  }
}

// PUT - 更新配置
export async function PUT(req: Request) {
  try {
    const auth = await verifyAdmin(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { configs } = await req.json();

    if (!configs || typeof configs !== 'object') {
      return NextResponse.json({ error: '无效的配置数据' }, { status: 400 });
    }

    // 验证 IMG2IMG_PROMPTS 是有效的 JSON
    if (configs.IMG2IMG_PROMPTS) {
      try {
        const parsed = JSON.parse(configs.IMG2IMG_PROMPTS);
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          return NextResponse.json({ error: '图生图提示词必须是 JSON 对象格式' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: '图生图提示词 JSON 格式错误，请检查语法' }, { status: 400 });
      }
    }

    // 验证数字类型的配置
    const numberFields = ['FREE_IMG_DAILY_LIMIT', 'COOLDOWN_SECONDS', 'VIDEO_DAILY_LIMIT'];
    for (const field of numberFields) {
      if (configs[field] !== undefined && configs[field] !== '') {
        const num = parseInt(configs[field], 10);
        if (isNaN(num) || num < 0) {
          return NextResponse.json({ error: `${field} 必须是有效的非负整数` }, { status: 400 });
        }
      }
    }

    // 过滤掉只读的 key，只保存有效的配置
    const validKeys = new Set(Object.keys(DEFAULT_CONFIG));
    const toSave: Record<string, string> = {};
    for (const [key, value] of Object.entries(configs)) {
      if (validKeys.has(key)) {
        toSave[key] = String(value ?? '');
      }
    }

    await setConfigs(toSave);

    return NextResponse.json({
      success: true,
      message: '配置已保存，将在30秒内自动生效',
      savedKeys: Object.keys(toSave),
    });
  } catch (error: any) {
    console.error('[admin/config] PUT error:', error);
    return NextResponse.json(
      { error: error.message || '保存配置失败' },
      { status: 500 }
    );
  }
}
