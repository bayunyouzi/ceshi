import { prisma } from '@/lib/db';

// 错误码枚举
export enum ErrorCode {
  API_INTERNAL_ERROR = 'API_INTERNAL_ERROR',
  API_QUOTA_EXCEEDED = 'API_QUOTA_EXCEEDED',
  API_TIMEOUT = 'API_TIMEOUT',
  API_BAD_GATEWAY = 'API_BAD_GATEWAY',
  SECURITY_UNAUTHORIZED_MODEL = 'SECURITY_UNAUTHORIZED_MODEL',
  SECURITY_CLOUDFLARE_CHALLENGE = 'SECURITY_CLOUDFLARE_CHALLENGE',
  VALIDATION_INVALID_IMAGE_URL = 'VALIDATION_INVALID_IMAGE_URL',
  VALIDATION_IMAGE_TOO_LARGE = 'VALIDATION_IMAGE_TOO_LARGE',
  VALIDATION_FORM_PARSE_ERROR = 'VALIDATION_FORM_PARSE_ERROR',
  SYSTEM_INTERNAL_ERROR = 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_RESOURCE_EXHAUSTED = 'SYSTEM_RESOURCE_EXHAUSTED',
}

// 错误响应接口
export interface ErrorResponse {
  code: ErrorCode;
  message: string;
  detail?: string;
  shouldRetry: boolean;
  retryAfter?: number;
  statusCode: number;
}

// 错误消息映射
const ERROR_MESSAGES: Record<ErrorCode, { message: string; statusCode: number; shouldRetry: boolean; retryAfter?: number }> = {
  [ErrorCode.API_INTERNAL_ERROR]: { message: '服务暂时异常，请稍后再试', statusCode: 500, shouldRetry: true },
  [ErrorCode.API_QUOTA_EXCEEDED]: { message: '服务暂时不可用，请稍后再试', statusCode: 429, shouldRetry: false },
  [ErrorCode.API_TIMEOUT]: { message: '网络连接超时，请重试', statusCode: 504, shouldRetry: true, retryAfter: 5 },
  [ErrorCode.API_BAD_GATEWAY]: { message: '网关错误，请稍后重试', statusCode: 502, shouldRetry: true, retryAfter: 2 },
  [ErrorCode.SECURITY_UNAUTHORIZED_MODEL]: { message: '请求的模型不可用，已自动回退', statusCode: 200, shouldRetry: false },
  [ErrorCode.SECURITY_CLOUDFLARE_CHALLENGE]: { message: '请求被安全系统拦截，请稍后再试', statusCode: 502, shouldRetry: false },
  [ErrorCode.VALIDATION_INVALID_IMAGE_URL]: { message: '请上传有效的图片文件', statusCode: 400, shouldRetry: false },
  [ErrorCode.VALIDATION_IMAGE_TOO_LARGE]: { message: '图片大小超过限制', statusCode: 400, shouldRetry: false },
  [ErrorCode.VALIDATION_FORM_PARSE_ERROR]: { message: '请求格式错误，请重试', statusCode: 400, shouldRetry: false },
  [ErrorCode.SYSTEM_INTERNAL_ERROR]: { message: '服务暂时异常，请稍后再试', statusCode: 500, shouldRetry: false },
  [ErrorCode.SYSTEM_RESOURCE_EXHAUSTED]: { message: '服务资源不足，请稍后再试', statusCode: 503, shouldRetry: true, retryAfter: 30 },
};

// 构建标准化错误响应
export function buildErrorResponse(
  code: ErrorCode,
  detail?: string,
  context?: Record<string, unknown>
): ErrorResponse {
  const config = ERROR_MESSAGES[code];
  return {
    code,
    message: config.message,
    detail,
    shouldRetry: config.shouldRetry,
    retryAfter: config.retryAfter,
    statusCode: config.statusCode,
  };
}

