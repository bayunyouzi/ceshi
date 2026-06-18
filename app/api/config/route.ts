import { NextResponse } from 'next/server';
import { getImg2ImgPrompts } from '@/lib/config';

// 公开端点 - 返回前端需要的配置（不含敏感信息）
export async function GET() {
  try {
    const img2imgPrompts = await getImg2ImgPrompts();

    return NextResponse.json({
      img2imgPrompts,
    });
  } catch (error: any) {
    console.error('[config] GET public config error:', error);
    return NextResponse.json(
      { error: error.message || '获取配置失败' },
      { status: 500 }
    );
  }
}
