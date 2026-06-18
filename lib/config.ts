import { prisma } from './db';

// ============================================================
// 默认配置值 - 与原硬编码值保持一致
// ============================================================
export const DEFAULT_CONFIG: Record<string, string> = {
  // --- Grok 提示词 API ---
  GROK_PROMPT_API_KEY: "sk-aT8zbZSLI8mNNm91bVmAUqPLpVmpqIuo",
  GROK_PROMPT_API_ENDPOINT: "http://124.156.219.145:8000/v1",
  GROK_PROMPT_MODEL: "grok-4.20-0309-non-reasoning",

  // --- Vision API（图生文/反推提示词）---
  VISION_API_KEY: "sk-w7Eit87AWrFGwLYLrIcSOgdDW204j0euC2Zlg5DACz4xx7nT",
  VISION_API_ENDPOINT: "https://happyapi.org/v1/chat/completions",
  VISION_MODEL: "grok-4.20-0309-non-reasoning",

  // --- Grok 生图 API ---
  GROK_IMAGE_API_KEY: "sk-aT8zbZSLI8mNNm91bVmAUqPLpVmpqIuo",
  GROK_IMAGE_API_ENDPOINT: "http://124.156.219.145:8000/v1",
  GROK_IMAGE_MODEL: "grok-imagine-image-lite",
  GROK_IMG2IMG_MODEL: "grok-imagine-image-lite",

  // --- GPT-Image-2 API ---
  GPT_IMAGE2_API_KEY: "sk-eccd9e1e2ab7bdd6e808e4f8f41c1adfb66e7983c057eaf5fe7f879b5bb3bdb2",
  GPT_IMAGE2_API_ENDPOINT: "https://shumai.siphot.com/v1/images/generations",
  GPT_IMAGE2_MODEL: "gpt-image-2",

  // --- 视频生成 API ---
  VIDEO_API_KEY: "xai-I1k5xdu1X9fAxANwIXP2sBSdrJZkravAOfbDffwv0P6YgGFj3u597hVEb6B3kvOeClJFNCkx7vQeJsnh",
  VIDEO_API_ENDPOINT: "https://api.x.ai/v1/videos/generations",
  VIDEO_MODEL: "grok-imagine-video",

  // --- 速率限制 ---
  FREE_IMG_DAILY_LIMIT: "100",
  COOLDOWN_SECONDS: "10",
  VIDEO_DAILY_LIMIT: "10",

  // --- 系统配置 ---
  ADMIN_EMAILS: "1585062016@qq.com",
  VIDEO_LIMIT_EXEMPT_EMAIL: "1585062016@qq.com",

  // --- 图生图效果提示词 (JSON) ---
  IMG2IMG_PROMPTS: JSON.stringify({
    figure: "Your primary mission is to convert the subject from the user's photo into a **photorealistic, ultra-high-resolution miniature model**, displayed in a realistic studio/workshop setting. The result must be **pin-sharp, crystal clear, and professional-grade**, with **no blur, no distortion, and no random changes in pose**.\n\n**Core Directive: Subject Analysis & Priority Assignment (CRITICAL FIRST STEP)**\n1. Identify the subject of the image.\n2. Apply the correct rule set:\n\n* **RULE SET A - Person, creature, or animal:**\n   - **If a face is visible:** Prioritize **Character Fidelity and Sharp Likeness**.\n   - **If NO face is visible (e.g., back view):** Prioritize **Pose and Form Fidelity**.\n     ⚠️ **Do NOT invent or fabricate a face**. Preserve the exact pose of the subject in the input photo.\n\n* **RULE SET B - Vehicle:** Ensure perfect **Form, Proportions, Surface Finish, and Key Details** with **ultra-sharp clarity**.\n\n* **RULE SET C - Building/structure:** Ensure **Architectural Integrity** with clear **geometry, materials, and fine details**, all rendered in **sharp focus**.\n\n**Scene Composition (Strictly follow these details):**\n1. **The Model:** The miniature model on a desk or workshop table, rendered in **ultra-sharp detail**, faithfully matching the input subject's **pose and proportions**.\n2. **Computer Monitor:** In the background, a monitor displays relevant 3D modeling software, showing the same subject. The screen must be **readable, crisp, not blurry**.\n3. **Environment:** A realistic, well-lit studio or office desk, with details like tools or keyboards, rendered in **professional product photography clarity**.",
    figure_box: "Your primary mission is to convert the subject from the user's photo into a **photorealistic, ultra-high-resolution miniature figure**, presented in its commercial packaging.\nThe result must be **sharp, crystal-clear, and professional product photography quality**, with **no blurriness or distortion**.\n\n**Core Directive: Subject Analysis & Priority Assignment (CRITICAL FIRST STEP)**\n1. Identify the subject of the image.\n2. Apply the correct rule set:\n\n* **RULE SET A - Person, creature, or animal:**\n   - **If a face is visible:** Your top priority is **Likeness**. Render the face in sharp detail, with accurate proportions.\n   - **If NO face is visible (e.g., back view):** Your top priority is **Pose and Form Fidelity**. **Do NOT invent or add a face** ⁃ faithfully preserve the back-view pose from the source photo.\n\n* **RULE SET B - Vehicle:** Prioritize exact **Form, Proportions, Surface Finish, and Key Details**.\n\n* **RULE SET C - Building/structure:** Prioritize **Architectural Integrity** (geometry, materials, fine details).\n\n**Scene Details:**\n1. **The Model:** The miniature figure must be **highly detailed, sharp, and exactly match the pose from the input photo**.\n2. **The Base:** A clean, simple display base.\n3. **The Packaging:** Behind the model, show a collector's style box featuring the subject.\n4. **Environment:** A professional, well-lit indoor studio setting, **sharp focus, no blur, no noise**.",
    cosplay: "Generate a highly detailed photo of a human cosplaying this illustration, at Comiket. Exactly replicate the same pose, body posture, hand gestures, facial expression, and camera framing as in the original illustration. Keep the same angle, perspective, and composition, without any deviation",
    cosplay_selfie: "Create a cosplay selfie version from the reference character. Keep identity locked: same face traits, hair, outfit and colors. Front camera selfie composition, arm-length perspective, realistic skin texture, indoor ambient light, slight phone camera grain, high detail. Return image only.",
    real: "Convert the reference character to an ultra-realistic, highly detailed photorealistic style while strictly preserving identity. Keep the exact same face geometry, same hairstyle, same costume details, same pose and camera framing as the original image. Realistic skin texture, natural lighting, subtle film grain, sharp and believable, no cartoon style. DO NOT change the subject's pose or clothing.",
    anime: "Redraw the reference image into clean 2D anime style while strictly preserving identity and composition. Keep exact same face shape, same eye style, same hairstyle, same costume pattern and color, same pose and camera angle. Crisp lineart, cel shading, vibrant but controlled colors, masterpiece, high detail. DO NOT change the subject's pose or clothing.",
    chibi: "Convert the reference character into chibi style. Keep recognizable identity cues: hairstyle, eye color, costume palette, signature accessories. 1:2 head-to-body ratio, cute proportions, clean lines, soft shading, simple background, high clarity. Return image only.",
    sticker: "Convert the reference character into a sticker illustration. Keep identity locked and outfit recognizable. Bold clean outline, transparent or simple plain background, centered composition, high contrast colors, printable quality. Return image only.",
    first_person: "Generate a first-person perspective scene featuring the reference character. Keep the character identity, face traits, hairstyle and outfit consistent with reference. Cinematic POV composition, realistic depth and lighting, high detail. Return image only.",
    turnaround: "Create a three-view turnaround of the reference character (front, side, back) in one image. Keep identity and costume details fully consistent across all three views. Clean neutral background, design-sheet style, high detail, no text. Return image only.",
    storyboard: "Create a 4-panel storyboard based on the reference character. Keep identity, outfit and hairstyle consistent in every panel. Panels should show coherent action progression with varied camera shots. Clean comic layout, no text bubbles, high detail. Return image only.",
    random: "Generate a new creative image based on the reference while preserving core identity: same face features, hairstyle, outfit style and color family. Allow creative scene and lighting variation, but keep character recognizability high. Return image only."
  }),
};

