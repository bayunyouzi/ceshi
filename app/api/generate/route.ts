import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { parseApiError, logErrorAsync, buildErrorResponse, ErrorCode, validateModel } from '@/lib/errorHandler';
import { normalizeEndpoint } from '@/lib/utils';

// 这些配置现在只在服务器端运行，用户无法在浏览器中看到
const DEFAULT_API_KEY = "sk-aT8zbZSLI8mNNm91bVmAUqPLpVmpqIuo";
const DEFAULT_API_ENDPOINT = "http://bayunzi.shop/v1/chat/completions";
const DEFAULT_MODEL = "grok-4.20-0309-non-reasoning"; // 默认非深思模型（快速响应）
// 伪装成真实的浏览器请求头，绕过基础 WAF/Cloudflare
const REQUEST_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export async function POST(req: Request) {
  try {
    const { messages, model, temperature, apiKey: userApiKey, apiEndpoint: userApiEndpoint } = await req.json();
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const decoded = token ? verifyToken(token) : null;
    const user = decoded?.userId
      ? await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, email: true } })
      : null;

    // 逻辑：
    // 1. 如果用户传了 Key，就用用户的 (userApiKey)
    // 2. 如果用户没传，就用服务器环境变量 (process.env.AI_API_KEY)
    // 3. 如果环境变量也没设，就用默认硬编码 (DEFAULT_API_KEY)
    const apiKey = userApiKey || process.env.AI_API_KEY || DEFAULT_API_KEY;
    const apiEndpoint = normalizeEndpoint(userApiEndpoint || process.env.AI_API_ENDPOINT || DEFAULT_API_ENDPOINT);
    if (!apiKey) {
      return NextResponse.json({ error: "服务端未配置 AI_API_KEY，请在环境变量中设置或使用自定义密钥" }, { status: 500 });
    }
    
    const useCustomConfig = Boolean(userApiKey || userApiEndpoint);
    let modelName = model || process.env.AI_MODEL_NAME || DEFAULT_MODEL;
    if (useCustomConfig && !model) {
      return NextResponse.json({ error: "使用自定义提示词接口时，请填写模型名称" }, { status: 400 });
    }
    const modelValidation = validateModel(modelName, 'prompt', useCustomConfig);
    if (!modelValidation.valid && modelValidation.fallback) {
      modelName = modelValidation.fallback;
    }

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "User-Agent": REQUEST_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        temperature: temperature || 0.8,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      const error = parseApiError(response.status, errorText);
      logErrorAsync(error, {
        userId: user?.id,
        userEmail: user?.email,
        model: modelName,
        endpoint: apiEndpoint,
        requestPrompt: Array.isArray(messages)
          ? String(messages.findLast?.((m: any) => m?.role === 'user')?.content ?? '')
          : undefined
      });
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    const responseTextRaw = await response.text();
    let data;
    try {
      data = JSON.parse(responseTextRaw);
    } catch (e) {
      console.error("[generate API] JSON parse error:", e);
      console.error("[generate API] Raw response:", responseTextRaw);
      return NextResponse.json({ error: `API 返回格式异常: ${responseTextRaw.substring(0, 100)}...` }, { status: 502 });
    }

    const requestPrompt = Array.isArray(messages)
      ? String(messages.findLast?.((m: any) => m?.role === 'user')?.content ?? '')
      : null;
    const responseText = String(data?.choices?.[0]?.message?.content ?? '').slice(0, 2000);
    // 使用非阻塞方式记录日志,避免超时
    prisma.generationLog.create({
      data: {
        type: 'PROMPT',
        userId: user?.id ?? null,
        userEmail: user?.email ?? null,
        model: modelName,
        endpoint: apiEndpoint,
        requestPrompt,
        responseText,
        success: true
      }
    }).catch(err => console.error('[generate] Failed to log generation:', err));
    if (user?.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { promptCount: { increment: 1 } }
      });
    }
    return NextResponse.json(data);

  } catch (error: any) {
    const err = buildErrorResponse(
      ErrorCode.SYSTEM_INTERNAL_ERROR,
      error instanceof Error ? error.message : String(error)
    );
    logErrorAsync(err, {});
    return NextResponse.json({ error: err.message }, { status: err.statusCode });
  }
}
