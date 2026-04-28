import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { isQuotaExhaustedError } from './quota';
import { getVideoQuotaForUser } from '@/lib/videoQuota';
import { parseApiError, logErrorAsync, buildErrorResponse, ErrorCode } from '@/lib/errorHandler';
import { getChinaDayRange } from '@/lib/utils';

// 图片验证结果接口
interface ValidationResult {
  valid: boolean;
  error?: { errorCode: string; errorMessage: string; errorDetail: string; shouldRetry: boolean; retryAfter?: number };
}

const DEFAULT_FREE_IMG_API_KEY = "JST8RZERNPOITTRG7GFCXDTQN3943PG6BZCJRTFV";
const DEFAULT_BACKUP_IMG_API_KEY = "N90KLF8NOC73LUD5SWOWA5UAC9W7UPAXBLU9AGRW";
const DEFAULT_GROK2API_KEY = process.env.GROK2API_KEY || "f5f8dc3f65454077b2fd6560";
const DEFAULT_GROK2API_ENDPOINT = process.env.GROK2API_ENDPOINT || "http://124.156.219.145:8000/v1/chat/completions";
const DEFAULT_GROK2API_MODEL_NAME = process.env.GROK2API_MODEL || "grok-imagine-image-lite";
const DEFAULT_TXT2IMG_API_KEY = DEFAULT_GROK2API_KEY;
const DEFAULT_TXT2IMG_API_ENDPOINT = DEFAULT_GROK2API_ENDPOINT;
const DEFAULT_TXT2IMG_MODEL_NAME = DEFAULT_GROK2API_MODEL_NAME;

const DEFAULT_IMG2IMG_API_KEY = DEFAULT_GROK2API_KEY;
const DEFAULT_IMG2IMG_API_ENDPOINT = DEFAULT_GROK2API_ENDPOINT;
const DEFAULT_IMG2IMG_MODEL_NAME = "grok-imagine-image-edit";

const DEFAULT_TXT2VIDEO_API_KEY = process.env.XAI_VIDEO_API_KEY || "xai-I1k5xdu1X9fAxANwIXP2sBSdrJZkravAOfbDffwv0P6YgGFj3u597hVEb6B3kvOeClJFNCkx7vQeJsnh";
const DEFAULT_TXT2VIDEO_API_ENDPOINT = process.env.XAI_VIDEO_API_ENDPOINT || "https://api.x.ai/v1/videos/generations";
const DEFAULT_TXT2VIDEO_MODEL_NAME = process.env.XAI_VIDEO_MODEL || "grok-imagine-video";
const REQUEST_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
const VIDEO_POLL_INTERVAL_MS = 5000;
const VIDEO_MAX_WAIT_MS = 8 * 60 * 1000;

const FREE_IMG_DAILY_LIMIT = 100;
const COOLDOWN_SECONDS = 10;
const IDEMPOTENCY_TTL_MS = 12000;
type CachedJsonPayload = { body: any; status: number; expiresAt: number };
const idempotencyCache = new Map<string, CachedJsonPayload>();
const idempotencyInFlight = new Map<string, Promise<CachedJsonPayload>>();
const normalizeIdempotencyKey = (raw: string | null) => {
  if (!raw) return "";
  const normalized = raw.trim();
  if (!normalized) return "";
  return normalized.slice(0, 120);
};

const cleanupExpiredIdempotency = () => {
  const now = Date.now();
  for (const [key, payload] of Array.from(idempotencyCache.entries())) {
    if (payload.expiresAt <= now) {
      idempotencyCache.delete(key);
    }
  }
};

const normalizeEndpoint = (raw: string | undefined, fallback: string, routeKind: "image" | "video") => {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (url.pathname === "/" || url.pathname === "" || pathname === "/v1") {
      url.pathname = routeKind === "video" ? "/v1/videos/generations" : "/v1/images/generations";
    }
    return url.toString();
  } catch {
    return fallback;
  }
};

const isImagesGenerationEndpoint = (endpoint: string) => {
  try {
    const url = new URL(endpoint);
    return /\/images\/generations\/?$/i.test(url.pathname);
  } catch {
    return /\/images\/generations\/?$/i.test(endpoint);
  }
};

const isGptImage2Model = (model: string | undefined) => {
  if (!model) return false;
  return /gpt-image-2/i.test(model);
};