// ============================================================
// 内存缓存 (TTL 30秒)
// ============================================================
let configCache: Map<string, string> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 30_000;

async function loadAllConfigs(): Promise<Map<string, string>> {
  const now = Date.now();
  if (configCache && now - cacheTimestamp < CACHE_TTL_MS) {
    return configCache;
  }

  try {
    const rows = await prisma.config.findMany();
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.key, row.value);
    }
    configCache = map;
    cacheTimestamp = now;
    return map;
  } catch (error) {
    console.error('[config] Failed to load configs from database:', error);
    // 如果数据库读取失败，返回空map，调用方会使用默认值
    return configCache || new Map();
  }
}

// ============================================================
// 公开 API
// ============================================================

/**
 * 获取配置值，优先从数据库读取，如果不存在则使用默认值
 */
export async function getConfig(key: string, fallback?: string): Promise<string> {
  const map = await loadAllConfigs();
  const value = map.get(key);
  if (value !== undefined) return value;
  if (fallback !== undefined) return fallback;
  return DEFAULT_CONFIG[key] ?? '';
}

/**
 * 批量获取多个配置值
 */
export async function getConfigs(keys: string[]): Promise<Record<string, string>> {
  const map = await loadAllConfigs();
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = map.get(key);
    if (value !== undefined) {
      result[key] = value;
    } else {
      result[key] = DEFAULT_CONFIG[key] ?? '';
    }
  }
  return result;
}