// 解析API错误
export function parseApiError(statusCode: number, responseText: string): ErrorResponse {
  const lowered = responseText.toLowerCase();

  // 检测配额耗尽
  if (
    responseText.includes('used all available credits') ||
    responseText.includes('spending limit') ||
    responseText.includes('insufficient_quota') ||
    (lowered.includes('quota') && (lowered.includes('exceed') || lowered.includes('exhaust') || lowered.includes('insufficient')))
  ) {
    return buildErrorResponse(ErrorCode.API_QUOTA_EXCEEDED, responseText);
  }

  // 检测资源耗尽
  if (responseText.includes('resource has been exhausted')) {
    return buildErrorResponse(ErrorCode.SYSTEM_RESOURCE_EXHAUSTED, responseText);
  }

  // 检测Cloudflare挑战
  if (
    lowered.includes('cf-browser-verification') ||
    lowered.includes('cdn-cgi/challenge-platform') ||
    lowered.includes('just a moment') ||
    lowered.includes('__cf_chl')
  ) {
    return buildErrorResponse(ErrorCode.SECURITY_CLOUDFLARE_CHALLENGE, `Status: ${statusCode}`);
  }

  // 检测图片上传失败
  if (
    responseText.includes('AssetsUploadReverse') ||
    responseText.includes('Upload failed') ||
    responseText.includes('upstream_error')
  ) {
    return buildErrorResponse(ErrorCode.VALIDATION_INVALID_IMAGE_URL, responseText);
  }

  // 检测超时
  if (statusCode === 504 || lowered.includes('timeout') || lowered.includes('etimedout')) {
    return buildErrorResponse(ErrorCode.API_TIMEOUT, `Status: ${statusCode}`);
  }

  // 检测Bad Gateway
  if (statusCode === 502 || lowered.includes('bad gateway')) {
    return buildErrorResponse(ErrorCode.API_BAD_GATEWAY, `Status: ${statusCode}`);
  }

  // 检测服务器错误
  if (statusCode >= 500) {
    return buildErrorResponse(ErrorCode.API_INTERNAL_ERROR, `Server error ${statusCode}: ${responseText.substring(0, 200)}`);
  }

  // 解析JSON错误消息
  try {
    const parsed = JSON.parse(responseText);
    const msg = parsed?.error?.message || parsed?.error?.detail || parsed?.detail || parsed?.message || parsed?.error || '';

    if (typeof msg === 'string' && /content moderation|rejected by content moderation|moderation/i.test(msg)) {
      return buildErrorResponse(
        ErrorCode.API_INTERNAL_ERROR,
        `Content moderation rejected: ${msg}`
      );
    }

    if (typeof msg === 'string' && msg.trim()) {
      return buildErrorResponse(ErrorCode.API_INTERNAL_ERROR, `API Error: ${statusCode} - ${msg}`);
    }
  } catch {}

  if (!responseText) {
    return buildErrorResponse(ErrorCode.API_INTERNAL_ERROR, `API Error: ${statusCode}`);
  }

  return buildErrorResponse(ErrorCode.API_INTERNAL_ERROR, `API Error: ${statusCode} - ${responseText.substring(0, 200)}`);
}

// 模型白名单
const ALLOWED_IMAGE_MODELS = [
  'grok-imagine-image',
  'grok-imagine-image-lite',
  'grok-imagine-image-edit',
  'grok-imagine-image-pro',
  'grok-imagine-video',
  'gpt-image-2',
];

const ALLOWED_PROMPT_MODELS = [
  'grok-4.20-0309',
  'grok-4.20-0309-reasoning',
  'grok-4.20-0309-non-reasoning',
  'openai/gpt-oss-120b',
  'gpt-5.5',
];

// 验证模型是否在白名单中
export function validateModel(
  model: string,
  type: 'image' | 'prompt',
  useCustomConfig: boolean
): { valid: boolean; fallback?: string } {
  if (useCustomConfig) return { valid: true };
  const allowed = type === 'image' ? ALLOWED_IMAGE_MODELS : ALLOWED_PROMPT_MODELS;
  if (allowed.includes(model)) return { valid: true };
  console.warn(`[Security] Blocked attempt to use unauthorized model: ${model}. Falling back to default.`);
  return { valid: false, fallback: allowed[0] };
}

// 敏感信息过滤
const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/g,          // OpenAI-style API keys
  /Bearer\s+[a-zA-Z0-9]{20,}/g,    // Bearer tokens
  /api[_-]?key[=:]\s*["']?\S+/gi,   // API key assignments
  /[a-f0-9]{24,}/gi,                // Hex tokens (like MongoDB IDs)
];

export function sanitizeErrorMessage(message: string): string {
  let sanitized = message;
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized;
}

// 异步记录错误到数据库
export function logErrorAsync(
  error: ErrorResponse,
  context: {
    userId?: string | null;
    userEmail?: string | null;
    model?: string;
    endpoint?: string;
    requestPrompt?: string;
  }
): void {
  prisma.generationLog.create({
    data: {
      type: error.code,
      userId: context.userId ?? null,
      userEmail: context.userEmail ?? null,
      model: context.model ?? null,
      endpoint: context.endpoint ?? null,
      requestPrompt: context.requestPrompt ? String(context.requestPrompt).slice(0, 2000) : null,
      success: false,
      errorMessage: error.message,
      responseText: sanitizeErrorMessage(error.detail || '').slice(0, 2000),
    },
  }).catch((err) => {
    console.error('[errorHandler] Failed to log error to database:', err);
  });
}