const isGrokImagineModel = (model: string | undefined) => {
  if (!model) return false;
  return /^grok-imagine-(?:image(?:-lite|-edit|-pro)?|video)$/i.test(model);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildVideoStatusEndpoint = (startEndpoint: string, requestId: string) => {
  const encodedRequestId = encodeURIComponent(requestId);
  try {
    const url = new URL(startEndpoint);
    url.pathname = url.pathname.replace(/\/generations\/?$/i, `/${encodedRequestId}`);
    return url.toString();
  } catch {
    return startEndpoint.replace(/\/generations\/?$/i, `/${encodedRequestId}`);
  }
};

// 图片URL验证函数
const validateImageUrl = (url: string): ValidationResult => {
  // 检查URL格式
  if (!url || typeof url !== 'string') {
    return {
      valid: false,
      error: {
        errorCode: ErrorCode.VALIDATION_INVALID_IMAGE_URL,
        errorMessage: '请上传有效的图片文件',
        errorDetail: 'URL is empty or invalid',
        shouldRetry: false
      }
    };
  }

  // 检查是否为http/https链接或data URL
  if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
    return {
      valid: false,
      error: {
        errorCode: ErrorCode.VALIDATION_INVALID_IMAGE_URL,
        errorMessage: '请上传有效的图片文件',
        errorDetail: 'URL must start with http://, https:// or data:',
        shouldRetry: false
      }
    };
  }

  // 如果是data URL，检查是否为图片格式
  if (url.startsWith('data:')) {
    if (!url.startsWith('data:image/')) {
      return {
        valid: false,
        error: {
          errorCode: ErrorCode.VALIDATION_INVALID_IMAGE_URL,
          errorMessage: '请上传有效的图片文件',
          errorDetail: 'Data URL is not an image',
          shouldRetry: false
        }
      };
    }
    return { valid: true };
  }

  // 对于http/https URL，不强制要求扩展名（很多CDN链接没有扩展名）
  // 只做基本的URL格式验证
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: {
        errorCode: ErrorCode.VALIDATION_INVALID_IMAGE_URL,
        errorMessage: '请上传有效的图片文件',
        errorDetail: 'Invalid URL format',
        shouldRetry: false
      }
    };
  }
};

// 图片大小验证函数
const validateImageSize = async (url: string, maxSizeMB: number = 10): Promise<ValidationResult> => {
  // 跳过data URL的大小验证（Base64编码的图片）
  if (url.startsWith('data:')) {
    return { valid: true };
  }

  try {
    // 发送HEAD请求获取Content-Length
    const response = await fetch(url, { method: 'HEAD' });

    // HEAD请求失败不影响后续处理，返回valid: true让后续流程处理
    if (!response.ok) {
      return { valid: true };
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const sizeInMB = sizeInBytes / (1024 * 1024);

      if (sizeInMB > maxSizeMB) {
        return {
          valid: false,
          error: {
            errorCode: ErrorCode.VALIDATION_IMAGE_TOO_LARGE,
            errorMessage: `图片大小超过限制（最大${maxSizeMB}MB）`,
            errorDetail: `Image size ${sizeInMB.toFixed(2)}MB exceeds limit ${maxSizeMB}MB`,
            shouldRetry: false
          }
        };
      }
    }

    return { valid: true };
  } catch (error) {
    // 验证失败不影响后续处理，返回valid: true让后续流程处理
    return { valid: true };
  }
};

const isRenderableImageRef = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const text = value.trim();
  if (!text) return false;
  if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(text)) return true;
  if (/^https?:\/\//i.test(text)) return true;
  if (text.length > 1000 && !text.includes(' ') && /^[a-zA-Z0-9+/]+={0,2}$/.test(text.substring(0, 100))) return true;
  return false;
};

const IMAGE_MODEL_DISPLAY_NAME = "grok-imagine-image";

const getImageModelDisplayName = (model: string | null | undefined) => {
  const normalized = String(model || "").trim().toLowerCase();
  if (!normalized) return "";
  if (
    normalized === "grok-imagine-image" ||
    normalized === "grok-imagine-image-lite" ||
    normalized === "grok-imagine-image-edit" ||
    normalized === "grok-imagine-image-pro"
  ) {
    return IMAGE_MODEL_DISPLAY_NAME;
  }
  return String(model);
};

const buildImageClientPayload = (
  upstreamData: any,
  imageUrl: string,
  requestedModel: string,
  actualModel: string
) => ({
  ...upstreamData,
  imageUrl,
  requestedModel,
  actualModel,
  displayModel: getImageModelDisplayName(actualModel || requestedModel),
  modelChanged: Boolean(actualModel && requestedModel && actualModel !== requestedModel)
});

const extractImageUrlFromAny = (value: any): string | null => {
  if (!value) return null;
  if (typeof value === "string") {
    const text = value.replace(/\\\//g, "/");
    const dataUriMatch = text.match(/(data:image\/[a-zA-Z0-9.+-]+;base64,[a-zA-Z0-9+/=]+)/i);
    if (dataUriMatch) return dataUriMatch[1];
    const mdMatch = text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)(?:\s+".*?")?\)/i);
    if (mdMatch) return mdMatch[1];
    const urlMatch = text.match(/(https?:\/\/[^\s\)"'<]+)/i);
    if (urlMatch) return urlMatch[1].replace(/[.,]$/, "");
    
    // Fallback: Check if the string itself is a raw base64 string (often returned by some backends)
    if (text.length > 1000 && !text.includes(' ') && /^[a-zA-Z0-9+/]+={0,2}$/.test(text.substring(0, 100))) {
      return `data:image/jpeg;base64,${text}`;
    }

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return extractImageUrlFromAny(parsed);
      }
    } catch {}
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractImageUrlFromAny(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    if (typeof value.b64_json === "string" && value.b64_json) return `data:image/png;base64,${value.b64_json}`;
    if (typeof value.image_url === "string" && isRenderableImageRef(value.image_url)) return value.image_url;
    if (typeof value.image_url?.url === "string" && isRenderableImageRef(value.image_url.url)) return value.image_url.url;
    if (typeof value.url === "string" && isRenderableImageRef(value.url)) return value.url;
    if (typeof value.imageUrl === "string" && isRenderableImageRef(value.imageUrl)) return value.imageUrl;
    for (const v of Object.values(value)) {
      const found = extractImageUrlFromAny(v);
      if (found) return found;
    }
  }
  return null;
};