/**
 * 获取所有配置（含默认值填充）
 */
export async function getAllConfigs(): Promise<Record<string, string>> {
  const map = await loadAllConfigs();
  const result: Record<string, string> = {};
  // 先填入所有默认值
  for (const key of Object.keys(DEFAULT_CONFIG)) {
    result[key] = DEFAULT_CONFIG[key];
  }
  // 再用数据库值覆盖
  for (const [key, value] of map) {
    result[key] = value;
  }
  return result;
}

/**
 * 更新配置值
 */
export async function setConfig(key: string, value: string): Promise<void> {
  await prisma.config.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  // 更新缓存
  if (configCache) {
    configCache.set(key, value);
  }
}

/**
 * 批量更新配置值
 */
export async function setConfigs(entries: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    await prisma.config.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }
  // 使缓存失效，下次读取时重新加载
  configCache = null;
}

/**
 * 初始化默认配置 - 仅在数据库为空时写入默认值
 */
export async function initDefaultConfigs(): Promise<void> {
  const count = await prisma.config.count();
  if (count > 0) return;

  console.log('[config] Initializing default configs...');
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await prisma.config.create({ data: { key, value } });
  }
  configCache = null; // 使缓存失效
  console.log('[config] Default configs initialized.');
}

/**
 * 清除缓存（用于外部强制刷新）
 */
export function clearConfigCache(): void {
  configCache = null;
  cacheTimestamp = 0;
}

/**
 * 解析管理员邮箱列表
 */
export async function getAdminEmails(): Promise<string[]> {
  const raw = await getConfig('ADMIN_EMAILS');
  return raw.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}

/**
 * 解析图生图提示词
 */
export async function getImg2ImgPrompts(): Promise<Record<string, string>> {
  const raw = await getConfig('IMG2IMG_PROMPTS', '{}');
  try {
    return JSON.parse(raw);
  } catch {
    console.error('[config] Failed to parse IMG2IMG_PROMPTS JSON');
    return {};
  }
}

/**
 * 获取数字类型的配置值
 */
export async function getConfigInt(key: string, fallback: number): Promise<number> {
  const raw = await getConfig(key, String(fallback));
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? fallback : parsed;
}
