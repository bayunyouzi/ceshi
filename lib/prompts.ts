// lib/prompts.ts

// 焚绝生成的核心词库
// 根据你的要求，这里的词条已经包含了“大尺度”和详细的二次元特征

const SUBJECTS = [
  "1girl", "solo", "beautiful girl", "anime girl", 
  "shenhe (genshin impact)", "yelan (genshin impact)", "ganyu (genshin impact)", "raiden shogun"
];

const FEATURES = [
  // 面部与发型
  "detailed face", "beautiful eyes", "grey eyes", "blue eyes", "red eyes",
  "long hair", "very long hair", "white hair", "silver hair", "hair over one eye",
  "blush", "expressionless", "looking to the side", "sweat",
  
  // 身体特征 (尺度较大)
  "huge breasts", "large breasts", "breasts", "cleavage",
  "navel", "stomach", "curvy body", "thighs", "bare shoulders",
  "detailed skin", "shiny skin"
];

const CLOTHING = [
  // 服装 (包含开放式/透视等)
  "robe", "white robe", "open robe", "open clothes", 
  "see-through clothes", "translucent dress", "chinese clothes",
  "lingerie", "bikini", "revealing clothes", "nude", // 包含用户示例中的尺度词
  "ribbon", "tassel", "jewelry", "earrings", "tassel earrings"
];

const ACTIONS = [
  "standing", "sitting", "kneeling", "lying",
  "arms up", "tying hair", "stretching",
  "mouth hold", "ribbon in mouth", "biting lip",
  "looking at viewer", "looking back"
];

const ENVIRONMENT = [
  "indoors", "bedroom", "onsen", "simple background", 
  "fantasy background", "soft lighting", "cinematic lighting",
  "steam", "wet"
];

const STYLE_QUALITY = [
  "masterpiece", "best quality", "ultra-detailed", "8k", 
  "illustration", "absurdres", "highres",
  "anime style", "genshin impact style", "thick impasto"
];

const NEGATIVE_PROMPT = "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, bad feet";

// 随机抽取辅助函数
function pickRandom<T>(arr: T[], count: number = 1): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function generateFenjuePrompt(): { prompt: string, negative: string } {
  // 组合随机元素生成详细 Prompt
  const subject = pickRandom(SUBJECTS, 1);
  const features = pickRandom(FEATURES, 5); // 增加细节数量
  const clothing = pickRandom(CLOTHING, 3); // 增加服装/状态描述
  const actions = pickRandom(ACTIONS, 1);
  const env = pickRandom(ENVIRONMENT, 1);
  const quality = STYLE_QUALITY; 

  // 构建最终 Prompt 字符串
  const promptParts = [
    ...subject,
    ...features,
    ...clothing,
    ...actions,
    ...env,
    ...quality
  ];

  return {
    prompt: promptParts.join(", "),
    negative: NEGATIVE_PROMPT
  };
}