const ASPECT_RATIO_SIZES: Record<string, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1280, height: 720 }, // 映射到 grok2api 支持的最接近尺寸
  "3:4": { width: 720, height: 1280 }, // 映射到 grok2api 支持的最接近尺寸
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "3:2": { width: 1792, height: 1024 }, // 映射到 grok2api 支持的最接近尺寸
  "2:3": { width: 1024, height: 1792 }  // 映射到 grok2api 支持的最接近尺寸
};

export async function POST(req: Request) {
  cleanupExpiredIdempotency();
  const idempotencyKey = normalizeIdempotencyKey(req.headers.get("Idempotency-Key") || req.headers.get("X-Idempotency-Key"));
  if (idempotencyKey) {
    const cached = idempotencyCache.get(idempotencyKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.body, { status: cached.status });
    }
    const inFlight = idempotencyInFlight.get(idempotencyKey);
    if (inFlight) {
      const merged = await inFlight;
      return NextResponse.json(merged.body, { status: merged.status });
    }
  }

  let settlePayload: ((payload: CachedJsonPayload) => void) | null = null;
  let settled = false;
  if (idempotencyKey) {
    const pending = new Promise<CachedJsonPayload>((resolve) => {
      settlePayload = resolve;
    });
    idempotencyInFlight.set(idempotencyKey, pending);
  }

  const respond = (body: any, status: number = 200) => {
    const payload: CachedJsonPayload = {
      body,
      status,
      expiresAt: Date.now() + IDEMPOTENCY_TTL_MS
    };
    if (idempotencyKey) {
      if (!settled && settlePayload) {
        settled = true;
        settlePayload(payload);
      }
      idempotencyInFlight.delete(idempotencyKey);
      if (status < 500) {
        idempotencyCache.set(idempotencyKey, payload);
      }
    }
    return NextResponse.json(body, { status });
  };

  try {
    const { prompt, image_url, apiKey, apiEndpoint, modelName, mediaType, duration, aspectRatio } = await req.json();
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const decoded = token ? verifyToken(token) : null;
    const user = decoded?.userId
      ? await prisma.user.findUnique({ where: { id: decoded.userId }, select: { id: true, email: true } })
      : null;

    if (!prompt) {
      return respond({ error: "Prompt is required" }, 400);
    }

    const isVideo = mediaType === "video";
    const videoDuration = Number.isFinite(Number(duration)) ? Math.max(1, Math.min(15, Number(duration))) : 10;
    const isImg2Img = Boolean(image_url) && !isVideo;
    const defaultApiKey = isVideo ? DEFAULT_TXT2VIDEO_API_KEY : (isImg2Img ? DEFAULT_IMG2IMG_API_KEY : DEFAULT_TXT2IMG_API_KEY);
    const defaultEndpoint = isVideo ? DEFAULT_TXT2VIDEO_API_ENDPOINT : (isImg2Img ? DEFAULT_IMG2IMG_API_ENDPOINT : DEFAULT_TXT2IMG_API_ENDPOINT);
    const defaultModel = isVideo ? DEFAULT_TXT2VIDEO_MODEL_NAME : (isImg2Img ? DEFAULT_IMG2IMG_MODEL_NAME : DEFAULT_TXT2IMG_MODEL_NAME);

    let finalApiKey = isVideo ? defaultApiKey : (apiKey || defaultApiKey);
    // GPT-Image-2 使用标准的 /v1/images/generations 端点格式
    const isGpt2Model = modelName && isGptImage2Model(modelName);
    const finalEndpoint = isVideo
      ? defaultEndpoint
      : normalizeEndpoint(apiEndpoint, defaultEndpoint, "image");
    const finalModel = isVideo ? DEFAULT_TXT2VIDEO_MODEL_NAME : (modelName || defaultModel);
    // 如果是图生图且用户没有指定模型，强制使用图生图专用模型
    // 但 GPT-Image-2 模式下不做强制替换（该模型支持文生图和图生图）
    const actualModel = isImg2Img && !modelName && !isGpt2Model ? DEFAULT_IMG2IMG_MODEL_NAME : finalModel;
    // GPT-Image-2 也使用 images/generations API 格式
    const useImagesGenerationApi = !isVideo && isImagesGenerationEndpoint(finalEndpoint);

    const canAutoSwitchImageKey = !apiKey && !isVideo && useImagesGenerationApi;
    if (canAutoSwitchImageKey) {
      const { start, end } = getChinaDayRange();
      const todayAutoImageCount = await prisma.generationLog.count({
        where: {
          type: "IMAGE",
          success: true,
          createdAt: { gte: start, lt: end },
          endpoint: finalEndpoint
        }
      });
      finalApiKey = todayAutoImageCount < FREE_IMG_DAILY_LIMIT ? DEFAULT_FREE_IMG_API_KEY : DEFAULT_BACKUP_IMG_API_KEY;
    }
    const aspectKey = typeof aspectRatio === "string" ? aspectRatio.trim() : "";
    const aspectSize = !isVideo && aspectKey && ASPECT_RATIO_SIZES[aspectKey] ? ASPECT_RATIO_SIZES[aspectKey] : null;
    const finalPrompt = aspectSize
      ? `${prompt}\n\nAspect ratio: ${aspectKey}. Output must be exactly ${aspectSize.width}x${aspectSize.height} (STRICT).`
      : prompt;

    // 检查限制逻辑
    // 只有当用户没有提供自定义 Key 时，才应用限制
    if (!apiKey && !isVideo) {
      // 获取用户信息 (假设前端传了 Authorization header)
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (decoded && decoded.userId) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
          });

          if (user) {
            const now = new Date();
            
            // 1. 每日重置检查
            const lastReset = user.lastDailyReset ? new Date(user.lastDailyReset) : new Date(0);
            const isSameDay = lastReset.getDate() === now.getDate() && 
                              lastReset.getMonth() === now.getMonth() && 
                              lastReset.getFullYear() === now.getFullYear();

            let currentDailyCount = user.dailyImageCount;
            if (!isSameDay) {
              currentDailyCount = 0;
              await prisma.user.update({
                where: { id: user.id },
                data: { dailyImageCount: 0, lastDailyReset: now }
              });
            }

            // 2. 每日次数限制检查
            // if (currentDailyCount >= DAILY_LIMIT) {
            //   return NextResponse.json({ error: `今日免费生成次数已达上限 (${DAILY_LIMIT}次)。请明天再来，或填写自定义 API Key 以解除限制。` }, { status: 429 });
            // }

            // 3. 冷却时间 (CD) 检查
            if (user.lastImageGeneratedAt) {
              const lastGenTime = new Date(user.lastImageGeneratedAt).getTime();
              const timeDiff = (now.getTime() - lastGenTime) / 1000; // 秒
              if (timeDiff < COOLDOWN_SECONDS) {
                const remaining = Math.ceil(COOLDOWN_SECONDS - timeDiff);
                return respond({ error: `生成过于频繁，请等待 ${remaining} 秒后再试。` }, 429);
              }
            }
          }
        }
      }
    }

    // 构建请求，增加超时控制
    // 优化：根据不同场景设置不同超时时间
    // GPT-Image-2 模型响应较慢，增加超时到 300 秒（5分钟）
    const isGptImage2Model = modelName && /gpt-image-2/i.test(modelName);
    const getTimeout = (isVideo: boolean, isImg2Img: boolean) => {
      if (isVideo) return VIDEO_MAX_WAIT_MS;
      if (isGptImage2Model) return 300000; // GPT-Image-2：300秒（5分钟），模型响应较慢，文生图和图生图都适用
      if (isImg2Img) return 60000; // 图生图：60秒
      return 45000; // 文生图：45秒
    };
    const controller = new AbortController();
    const timeoutMs = getTimeout(isVideo, isImg2Img);
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      if (isVideo) {
        if (!user?.id) {
          return respond({ error: "文生视频功能仅限登录用户使用" }, 401);
        }

        const videoQuota = user?.id ? await getVideoQuotaForUser(user.id, user.email) : null;
        if (videoQuota && !videoQuota.isVideoLimitExempt && (videoQuota.videoRemainingToday ?? 0) <= 0) {
          return respond({ error: `今日视频生成次数已达上限（${videoQuota.videoDailyLimit}次）` }, 429);
        }

        if (image_url) {
          const urlValidation = validateImageUrl(image_url);
          if (!urlValidation.valid && urlValidation.error) {
            return respond({ error: urlValidation.error.errorMessage }, 400);
          }

          const sizeValidation = await validateImageSize(image_url, 10);
          if (!sizeValidation.valid && sizeValidation.error) {
            return respond({ error: sizeValidation.error.errorMessage }, 400);
          }
        }

        const videoPrompt = image_url
          ? `Use the provided image as the exact first frame and starting composition of the video. Preserve the same subject, identity, outfit, colors, camera angle, and scene layout at the beginning, then animate naturally from that first frame while following this request:\n\n${finalPrompt}`
          : finalPrompt;

        const videoPayload: Record<string, any> = {
          model: actualModel,
          prompt: videoPrompt,
          duration: videoDuration
        };
        if (image_url) {
          videoPayload.image_url = image_url;
        }
        if (aspectKey) {
          videoPayload.aspect_ratio = aspectKey;
        }

        const startResponse = await fetch(finalEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${finalApiKey}`,
            "User-Agent": REQUEST_USER_AGENT
          },
          body: JSON.stringify(videoPayload),
          signal: controller.signal
        });

        const startText = await startResponse.text();
        if (!startResponse.ok) {
          console.error("Video API Start Error:", startText);
          await prisma.generationLog.create({
            data: {
              type: 'VIDEO',
              userId: user?.id ?? null,
              userEmail: user?.email ?? null,
              model: actualModel,
              endpoint: finalEndpoint,
              requestPrompt: String(finalPrompt).slice(0, 2000),
              success: false,
              errorMessage: `API Error: ${startResponse.status}`,
              responseText: startText.slice(0, 2000)
            }
          });
          const error = parseApiError(startResponse.status, startText);
          logErrorAsync(error, {
            userId: user?.id,
            userEmail: user?.email,
            model: actualModel,
            endpoint: finalEndpoint,
            requestPrompt: String(finalPrompt).slice(0, 2000)
          });
          return respond({ error: error.message }, startResponse.status || 500);
        }

        let startData: any;
        try {
          startData = JSON.parse(startText);
        } catch {
          return respond({ error: "视频任务创建成功，但上游返回了不可解析的数据格式" }, 502);
        }

        const immediateVideoUrl =
          startData?.video?.url ||
          startData?.video_url ||
          startData?.videos?.[0]?.url ||
          startData?.result?.video_url ||
          startData?.result?.url ||
          null;
        if (immediateVideoUrl) {
          await prisma.generationLog.create({
            data: {
              type: 'VIDEO',
              userId: user?.id ?? null,
              userEmail: user?.email ?? null,
              model: actualModel,
              endpoint: finalEndpoint,
              requestPrompt: String(finalPrompt).slice(0, 2000),
              imageUrl: String(immediateVideoUrl).slice(0, 2000),
              responseText: startText.slice(0, 2000),
              success: true
            }
          });
          clearTimeout(timeoutId);
          const updatedVideoQuota = user?.id ? await getVideoQuotaForUser(user.id, user.email) : null;
          return respond({ ...startData, videoQuota: updatedVideoQuota }, 200);
        }

        const requestId =
          startData?.request_id ||
          startData?.data?.request_id ||
          startData?.job_id ||
          startData?.task_id ||
          startData?.id;
        if (typeof requestId !== "string" || !requestId.trim()) {
          const upstreamMessage =
            startData?.error?.message ||
            startData?.message ||
            startData?.detail ||
            startText.slice(0, 200);
          await prisma.generationLog.create({
            data: {
              type: 'VIDEO',
              userId: user?.id ?? null,
              userEmail: user?.email ?? null,
              model: actualModel,
              endpoint: finalEndpoint,
              requestPrompt: String(finalPrompt).slice(0, 2000),
              success: false,
              errorMessage: '视频任务创建失败：上游未返回 request_id',
              responseText: startText.slice(0, 2000)
            }
          });
          return respond({ error: `视频任务创建失败：上游返回格式异常，${upstreamMessage}` }, 502);
        }

        const statusEndpoint = buildVideoStatusEndpoint(finalEndpoint, requestId);
        const pollStartedAt = Date.now();

        while (Date.now() - pollStartedAt < VIDEO_MAX_WAIT_MS) {
          await sleep(VIDEO_POLL_INTERVAL_MS);

          const pollResponse = await fetch(statusEndpoint, {
            method: "GET",
            headers: {
              "Authorization": `Bearer ${finalApiKey}`,
              "User-Agent": REQUEST_USER_AGENT
            },
            signal: controller.signal
          });

          const pollText = await pollResponse.text();
          if (!pollResponse.ok) {
            console.error("Video API Poll Error:", pollText);
            await prisma.generationLog.create({
              data: {
                type: 'VIDEO',
                userId: user?.id ?? null,
                userEmail: user?.email ?? null,
                model: actualModel,
                endpoint: statusEndpoint,
                requestPrompt: String(finalPrompt).slice(0, 2000),
                success: false,
                errorMessage: `API Error: ${pollResponse.status}`,
                responseText: pollText.slice(0, 2000)
              }
            });
            const error = parseApiError(pollResponse.status, pollText);
            logErrorAsync(error, {
              userId: user?.id,
              userEmail: user?.email,
              model: actualModel,
              endpoint: statusEndpoint,
              requestPrompt: String(finalPrompt).slice(0, 2000)
            });
            return respond({ error: error.message }, pollResponse.status || 500);
          }

          let pollData: any;
          try {
            pollData = JSON.parse(pollText);
          } catch {
            return respond({ error: "视频状态查询返回了不可解析的数据格式" }, 502);
          }

          const status = String(pollData?.status ?? "").toLowerCase();
          if (status === "pending") {
            continue;
          }

          if (status === "done") {
            const videoUrl =
              pollData?.video?.url ||
              pollData?.video_url ||
              pollData?.videos?.[0]?.url ||
              pollData?.result?.video_url ||
              pollData?.result?.url ||
              null;

            if (!videoUrl) {
              return respond({ error: "视频生成完成，但未返回可用的视频地址" }, 502);
            }

            await prisma.generationLog.create({
              data: {
                type: 'VIDEO',
                userId: user?.id ?? null,
                userEmail: user?.email ?? null,
                model: actualModel,
                endpoint: finalEndpoint,
                requestPrompt: String(finalPrompt).slice(0, 2000),
                imageUrl: String(videoUrl).slice(0, 2000),
                responseText: pollText.slice(0, 2000),
                success: true
              }
            });

            clearTimeout(timeoutId);
            const updatedVideoQuota = user?.id ? await getVideoQuotaForUser(user.id, user.email) : null;
            return respond({ ...pollData, videoQuota: updatedVideoQuota }, 200);
          }

          const statusError =
            pollData?.error?.message ||
            pollData?.message ||
            pollData?.detail ||
            `视频生成失败，状态为 ${status || "unknown"}`;
          await prisma.generationLog.create({
            data: {
              type: 'VIDEO',
              userId: user?.id ?? null,
              userEmail: user?.email ?? null,
              model: actualModel,
              endpoint: statusEndpoint,
              requestPrompt: String(finalPrompt).slice(0, 2000),
              success: false,
              errorMessage: statusError,
              responseText: pollText.slice(0, 2000)
            }
          });
          return respond({ error: statusError }, status === "expired" ? 504 : 502);
        }

        return respond({ error: "视频生成超时，请稍后重试" }, 504);
      }

      let messages: any[] = [];
      let finalImageUrl = image_url;

      // 根据是否有图片传入，决定使用什么 payload
      if (image_url && !isVideo) {
        // 图生图模式：使用标准的 OpenAI Vision API 格式
        // 对于第三方套壳接口，最安全的图片传输方式是将 URL 转换为 Base64
        // 根据 astrbot_plugin_figurine 插件，他们是直接传 data:image/png;base64,... 格式的。

        // 验证图片URL格式
        const urlValidation = validateImageUrl(image_url);
        if (!urlValidation.valid && urlValidation.error) {
          await prisma.generationLog.create({
            data: {
              type: urlValidation.error.errorCode,
              success: false,
              errorMessage: urlValidation.error.errorMessage,
              responseText: JSON.stringify({
                errorCode: urlValidation.error.errorCode,
                errorDetail: urlValidation.error.errorDetail,
                imageUrl: image_url
              })
            }
          });
          return respond({ error: urlValidation.error.errorMessage }, 400);
        }

        // 验证图片大小
        const sizeValidation = await validateImageSize(image_url, 10);
        if (!sizeValidation.valid && sizeValidation.error) {
          await prisma.generationLog.create({
            data: {
              type: sizeValidation.error.errorCode,
              success: false,
              errorMessage: sizeValidation.error.errorMessage,
              responseText: JSON.stringify({
                errorCode: sizeValidation.error.errorCode,
                errorDetail: sizeValidation.error.errorDetail,
                imageUrl: image_url
              })
            }
          });
          return respond({ error: sizeValidation.error.errorMessage }, 400);
        }

        // 如果传入的是 http(s) 链接，我们将其转换为 base64
        if (image_url.startsWith('http')) {
          // 添加超时控制
          const imgController = new AbortController();
          const imgTimeoutId = setTimeout(() => imgController.abort(), 30000); // 30秒超时

          try {
            const imgRes = await fetch(image_url, {
              signal: imgController.signal
            });

            if (!imgRes.ok) {
              clearTimeout(imgTimeoutId);
              // 记录错误日志
              await prisma.generationLog.create({
                data: {
                  type: ErrorCode.VALIDATION_INVALID_IMAGE_URL,
                  success: false,
                  errorMessage: '无法获取参考图片，请检查图片链接',
                  responseText: JSON.stringify({
                    errorCode: ErrorCode.VALIDATION_INVALID_IMAGE_URL,
                    errorDetail: `HTTP ${imgRes.status}: ${imgRes.statusText}`,
                    imageUrl: image_url
                  })
                }
              });
              return respond({ error: '无法获取参考图片，请检查图片链接' }, 400);
            }

            const arrayBuffer = await imgRes.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // 检查图片大小（Base64编码后会增大约33%）
            const sizeInMB = buffer.length / (1024 * 1024);
            const maxSizeMB = 10; // 限制10MB

            if (sizeInMB > maxSizeMB) {
              clearTimeout(imgTimeoutId);
              await prisma.generationLog.create({
                data: {
                  type: ErrorCode.VALIDATION_IMAGE_TOO_LARGE,
                  success: false,
                  errorMessage: `图片大小超过限制（最大${maxSizeMB}MB）`,
                  responseText: JSON.stringify({
                    errorCode: ErrorCode.VALIDATION_IMAGE_TOO_LARGE,
                    errorDetail: `Image size ${sizeInMB.toFixed(2)}MB exceeds limit ${maxSizeMB}MB`,
                    imageUrl: image_url
                  })
                }
              });
              return respond({ error: `图片大小超过限制（最大${maxSizeMB}MB），当前${sizeInMB.toFixed(2)}MB` }, 400);
            }

            const base64 = buffer.toString('base64');
            const mimeType = imgRes.headers.get('content-type') || 'image/jpeg';
            finalImageUrl = `data:${mimeType};base64,${base64}`;

            clearTimeout(imgTimeoutId);
          } catch (e) {
            clearTimeout(imgTimeoutId);

            // 判断是否为超时错误
            const isTimeout = e instanceof Error && e.name === 'AbortError';
            const errorCode = isTimeout ? ErrorCode.API_TIMEOUT : ErrorCode.VALIDATION_INVALID_IMAGE_URL;
            const errorMessage = isTimeout ? '图片加载超时，请重试' : '无法获取参考图片，请检查图片链接';

            // 记录错误日志
            await prisma.generationLog.create({
              data: {
                type: errorCode,
                success: false,
                errorMessage: errorMessage,
                responseText: JSON.stringify({
                  errorCode: errorCode,
                  errorDetail: e instanceof Error ? e.message : String(e),
                  errorStack: e instanceof Error ? e.stack : undefined,
                  imageUrl: image_url
                })
              }
            });

            return respond({ error: errorMessage }, 400);
          }
        }

        messages = [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: finalPrompt
              },
              {
                type: "image_url",
                image_url: {
                  url: finalImageUrl
                }
              }
            ]
          }
        ];
      } else {
        messages = [
          {
            role: "user",
            content: isVideo ? `${finalPrompt}\n\nGenerate a ${videoDuration}-second video.` : finalPrompt
          }
        ];
      }

      let requestPayload: any;
      if (useImagesGenerationApi) {
        requestPayload = {
          model: actualModel,
          prompt: finalPrompt,
          n: 1,
          response_format: "url",
          size: `${aspectSize?.width ?? 1024}x${aspectSize?.height ?? 1024}`
        };
        // 图生图模式：确保正确传递图片参数
        if (image_url && !isVideo) {
          // 使用 finalImageUrl（已转换为base64）而不是原始 image_url
          requestPayload.image = finalImageUrl;
          // 某些API可能需要 image_url 字段
          requestPayload.image_url = finalImageUrl;
        }
      } else {
        requestPayload = {
          model: actualModel,
          messages: messages,
          stream: false,
          max_tokens: 4096
        };
        if (!isVideo && isGrokImagineModel(actualModel)) {
          requestPayload.image_config = {
            n: 1,
            size: `${aspectSize?.width ?? 1024}x${aspectSize?.height ?? 1024}`,
            response_format: "b64_json"
          };
        }
      }
      if (isVideo) {
        requestPayload.modalities = ["video"];
        requestPayload.duration = videoDuration;
      }
      if (aspectSize) {
        requestPayload.size = `${aspectSize.width}x${aspectSize.height}`;
        requestPayload.width = aspectSize.width;
        requestPayload.height = aspectSize.height;
        requestPayload.aspect_ratio = aspectKey;
        requestPayload.image_size = { width: aspectSize.width, height: aspectSize.height };
      }

      // 针对 Gemini / Grok-imagine 这种底层的模型中转，
      // 对于这套基于 gemini 视觉模型的系统，如果在 payload 中不加上明确要求生成的字段，
      // 有些接口就会退化为普通的视觉描述（看图说话）。
      // 这是参考 zgojin/astrbot_plugin_figurine_workshop 插件的逻辑。
      // 注意：有的接口（比如官方）不认 OpenAI 格式里的 modalities，但这对于套壳服务来说，
      // 不妨尝试通过给 prompt 强制加上绘图指令。
      // Removed system command wrapper and modalities to match astrbot plugin approach exactly

      const doRequest = (payload: any) => fetch(finalEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${finalApiKey}`,
          "User-Agent": REQUEST_USER_AGENT,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      // 提取媒体URL的辅助函数
      const extractMediaUrl = (data: any, isVideo: boolean): string | null => {
        return isVideo
          ? (
            data?.data?.[0]?.video_url ||
            data?.videos?.[0]?.url ||
            data?.videos?.[0]?.video_url ||
            data?.result?.video_url ||
            data?.result?.url ||
            data?.output?.[0] ||
            data?.data?.[0]?.url ||
            null
          )
          : (
            data?.data?.[0]?.url ||
            data?.images?.[0]?.url ||
            data?.images?.[0]?.image_url ||
            data?.output?.[0] ||
            data?.result?.url ||
            extractImageUrlFromAny(data?.choices?.[0]?.message?.content) ||
            extractImageUrlFromAny(data) ||
            null
          );
      };

      let response: Response | null = null;
      let lastErrorText = "";
      let didPayloadRetry = false;
      let didKeyRetry = false;
      let activePayload: any = requestPayload;
      let activeModel = actualModel;
      let finalData: any = null;
      let mediaUrl: string | null = null;
      const maxNoImageRetry = !isVideo && !useImagesGenerationApi ? 2 : 0;
      let noImageRetryCount = 0;
      let badGatewayRetryCount = 0;
      const maxBadGatewayRetry = 3; // Allow up to 3 retries for 502/Bad Gateway errors

      response = await doRequest(activePayload);

      // 重试逻辑
      for (let attempt = 0; attempt < 5; attempt++) {
        if (attempt > 0 || !response) {
          response = await doRequest(activePayload);
        }
        const responseText = await response.text();

        // Check for 502 or Bad Gateway explicitly and retry
        if (!response.ok && (response.status === 502 || responseText.includes("Bad Gateway") || responseText.includes("blocked or no valid final image"))) {
           if (badGatewayRetryCount < maxBadGatewayRetry) {
             badGatewayRetryCount++;
             lastErrorText = responseText;
             // Wait 2 seconds before retrying a 502
             await new Promise(resolve => setTimeout(resolve, 2000));
             continue;
           }
        }

        if (response.ok) {
          try {
            finalData = JSON.parse(responseText);
          } catch {
            // If it's a 200 OK but invalid JSON, treat it like a 502 if we have retries left
            if (badGatewayRetryCount < maxBadGatewayRetry) {
              badGatewayRetryCount++;
              lastErrorText = responseText;
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue;
            }
            lastErrorText = responseText;
            break;
          }

          mediaUrl = isVideo
            ? (
              finalData?.data?.[0]?.video_url ||
              finalData?.videos?.[0]?.url ||
              finalData?.videos?.[0]?.video_url ||
              finalData?.result?.video_url ||
              finalData?.result?.url ||
              finalData?.output?.[0] ||
              finalData?.data?.[0]?.url ||
              null
            )
            : (
              finalData?.data?.[0]?.url ||
              finalData?.images?.[0]?.url ||
              finalData?.images?.[0]?.image_url ||
              finalData?.output?.[0] ||
              finalData?.result?.url ||
              extractImageUrlFromAny(finalData?.choices?.[0]?.message?.content) ||
              extractImageUrlFromAny(finalData) ||
              null
            );

          if (!mediaUrl && noImageRetryCount < maxNoImageRetry) {
            noImageRetryCount += 1;
            const reinforcedPrompt = `Generate exactly one image and return only image result. No explanation text.\n\n${finalPrompt}`;
            if (useImagesGenerationApi) {
              activePayload = {
                ...activePayload,
                prompt: reinforcedPrompt,
                n: 1
              };
            } else {
              let retryMessages: any[] = [{ role: "user", content: reinforcedPrompt }];
              if (isImg2Img && messages[0]?.content && Array.isArray(messages[0].content)) {
                // Preserve the image_url block for img2img retries
                const imageBlock = messages[0].content.find((c: any) => c.type === "image_url");
                if (imageBlock) {
                  retryMessages = [{
                    role: "user",
                    content: [
                      { type: "text", text: reinforcedPrompt },
                      imageBlock
                    ]
                  }];
                }
              }
              activePayload = {
                ...activePayload,
                messages: retryMessages,
                stream: false,
                image_config: {
                  n: 1,
                  size: `${aspectSize?.width ?? 1024}x${aspectSize?.height ?? 1024}`,
                  response_format: "b64_json"
                }
              };
            }
            continue;
          }
          break;
        }

        lastErrorText = responseText;

        if (canAutoSwitchImageKey && !didKeyRetry && isQuotaExhaustedError(response.status, lastErrorText)) {
          const fallbackKey = finalApiKey === DEFAULT_FREE_IMG_API_KEY ? DEFAULT_BACKUP_IMG_API_KEY : DEFAULT_FREE_IMG_API_KEY;
          if (fallbackKey && fallbackKey !== finalApiKey) {
            finalApiKey = fallbackKey;
            didKeyRetry = true;
            continue;
          }
        }

        if (
          !isVideo &&
          !useImagesGenerationApi &&
          isGrokImagineModel(activeModel) &&
          response.status === 429 &&
          /rate_limit_exceeded|No available tokens/i.test(lastErrorText) &&
          activeModel === "grok-imagine-image"
        ) {
          activeModel = "grok-imagine-image-lite";
          activePayload = {
            ...activePayload,
            model: activeModel,
            image_config: {
              n: 1,
              size: `${aspectSize?.width ?? 1024}x${aspectSize?.height ?? 1024}`,
              response_format: "b64_json"
            }
          };
          continue;
        }

        if (aspectSize && !didPayloadRetry && (response.status === 400 || response.status === 422)) {
          const retryPayload: any = { ...activePayload };
          delete retryPayload.size;
          delete retryPayload.width;
          delete retryPayload.height;
          delete retryPayload.aspect_ratio;
          delete retryPayload.image_size;
          activePayload = retryPayload;
          didPayloadRetry = true;
          continue;
        }

        break;
      }

      clearTimeout(timeoutId);

      if (!response || !response.ok) {
          const errorText = lastErrorText || "";
          const status = response?.status ?? 0;
          console.error('[generate-image] request failed:', status, errorText.substring(0, 200));
          const error = parseApiError(status, errorText);
          logErrorAsync(error, {
            userId: user?.id,
            userEmail: user?.email,
            model: activeModel,
            endpoint: finalEndpoint,
            requestPrompt: String(finalPrompt).slice(0, 2000)
          });
          return respond({ error: error.message }, status || 500);
      }

      if (!finalData) {
        return respond({ error: "上游返回了不可解析的数据格式" }, 502);
      }

      const responseText = String(finalData?.choices?.[0]?.message?.content ?? '').slice(0, 2000);
      await prisma.generationLog.create({
        data: {
          type: isVideo ? 'VIDEO' : 'IMAGE',
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
          model: activeModel,
          endpoint: finalEndpoint,
          requestPrompt: String(finalPrompt).slice(0, 2000),
          imageUrl: mediaUrl ? String(mediaUrl).slice(0, 2000) : null,
          responseText,
          success: true
        }
      });
      
      // 生成成功后，如果使用的是默认 Key，则更新用户的限制数据
      if (!apiKey) {
        if (authHeader) {
          if (decoded && decoded.userId) {
            await prisma.user.update({
              where: { id: decoded.userId },
              data: {
                imageCount: { increment: 1 },
                dailyImageCount: { increment: 1 },
                lastImageGeneratedAt: new Date(),
                lastDailyReset: new Date() // 确保日期更新
              }
            });
          }
        }
      }

      if (!isVideo && !mediaUrl) {
        return respond({ error: "未识别到图片结果，请稍后重试或更换提示词。" }, 502);
      }

      // 修复 gpt2.zeabur.app 返回 http:// URL 的问题，替换为 https://
      if (mediaUrl && typeof mediaUrl === 'string' && mediaUrl.startsWith('http://gpt2.zeabur.app/')) {
        mediaUrl = mediaUrl.replace('http://gpt2.zeabur.app/', 'https://gpt2.zeabur.app/');
      }

      return respond(buildImageClientPayload(finalData, mediaUrl!, actualModel, activeModel), 200);

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return respond({ error: isVideo ? "视频生成超时，请稍后重试" : (isGptImage2Model ? "GPT-Image-2 请求超时，模型响应较慢，请耐心等待或稍后重试" : "API 请求超时，请稍后重试") }, 504);
      }
      throw fetchError;
    }

  } catch (error: any) {
    const err = buildErrorResponse(
      ErrorCode.SYSTEM_INTERNAL_ERROR,
      error instanceof Error ? error.message : String(error)
    );
    logErrorAsync(err, {});
    return respond({ error: err.message }, err.statusCode);
  }
}
