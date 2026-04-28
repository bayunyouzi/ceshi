"use client";
import React, { useState, useEffect, useRef } from "react";
import { Copy, RefreshCw, Wand2, Settings, Save, Sparkles, Image as ImageIcon, Shield, ShieldAlert, Users, User, Brain, Video, Heart, X, Trophy } from "lucide-react";

import AuthModal from "./components/AuthModal";
import { tagLibrary } from "../lib/tagLibrary";

function getRandomTags(category: keyof typeof tagLibrary, count: number = 3, securityLevel: 'safe' | 'creative' | 'nsfw' = 'safe') {
  const lib = tagLibrary[category] as any;
  if (!lib) return "";
  let tags: string[] = [];
  if (Array.isArray(lib)) {
    tags = lib;
  } else if (lib && typeof lib === "object") {
    const safeTags = Array.isArray(lib.safe) ? lib.safe : [];
    const creativeTags = Array.isArray(lib.creative) ? lib.creative : [];
    const nsfwTags = Array.isArray(lib.nsfw) ? lib.nsfw : [];
    if (securityLevel === "safe") tags = safeTags;
    if (securityLevel === "creative") tags = [...safeTags, ...creativeTags];
    if (securityLevel === "nsfw") tags = [...safeTags, ...creativeTags, ...nsfwTags];
  }
  if (!Array.isArray(tags) || tags.length === 0) return "";
  const shuffled = [...tags].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).join(", ");
}

export default function Home() {
  const DEFAULT_PROMPT_ENDPOINT = "https://apifree.rensumo.top/";
  const DEFAULT_PROMPT_MODEL = "openai/gpt-oss-20b";
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>({ prompt: "", negative_prompt: "" });
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isAnime, setIsAnime] = useState(true);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isTxt2VideoMode, setIsTxt2VideoMode] = useState(false);
  const [isImg2ImgMode, setIsImg2ImgMode] = useState(false); // 新增图生图模式
  const [uploadedImage, setUploadedImage] = useState<string | null>(null); // 上传图片
  const [img2ImgEffect, setImg2ImgEffect] = useState('random'); // 图生图效果
  const [img2ImgInput, setImg2ImgInput] = useState(""); // 图生图手动需求
  const [isSafeMode, setIsSafeMode] = useState(true);
  const [isUncensoredMode, setIsUncensoredMode] = useState(false); // 新增无限制模式
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [hasTriggeredHold, setHasTriggeredHold] = useState(false);

  const [isDeepThinking, setIsDeepThinking] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [characterCount, setCharacterCount] = useState<'default' | 'solo' | 'duo'>('default');
  
  // 图片生成相关状态
  const [imageLoading, setImageLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState("");
  const [imageMeta, setImageMeta] = useState<{
    displayModel?: string;
    actualModel?: string;
    requestedModel?: string;
    modelChanged?: boolean;
  } | null>(null);

  // GPT-Image-2 模型配置
  const [isGptImage2Mode, setIsGptImage2Mode] = useState(false);
  const GPTIMAGE2_API_ENDPOINT = "https://gpt2.zeabur.app/v1";
  const GPTIMAGE2_API_KEY = "f5f8dc3f65454077b2fd6560";
  const GPTIMAGE2_MODEL_NAME = "gpt-image-2";
  const GPTIMAGE2_DAILY_LIMIT = 50;
  const [gptImage2Remaining, setGptImage2Remaining] = useState(GPTIMAGE2_DAILY_LIMIT);

  const getChinaDateKey = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());
  const [videoLoading, setVideoLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState("");
  const VIDEO_DURATION_SECONDS = 10;
  
  // 默认配置（如果用户不填，就用空的，后端会自动使用默认配置）
  // 1. 提示词生成配置 (Prompt API)
  const [apiKey, setApiKey] = useState("");
  const [apiEndpoint, setApiEndpoint] = useState("");
  const [modelName, setModelName] = useState("");

  // 2. 图片生成配置 (Image API)
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageApiEndpoint, setImageApiEndpoint] = useState("");
  const [imageModelName, setImageModelName] = useState("");

  // Auth & Limits
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSponsor, setShowSponsor] = useState(false);
  const [showSponsorBoard, setShowSponsorBoard] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [guestLimits, setGuestLimits] = useState({ prompt: 10, image: 5, video: 0 });

  const sponsorBoard = [
    { name: "努力生活", amount: "50.00", time: "3月25日 17:53" },
    { name: "老独眼", amount: "10.00", time: "3月24日 21:25" },
    { name: "买课的挺狂呀", amount: "6.66", time: "3月23日 10:29" },
    { name: "买课的挺狂呀", amount: "6.66", time: "3月23日 10:22" },
    { name: "未知", amount: "2.12", time: "3月22日 22:54" },
    { name: "异界链接", amount: "10.00", time: "3月22日 18:13" },
    { name: "M小马杰华A", amount: "1.00", time: "3月22日 09:59" },
    { name: "未知", amount: "5.00", time: "3月22日 01:34" },
    { name: "主打一个安详", amount: "5.00", time: "3月22日 00:59" },
    { name: "M", amount: "1.00", time: "3月21日 11:19" },
    { name: "友人A", amount: "1.00", time: "3月20日 13:46" },
    { name: "sleePWA-lk", amount: "20.00", time: "3月20日 08:55" },
    { name: "Aeroppp", amount: "6.66", time: "3月19日 23:35" },
    { name: "24味", amount: "50.00", time: "3月19日 22:46" },
    { name: "sleePWA-lk", amount: "5.00", time: "3月19日 12:37" },
    { name: "拖地龙的剑", amount: "5.00", time: "3月18日 18:16" },
    { name: "srwooo", amount: "5.00", time: "3月18日 15:35" },
  ];

  const clearHoldTimers = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdProgressTimerRef.current) {
      clearInterval(holdProgressTimerRef.current);
      holdProgressTimerRef.current = null;
    }
  };

  const startHold = () => {
    setIsHolding(true);
    setHasTriggeredHold(false);
    setHoldProgress(0);
    const startTime = Date.now();
    holdProgressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setHoldProgress(Math.min((elapsed / 1500) * 100, 100));
    }, 50);
    holdTimerRef.current = setTimeout(() => {
      setIsSafeMode(false);
      setIsUncensoredMode(true);
      setHasTriggeredHold(true);
      setIsHolding(false);
      setHoldProgress(0);
      clearHoldTimers();
    }, 1500);
  };

  const endHold = () => {
    setIsHolding(false);
    setHoldProgress(0);
    clearHoldTimers();
  };

  const getSettingScope = () => {
    const cachedUser = localStorage.getItem("user_info");
    if (cachedUser) {
      try {
        const parsed = JSON.parse(cachedUser);
        if (parsed?.id) return `user_${parsed.id}`;
      } catch {}
    }
    return "guest";
  };

  const readSetting = (scope: string, key: string) => {
    return localStorage.getItem(`${key}_${scope}`) ?? localStorage.getItem(key) ?? "";
  };

  const getChinaDateKey = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

  useEffect(() => {
    // 加载用户自定义的设置（如果有）
    const scope = getSettingScope();
    const savedKey = readSetting(scope, "creative_api_key");
    const savedEndpoint = readSetting(scope, "creative_api_endpoint");
    const savedModel = readSetting(scope, "creative_model_name");
    
    if (savedKey) setApiKey(savedKey);
    setApiEndpoint(savedEndpoint || "");
    setModelName(savedModel || "");

    // 加载图片生成配置
    const savedImageKey = readSetting(scope, "image_gen_api_key");
    const savedImageEndpoint = readSetting(scope, "image_gen_api_endpoint");
    const savedImageModel = readSetting(scope, "image_gen_model_name");

    if (savedImageKey) setImageApiKey(savedImageKey);
    if (savedImageEndpoint) setImageApiEndpoint(savedImageEndpoint);
    if (savedImageModel) {
      const normalizedImageModel =
        ["gemini-2.5-flash-image", "grok-4.1-image"].includes(savedImageModel)
          ? "grok-imagine-1.0"
          : savedImageModel === "grok-imagine-1.0-video"
            ? "grok-imagine-video"
            : savedImageModel;
      setImageModelName(normalizedImageModel);
      if (normalizedImageModel !== savedImageModel) {
        localStorage.setItem(`image_gen_model_name_${scope}`, normalizedImageModel);
      }
    }

    // 优先从本地缓存恢复用户状态（避免闪烁）
    const cachedToken = localStorage.getItem("auth_token");
    const cachedUser = localStorage.getItem("user_info");
    if (cachedToken && cachedUser) {
      setUser(JSON.parse(cachedUser));
    }

    // 然后再向后端验证 Token 有效性
    const verifyUser = async () => {
      const token = localStorage.getItem("auth_token");
      if (!token) return;

      try {
        const res = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          // 更新最新的用户信息
          setUser(data.user);
          localStorage.setItem("user_info", JSON.stringify(data.user));
        } else {
          // Token 无效或用户不存在（可能是数据库重置了）
          console.warn("Token invalid or user not found, logging out...");
          localStorage.removeItem("auth_token");
          localStorage.removeItem("user_info");
          setUser(null);
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      }
    };
    
    verifyUser();

    // 加载游客使用次数
    const savedPromptCount = localStorage.getItem("guest_prompt_count");
    const savedImageCount = localStorage.getItem("guest_image_count");
    setGuestLimits({
      prompt: savedPromptCount ? parseInt(savedPromptCount) : 10,
      image: savedImageCount ? parseInt(savedImageCount) : 5,
      video: 0
    });

    // 加载 GPT-Image-2 剩余次数
    const savedGptImage2Date = localStorage.getItem("gpt_image2_date");
    const savedGptImage2Count = localStorage.getItem("gpt_image2_count");
    const today = getChinaDateKey();
    if (savedGptImage2Date === today && savedGptImage2Count) {
      setGptImage2Remaining(Math.max(0, parseInt(savedGptImage2Count)));
    } else {
      setGptImage2Remaining(GPTIMAGE2_DAILY_LIMIT);
      localStorage.setItem("gpt_image2_date", today);
      localStorage.setItem("gpt_image2_count", GPTIMAGE2_DAILY_LIMIT.toString());
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");
    setUser(null);
  };

  const checkLimit = (type: 'prompt' | 'image' | 'video') => {
    if (user) {
      if (type !== 'video') return true;
      if (user.isVideoLimitExempt) return true;
      if (typeof user.videoRemainingToday !== "number") return true;
      if (user.videoRemainingToday > 0) return true;
      setError(`今日视频生成次数已用完（上限 ${user.videoDailyLimit || 10} 次）`);
      return false;
    }

    if (type === 'video') {
      setShowAuthModal(true);
      setError("文生视频功能仅限登录用户使用");
      return false;
    }

    if (type === 'prompt') {
      if (guestLimits.prompt > 0) {
        return true;
      }
    } else if (type === 'image') {
      if (guestLimits.image > 0) {
        return true;
      }
    }
    setShowAuthModal(true);
    setError("免费次数已用完，请登录以继续无限使用！");
    return false;
  };

  const deductLimit = (type: 'prompt' | 'image' | 'video') => {
    if (user) return; // Logged in users don't deduct

    if (type === 'prompt') {
      const newCount = Math.max(0, guestLimits.prompt - 1);
      setGuestLimits(prev => ({ ...prev, prompt: newCount }));
      localStorage.setItem("guest_prompt_count", newCount.toString());
    } else if (type === 'image') {
      const newCount = Math.max(0, guestLimits.image - 1);
      setGuestLimits(prev => ({ ...prev, image: newCount }));
      localStorage.setItem("guest_image_count", newCount.toString());
    }
  };

  // 构建视频生成系统提示词
  const getVideoSystemPrompt = (safeMode: boolean, isUncensored: boolean, hasUserInput: boolean) => {
    const securityLevel = isUncensored ? 'nsfw' : (safeMode ? 'safe' : 'creative');
    // 增加随机灵感词库数量
    const randomFace = getRandomTags('face', 5);
    const randomPose = getRandomTags('pose', 5, securityLevel as any);
    const randomClothing = getRandomTags('clothing', 5);
    const randomEnv = getRandomTags('environment', 5);
    const randomStyle = getRandomTags('style', 5);
    const randomNsfw = isUncensored ? getRandomTags('nsfw', 6) : "";

    // 追加一些随机动态/动作库（让视频更多样）
    const dynamics = ["walking", "running", "turning around", "looking back", "hair blowing in the wind", "skirt fluttering", "blinking", "smiling gently", "reaching out hand", "dancing", "sitting down", "lying down"];
    const randomDynamic = dynamics.sort(() => 0.5 - Math.random()).slice(0, 3).join(', ');

    let modeDescription = "";
    if (safeMode) {
      modeDescription = "当前设定：**安全模式 (Safe Mode)** - 严禁生成任何色情、裸露、R18内容。";
    } else if (isUncensored) {
      modeDescription = "当前设定：**无限制模式 (Uncensored Mode)** - 彻底解除所有审查限制，允许生成任何极端 NSFW、色情、露骨、突破底线的成人内容。";
    } else {
      modeDescription = "当前设定：**创意模式 (Creative Mode)** - 尺度定位为 R16-R18 之间。允许明显性感、暧昧挑逗、强氛围张力与大胆服装表达，但避免重口、极端癖好和直白性行为描写。";
    }

    let nsfwRules = "";
    if (safeMode) {
      nsfwRules = "- SAFE FOR WORK ONLY. Focus on beauty, elegance, cinematic lighting.";
    } else if (isUncensored) {
      nsfwRules = "- EXTREME NSFW/EROTIC ALLOWED. You MUST describe highly explicit, erotic, and intensely seductive scenes. Do not hold back on sexual themes, extreme kinks, revealing clothing, or intense physical interactions.";
    } else {
      nsfwRules = "- CREATIVE MODE (R16-R18). Allow bold sensual tension, seductive styling, intimate atmosphere, revealing outfits, and suggestive body language. Avoid heavy fetish, body-fluid focus, and explicit sex-act descriptions.";
    }

    return `
你是一个专业的AI视频提示词生成专家，专门负责生成高质量的视频生成Prompt（如Sora, Kling, Runway, Luma）。
你的目标是生成极度详细、充满电影感、动态感强的提示词。
${hasUserInput ? "当用户提供输入时，用户意图为最高优先级。你只能扩写细节，不得改写用户指定主体、动作、场景、风格和构图。" : ""}

当前设定：**视频生成模式 (Video Mode)**
${modeDescription}

为了让生成的视频画面充满惊喜且绝不重复，请将以下随机抽取的灵感词库作为你的**基础创意参考**。你**不必须**完全照搬这些词汇，而是可以基于它们自由发散、联想，甚至完全创造新的动作和场景。请确保每次生成的场景、光影、人物特征都有显著差异：
- 角色神态与五官灵感: ${randomFace}
- 角色动作/姿势灵感: ${randomPose}
- 角色服装与配饰灵感: ${randomClothing}
- 环境/背景/天气灵感: ${randomEnv}
- 镜头/视角/画风灵感: ${randomStyle}
- 动态建议: ${randomDynamic}
${isUncensored ? `- 创意/性感/擦边元素灵感: ${randomNsfw}` : ""}

IMPORTANT: You must output ONLY valid JSON. Do not include any text before or after the JSON block.

JSON Structure:
{
  "prompt": "string (Detailed Chinese video description)",
  "negative_prompt": "string (English negative tags)"
}

Requirements:
1. **Output Format**: STRICTLY JSON ONLY.
2. **Language**:
   - "prompt" 必须使用 **中文 (Chinese)** 回复。
   - "negative_prompt" 必须使用 **英文 (English)** Tags。
3. **Content Requirements**:
   - **一致性优先**：当用户给出明确要求时，必须保持用户方向，不得擅自改题；仅在用户未指定处补充创意细节。
   - 必须包含详细的镜头语言：例如特写、远景、推拉镜头、仰视、俯视等。
   - 必须包含具体的体型与年龄描述：例如高挑、娇小、成熟女性、年轻女孩等。
   - 必须包含明确的动态描述：例如微风吹拂、转身、特定动作等。
   - **Scale/NSFW**:
     ${nsfwRules}
4. **Style**:
   - Realistic, Photorealistic, High Quality, Masterpiece.

Example Output:
{
  "prompt": "电影质感，仰视特写镜头，一位穿着黑色哥特式长裙的成熟亚洲女性站在古老的城堡走廊里，微风吹拂着她的银色长发，裙摆轻轻飘动。她眼神冷艳地回头看向镜头，嘴角带着一丝神秘的微笑。背景是昏暗的走廊和摇曳的烛光，4k画质，高细节。",
  "negative_prompt": "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, bad feet, distorted, ugly"
}
`;
  };

  // 构建系统提示词
  const getSystemPrompt = (animeMode: boolean, safeMode: boolean, isUncensored: boolean, charCount: 'default' | 'solo' | 'duo', hasUserInput: boolean) => {
    const securityLevel = isUncensored ? 'nsfw' : (safeMode ? 'safe' : 'creative');
    // 提高随机灵感词的数量，增加多样性
    const randomFace = getRandomTags('face', 6);
    const randomHair = getRandomTags('hair', 5);
    const randomPose = getRandomTags('pose', 6, securityLevel as any);
    const randomClothing = getRandomTags('clothing', 6);
    const randomAccessories = getRandomTags('accessories', 5);
    const randomEnv = getRandomTags('environment', 6);
    const randomStyle = getRandomTags('style', 6);
    const randomNsfw = safeMode ? "" : getRandomTags('nsfw', 6);

    // 随机体型、视角等库
    const bodyTypes = ["petite (娇小)", "tall (高挑)", "curvy (丰满)", "slender (苗条)", "mature female (成熟女性)", "young girl (年轻女孩)", "chubby (微胖)"];
    
    // 按照 25% 正面，75% 其他视角（侧面、背面、特殊角度）的比例来生成视角
    const isFrontal = Math.random() < 0.25;
    let randomView = "";
    if (isFrontal) {
      const frontalAngles = ["looking at viewer (看着观众)", "front view (正面)", "looking ahead (直视前方)"];
      randomView = frontalAngles.sort(() => 0.5 - Math.random()).slice(0, 2).join(', ');
    } else {
      const otherAngles = ["from below (仰视)", "from above (俯视)", "from behind (背影)", "side profile (侧颜)", "dutch angle (倾斜镜头)", "looking away (看向别处)", "looking back (回眸)"];
      randomView = otherAngles.sort(() => 0.5 - Math.random()).slice(0, 2).join(', ');
    }
    
    const randomBody = bodyTypes.sort(() => 0.5 - Math.random()).slice(0, 2).join(', ');

    return `
你是一个专业的AI绘画提示词生成专家，专门负责生成Danbooru风格的英文提示词（Tags）。
你的核心任务是：在保证用户意图不被改写的前提下进行高质量扩写，补充细节并提升成片质量。
${hasUserInput ? "当用户给出明确输入时，必须严格沿用用户输入主线，不得另起主题。" : ""}

当前模式：${animeMode ? "**二次元/动漫模式 (Anime Mode)**" : "**写实/真人模式 (Realistic Mode)**"}
${safeMode ? "当前设定：**安全模式 (Safe Mode)** - 严禁生成任何色情、裸露、R18内容。" : (isUncensored ? "当前设定：**无限制模式 (Uncensored Mode)** - 允许强烈成人向与露骨表达。" : "当前设定：**创意模式 (Creative Mode)** - 尺度定位为 R16-R18 之间。允许明显性感、暧昧挑逗、强氛围张力与大胆服装表达，但避免重口、极端癖好和直白性行为描写。")}

为了打破思维定势，请你参考以下为你随机分配的灵感词库。注意：这些词库只是补充灵感，不得覆盖用户明确输入的主体、动作、场景、服装、风格或构图要求。只有在用户未明确指定的细节上才允许扩展。你可以完全跳出词库，自行创造更合适的新词与新构图。要大胆结合以下非常规元素：
- 体型/年龄灵感: ${randomBody}
- 视角/镜头灵感: ${randomView} (强制应用此视角), ${randomStyle}
- 五官/神态灵感: ${randomFace}
- 头发灵感: ${randomHair}
- 动作/姿势灵感: ${randomPose}
- 衣服灵感: ${randomClothing}
- 配饰灵感: ${randomAccessories}
- 环境/背景灵感: ${randomEnv}
${isUncensored ? `- 成人向灵感: ${randomNsfw}` : ""}

IMPORTANT: You must output ONLY valid JSON. Do not include any text, explanations, or "Here is the prompt" before or after the JSON block. Do not use Markdown code blocks. Just the raw JSON.

JSON Structure:
{
  "prompt": "string (comma separated tags)",
  "negative_prompt": "string (comma separated tags)"
}

Requirements:
1. **Output Format**: STRICTLY JSON ONLY. No "Here is the prompt", no markdown code blocks, just the raw JSON object.
2. **Prompt Content**: 
   - "prompt" field must contain ONLY positive tags describing the image.
   - **Creativity**: Keep user intent as highest priority. If user gives explicit requirements, preserve them and only enrich missing details. Do NOT overwrite user-specified subject, pose, scene, style, or composition. You are NOT limited to the provided tag library; invent better tags when needed.
   - **Diversity Constraint**: Avoid overusing repeated food-metaphor terms such as cream, cake, frosting, syrup, chocolate, candy unless user explicitly asks for them.
   - ABSOLUTELY NO negative terms (like "lowres", "bad anatomy", "error", "worst quality", "missing fingers") in the "prompt" field. These belong in "negative_prompt" ONLY.
   - Tags must be comma-separated English words.
3. **Scale/NSFW (Crucial)**:
   ${safeMode
     ? "- SAFE FOR WORK ONLY. No nudity, no NSFW, no sexual content. Focus on beauty, elegance, lighting, and composition."
     : (isUncensored
       ? "- UNCENSORED MODE. Adult and explicit wording is allowed."
       : "- CREATIVE MODE (R16-R18). Allow bold sensual tension, seductive styling, intimate atmosphere, revealing outfits, and suggestive body language. Avoid heavy fetish, body-fluid focus, and explicit sex-act descriptions.")}
4. **Style**:
   ${animeMode 
     ? "- Anime style tags: (anime style, illustration, 2d, flat color, cel shading, genshin impact style)" 
     : "- Realistic style tags: (realistic, photorealistic, 8k, raw photo, dslr, soft lighting, film grain, hyperrealistic, 3d, octane render)\n   - CHARACTER CONSTRAINT: Asian female ONLY (Chinese/Japanese/Korean). NO Western/Caucasian features."}
5. **Details**:
   - High quality tags: (masterpiece, best quality, ultra-detailed, absurdres)
   - Skin tone preference: default to fair/light skin. Avoid dark/tanned skin tags unless user explicitly requests.
   - **Character Count & Gender**:
     ${charCount === 'solo' 
       ? "- STRICTLY 1girl, solo. Focus on a single female character." 
       : charCount === 'duo' 
         ? "- STRICTLY 2girls. Focus on two female characters together. (yuri, coupling if appropriate)." 
         : "- Character count is flexible (1girl or 2girls), but MUST be female characters."}
   - Incorporate the generated body type, age, and view angle explicitly into the tags.

Example Output:
{
  "prompt": "masterpiece, best quality, ${animeMode ? "anime style, illustration" : "realistic, photorealistic"}, ${charCount === 'duo' ? "2girls, yuri" : "1girl, solo"}, ${animeMode ? "fantasy aura, dramatic silhouette" : "asian female, chinese girl"}, mature female, curvy, ${isFrontal ? "looking at viewer, front view" : "from below, side profile"}, long hair, messy hair, blush, confident gaze, ${safeMode ? "elegant white dress, soft lighting" : "fashion-forward styling, cinematic rim light, moody atmosphere"}, dynamic pose, cinematic lighting, absurdres, seductive smile",
  "negative_prompt": "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, bad feet, censored${!animeMode ? ", anime, cartoon, 3d, illustration, western, caucasian, blonde hair, blue eyes" : ", realistic, photorealistic, 3d"}"
}
`;
  };

  useEffect(() => {
    // 加载用户自定义的设置（如果有）
    const scope = getSettingScope();
    const savedKey = readSetting(scope, "creative_api_key");
    const savedEndpoint = readSetting(scope, "creative_api_endpoint");
    const savedModel = readSetting(scope, "creative_model_name");
    
    if (savedKey) setApiKey(savedKey);
    setApiEndpoint(savedEndpoint || "");
    setModelName(savedModel || "");
  }, []);

  const saveSettings = () => {
    const scope = getSettingScope();
    localStorage.setItem(`creative_api_key_${scope}`, apiKey);
    localStorage.setItem(`creative_api_endpoint_${scope}`, apiEndpoint);
    localStorage.setItem(`creative_model_name_${scope}`, modelName);
    localStorage.setItem(`image_gen_api_key_${scope}`, imageApiKey);
    localStorage.setItem(`image_gen_api_endpoint_${scope}`, imageApiEndpoint);
    localStorage.setItem(`image_gen_model_name_${scope}`, imageModelName);

    setShowSettings(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const extractImageUrlFromAny = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "string") {
      const text = value.replace(/\\\//g, "/");
      if (text.startsWith("data:image/")) return text;
      const backtickMatch = text.match(/`(https?:\/\/[^`]+)`/);
      if (backtickMatch) return backtickMatch[1];
      const mdMatch = text.match(/!\[.*?\]\((https?:\/\/[^\)]+)(?:\s+".*?")?\)/);
      if (mdMatch) return mdMatch[1];
      const urlMatch = text.match(/(https?:\/\/[^\s\)"'<]+)/);
      if (urlMatch) return urlMatch[1].replace(/[.,]$/, "");
      const dataUriMatch = text.match(/(data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+)/);
      if (dataUriMatch) return dataUriMatch[1];
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
      if (typeof value.image_url === "string" && value.image_url) return value.image_url;
      if (value.image_url?.url) return value.image_url.url;
      if (typeof value.url === "string" && value.url) return value.url;
      if (typeof value.imageUrl === "string" && value.imageUrl) return value.imageUrl;
      for (const v of Object.values(value)) {
        const found = extractImageUrlFromAny(v);
        if (found) return found;
      }
    }
    return null;
  };

  const extractVideoUrlFromAny = (value: any): string | null => {
    if (!value) return null;
    if (typeof value === "string") {
      const text = value.replace(/\\\//g, "/");
      const mdMatch = text.match(/!\[.*?\]\((https?:\/\/[^\)]+\.mp4(?:\?[^\)]*)?)(?:\s+".*?")?\)/i);
      if (mdMatch) return mdMatch[1];
      const urlMatch = text.match(/(https?:\/\/[^\s\)"'<]+\.mp4(?:\?[^\s\)"'<]+)?)/i);
      if (urlMatch) return urlMatch[1].replace(/[.,]$/, "");
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return extractVideoUrlFromAny(parsed);
        }
      } catch {}
      return null;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = extractVideoUrlFromAny(item);
        if (found) return found;
      }
      return null;
    }
    if (typeof value === "object") {
      if (typeof value.video_url === "string" && value.video_url) return value.video_url;
      if (value.video_url?.url) return value.video_url.url;
      if (typeof value.videoUrl === "string" && value.videoUrl) return value.videoUrl;
      if (typeof value.url === "string" && /\.mp4(\?|$)/i.test(value.url)) return value.url;
      for (const v of Object.values(value)) {
        const found = extractVideoUrlFromAny(v);
        if (found) return found;
      }
    }
    return null;
  };

  const buildDisplayImageSrc = (value: string) => {
    const normalized = value.trim();
    if (!normalized) return "";
    if (normalized.startsWith("data:image/")) return normalized;
    if (/^https?:\/\//i.test(normalized)) {
      return `/api/image-proxy?url=${encodeURIComponent(normalized)}`;
    }
    return normalized;
  };

  const readImageMeta = (value: any) => ({
    displayModel: typeof value?.displayModel === "string" ? value.displayModel : "",
    actualModel: typeof value?.actualModel === "string" ? value.actualModel : "",
    requestedModel: typeof value?.requestedModel === "string" ? value.requestedModel : "",
    modelChanged: Boolean(value?.modelChanged)
  });

  const handleGenerateImage = async (prompt: string) => {
    // 如果没有配置自定义 Image API Key，才进行次数检查
    if (!imageApiKey && !isGptImage2Mode) {
      if (!checkLimit('image')) return;
    }

    // GPT-Image-2 次数检查
    if (isGptImage2Mode) {
      if (gptImage2Remaining <= 0) {
        setError(`GPT-Image-2 今日次数已用完（每天限额 ${GPTIMAGE2_DAILY_LIMIT} 次）`);
        return;
      }
    }

    setImageLoading(true);
    setError("");
    setGeneratedImage("");
    setImageMeta(null);
    
    const controller = new AbortController();
    // GPT-Image-2 响应较慢，增加超时到 180 秒
    const timeoutId = setTimeout(() => controller.abort(), isGptImage2Mode ? 180000 : 60000);
    
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          prompt,
          // 将自定义配置传给后端 (使用图片生成专用的配置)
          apiKey: isGptImage2Mode ? GPTIMAGE2_API_KEY : (imageApiKey || undefined),
          apiEndpoint: isGptImage2Mode ? GPTIMAGE2_API_ENDPOINT : (imageApiEndpoint || undefined),
          modelName: isGptImage2Mode ? GPTIMAGE2_MODEL_NAME : (imageModelName || undefined)
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // GPT-Image-2 专用处理
      if (isGptImage2Mode) {
        const gptImage2Url = extractImageUrlFromAny(data);
        if (gptImage2Url) {
          setGeneratedImage(gptImage2Url);
          setImageMeta({ displayModel: "gpt-image-2" });
          // 扣除 GPT-Image-2 次数
          const newCount = gptImage2Remaining - 1;
          setGptImage2Remaining(newCount);
          localStorage.setItem("gpt_image2_count", newCount.toString());
          return;
        }
        throw new Error("GPT-Image-2 未能返回图片");
      }

      const extractedImage = extractImageUrlFromAny(data);
      if (extractedImage) {
        setGeneratedImage(extractedImage);
        setImageMeta(readImageMeta(data));
        if (!imageApiKey) deductLimit('image');
        return;
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.length > 0) {
        throw new Error(`生成失败，模型未能返回图片链接，仅返回了文本: ${content.substring(0, 100)}...`);
      }

      throw new Error("未能识别图片链接，API 返回格式异常");
      
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(err);
      let errMsg = err.message || "生成图片失败";
      
      if (err.name === 'AbortError') {
        errMsg = isGptImage2Mode 
          ? "⚠️ GPT-Image-2 请求超时：此模型响应较慢，请耐心等待或稍后重试。" 
          : "⚠️ 请求超时：生图接口响应时间过长，请稍后重试。";
      } else if (errMsg.includes("PROHIBITED_CONTENT") || errMsg.includes("prompt_blocked") || errMsg.includes("content-moderated") || errMsg.includes("content_moderated") || errMsg.includes("Moderated")) {
        // 针对 Gemini/Google/Grok 安全拦截的优化提示
        errMsg = "⚠️ 生成失败：您的提示词包含敏感/违规内容，触发了模型的安全审查机制。请尝试开启"安全模式"或修改输入词后再试。";
      }
      
      setError(errMsg);
    } finally {
      setImageLoading(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!imageApiKey) {
      if (!checkLimit('video')) return;
    }

    if (!userInput.trim()) {
      setError("请先输入视频描述");
      return;
    }

    setVideoLoading(true);
    setError("");
    setGeneratedVideo("");
    setGeneratedImage("");
    setImageMeta(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          prompt: userInput.trim(),
          mediaType: "video",
          duration: VIDEO_DURATION_SECONDS
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const extractedVideo = extractVideoUrlFromAny(data);
      if (extractedVideo) {
        setGeneratedVideo(extractedVideo);
        if (user && data.videoQuota) {
          const nextUser = { ...user, ...data.videoQuota };
          setUser(nextUser);
          localStorage.setItem("user_info", JSON.stringify(nextUser));
        } else if (!imageApiKey) {
          deductLimit('video');
        }
        return;
      }

      const content = data?.choices?.[0]?.message?.content;
      const extractedFromText = extractVideoUrlFromAny(content);
      if (extractedFromText) {
        setGeneratedVideo(extractedFromText);
        if (user && data.videoQuota) {
          const nextUser = { ...user, ...data.videoQuota };
          setUser(nextUser);
          localStorage.setItem("user_info", JSON.stringify(nextUser));
        } else if (!imageApiKey) {
          deductLimit('video');
        }
        return;
      }

      throw new Error("未能识别视频链接，API 返回格式异常");
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setError("⚠️ 请求超时：Grok 官方视频接口生成时间较长，请稍后重试。");
      } else {
        setError(err.message || "生成视频失败，请稍后重试");
      }
    } finally {
      setVideoLoading(false);
    }
  };

  const handleImg2ImgSubmit = async () => {
    if (!uploadedImage) {
      setError("请先上传参考图片");
      return;
    }

    // 检查是否配置了生图 API
    if (!imageApiKey && !checkLimit('image')) return;

    setImageLoading(true);
    setError("");
    setGeneratedImage("");
    setImageMeta(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000); // 图生图给90秒超时

    try {
      let promptInstruction = "";
      switch (img2ImgEffect) {
        case 'figure': 
          promptInstruction = `Your primary mission is to convert the subject from the user's photo into a **photorealistic, ultra-high-resolution miniature model**, displayed in a realistic studio/workshop setting. The result must be **pin-sharp, crystal clear, and professional-grade**, with **no blur, no distortion, and no random changes in pose**.

**Core Directive: Subject Analysis & Priority Assignment (CRITICAL FIRST STEP)**
1. Identify the subject of the image.
2. Apply the correct rule set:

* **RULE SET A - Person, creature, or animal:**
   - **If a face is visible:** Prioritize **Character Fidelity and Sharp Likeness**.
   - **If NO face is visible (e.g., back view):** Prioritize **Pose and Form Fidelity**.
     ⚠️ **Do NOT invent or fabricate a face**. Preserve the exact pose of the subject in the input photo.

* **RULE SET B - Vehicle:** Ensure perfect **Form, Proportions, Surface Finish, and Key Details** with **ultra-sharp clarity**.

* **RULE SET C - Building/structure:** Ensure **Architectural Integrity** with clear **geometry, materials, and fine details**, all rendered in **sharp focus**.

**Scene Composition (Strictly follow these details):**
1. **The Model:** The miniature model on a desk or workshop table, rendered in **ultra-sharp detail**, faithfully matching the input subject's **pose and proportions**.
2. **Computer Monitor:** In the background, a monitor displays relevant 3D modeling software, showing the same subject. The screen must be **readable, crisp, not blurry**.
3. **Environment:** A realistic, well-lit studio or office desk, with details like tools or keyboards, rendered in **professional product photography clarity**.`; 
          break;
        case 'figure_box':
          promptInstruction = `Your primary mission is to convert the subject from the user's photo into a **photorealistic, ultra-high-resolution miniature figure**, presented in its commercial packaging.
The result must be **sharp, crystal-clear, and professional product photography quality**, with **no blurriness or distortion**.

**Core Directive: Subject Analysis & Priority Assignment (CRITICAL FIRST STEP)**
1. Identify the subject of the image.
2. Apply the correct rule set:

* **RULE SET A - Person, creature, or animal:**
   - **If a face is visible:** Your top priority is **Likeness**. Render the face in sharp detail, with accurate proportions.
   - **If NO face is visible (e.g., back view):** Your top priority is **Pose and Form Fidelity**. **Do NOT invent or add a face** ⁃ faithfully preserve the back-view pose from the source photo.

* **RULE SET B - Vehicle:** Prioritize exact **Form, Proportions, Surface Finish, and Key Details**.

* **RULE SET C - Building/structure:** Prioritize **Architectural Integrity** (geometry, materials, fine details).

**Scene Details:**
1. **The Model:** The miniature figure must be **highly detailed, sharp, and exactly match the pose from the input photo**.
2. **The Base:** A clean, simple display base.
3. **The Packaging:** Behind the model, show a collector's style box featuring the subject.
4. **Environment:** A professional, well-lit indoor studio setting, **sharp focus, no blur, no noise**.`;
          break;
        case 'cosplay': 
          promptInstruction = `Generate a highly detailed photo of a human cosplaying this illustration, at Comiket. Exactly replicate the same pose, body posture, hand gestures, facial expression, and camera framing as in the original illustration. Keep the same angle, perspective, and composition, without any deviation`; 
          break;
        case 'cosplay_selfie':
          promptInstruction = `Create a cosplay selfie version from the reference character. Keep identity locked: same face traits, hair, outfit and colors. Front camera selfie composition, arm-length perspective, realistic skin texture, indoor ambient light, slight phone camera grain, high detail. Return image only.`;
          break;
        case 'real': 
          promptInstruction = `Convert the reference character to an ultra-realistic, highly detailed photorealistic style while strictly preserving identity. Keep the exact same face geometry, same hairstyle, same costume details, same pose and camera framing as the original image. Realistic skin texture, natural lighting, subtle film grain, sharp and believable, no cartoon style. DO NOT change the subject's pose or clothing.`; 
          break;
        case 'anime': 
          promptInstruction = `Redraw the reference image into clean 2D anime style while strictly preserving identity and composition. Keep exact same face shape, same eye style, same hairstyle, same costume pattern and color, same pose and camera angle. Crisp lineart, cel shading, vibrant but controlled colors, masterpiece, high detail. DO NOT change the subject's pose or clothing.`; 
          break;
        case 'chibi':
          promptInstruction = `Convert the reference character into chibi style. Keep recognizable identity cues: hairstyle, eye color, costume palette, signature accessories. 1:2 head-to-body ratio, cute proportions, clean lines, soft shading, simple background, high clarity. Return image only.`;
          break;
        case 'sticker':
          promptInstruction = `Convert the reference character into a sticker illustration. Keep identity locked and outfit recognizable. Bold clean outline, transparent or simple plain background, centered composition, high contrast colors, printable quality. Return image only.`;
          break;
        case 'first_person':
          promptInstruction = `Generate a first-person perspective scene featuring the reference character. Keep the character identity, face traits, hairstyle and outfit consistent with reference. Cinematic POV composition, realistic depth and lighting, high detail. Return image only.`;
          break;
        case 'turnaround':
          promptInstruction = `Create a three-view turnaround of the reference character (front, side, back) in one image. Keep identity and costume details fully consistent across all three views. Clean neutral background, design-sheet style, high detail, no text. Return image only.`;
          break;
        case 'storyboard':
          promptInstruction = `Create a 4-panel storyboard based on the reference character. Keep identity, outfit and hairstyle consistent in every panel. Panels should show coherent action progression with varied camera shots. Clean comic layout, no text bubbles, high detail. Return image only.`;
          break;
        case 'random': 
        default:
          promptInstruction = `Generate a new creative image based on the reference while preserving core identity: same face features, hairstyle, outfit style and color family. Allow creative scene and lighting variation, but keep character recognizability high. Return image only.`; 
          break;
      }
      
      if (img2ImgInput && img2ImgInput.trim()) {
        promptInstruction += `\n\nUser Additional Request: ${img2ImgInput}`;
      }

      const token = localStorage.getItem("auth_token");
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          prompt: promptInstruction,
          image_url: uploadedImage,
          apiKey: imageApiKey || undefined,
          apiEndpoint: imageApiEndpoint || undefined,
          modelName: imageModelName || "grok-imagine-1.0"
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      const extractedImage = extractImageUrlFromAny(data);
      if (extractedImage) {
        setGeneratedImage(extractedImage);
        setImageMeta(readImageMeta(data));
        if (!imageApiKey) deductLimit('image');
        return;
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.length > 0) {
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 90000);

        const retryToken = localStorage.getItem("auth_token");
        const retryResponse = await fetch("/api/generate-image", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(retryToken ? { "Authorization": `Bearer ${retryToken}` } : {})
          },
          body: JSON.stringify({
            prompt: `Generate one image only. Keep character identity strictly consistent with the reference image: same face, hairstyle, outfit, body proportions, pose and camera framing. Do not drift style away from reference. Use this recovered guidance as secondary hint: ${content}. Original transformation request: ${promptInstruction}`,
            image_url: uploadedImage,
            apiKey: imageApiKey || undefined,
            apiEndpoint: imageApiEndpoint || undefined,
            modelName: imageModelName || "grok-imagine-1.0"
          }),
          signal: retryController.signal
        });
        clearTimeout(retryTimeoutId);
        const retryData = await retryResponse.json();
        const retryImage = extractImageUrlFromAny(retryData);
        if (retryImage) {
          setGeneratedImage(retryImage);
          setImageMeta(readImageMeta(retryData));
          if (!imageApiKey) deductLimit('image');
          return;
        }
        throw new Error(`生成失败，模型未能返回图片链接，仅返回了文本: ${content.substring(0, 100)}...`);
      }
      
      throw new Error("未能识别图片链接，API 返回格式异常");

    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError("⚠️ 请求超时：图像处理时间过长，请稍后重试。");
      } else if (err.message?.includes('content-moderated')) {
        setError("⚠️ 生成失败：内容触发了严格的安全审查。请尝试：1. 开启'安全模式'；2. 减少提示词中的敏感部位描述；3. 换一个更保守的模型。");
      } else {
        setError(err.message || "生成图片失败，请稍后重试");
      }
    } finally {
      setImageLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!checkLimit('prompt')) return;

    // 即使没有 API Key，现在也可以提交请求，因为后端有默认 Key
    setLoading(true);
    setCopied("");
    setError("");
    setGeneratedImage(""); // 清除之前的图片
    setImageMeta(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
    const useCustomPromptConfig = Boolean(apiKey || apiEndpoint || modelName);

    // 硬扛方案：前端直连默认配置
    const FALLBACK_ENDPOINT = "https://apifree.rensumo.top/v1/chat/completions";
    const FALLBACK_KEY = "sk-4SY28cVkJZKAckHGavYlJGyF9SfuFCs7dpbJGbBYEREtG8Oe";
    const FALLBACK_MODEL = isVideoMode ? "grok-3" : "openai/gpt-oss-120b";
    
    const finalEndpoint = apiEndpoint || FALLBACK_ENDPOINT;
    const finalApiKey = apiKey || FALLBACK_KEY;
    const finalModel = modelName || FALLBACK_MODEL;

    try {
      const isUncensored = isUncensoredMode && !isSafeMode;
      const hasUserInput = Boolean(userInput && userInput.trim());
      const systemPrompt = isVideoMode 
        ? getVideoSystemPrompt(isSafeMode, isUncensored, hasUserInput)
        : getSystemPrompt(isAnime, isSafeMode, isUncensored, characterCount, hasUserInput);

      // 改为前端直接发请求，利用用户的家用 IP 绕过 Cloudflare
      const response = await fetch(finalEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${finalApiKey}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8"
        },
        body: JSON.stringify({
          model: finalModel,
          temperature: isDeepThinking ? undefined : 0.8,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userInput
                ? `Based on the following user input, expand it into a highly detailed ${isVideoMode ? "video" : "art"} prompt following the system rules. Strictly preserve the user's core intent, subject, action, scene, style, and composition. Do not replace user requirements with your own ideas. Only add missing details to improve quality and clarity. Keep the tone ${isSafeMode ? "elegant and safe" : (isUncensored ? "explicitly erotic and NSFW" : "boldly sensual, suggestive, and cinematic (R16-R18)")} without changing user intent. You are not limited to any fixed library and should avoid repetitive food-metaphor tags unless the user requests them. User Input: "${userInput}"`
                : `Generate a new, unique, and extremely detailed high-scale ${isVideoMode ? "video" : (isAnime ? "anime" : "realistic")} prompt. ${isSafeMode ? "Make it beautiful, elegant, and safe for work." : (isUncensored ? "Make it highly explicit, erotic, and NSFW. Push the boundaries of seduction and sexual tension. Include tags for extreme revealing clothing, highly suggestive poses, ahegao, body fluids, or even nudity if it fits the fantasy. Surprise me with extreme adult concepts." : "Make it creative with R16-R18 intensity: seductive, bold, and suggestive, with strong tension and atmosphere; avoid heavy fetish, gore, and explicit sex-act descriptions, and avoid repetitive cream/cake-style metaphors.")}`
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errData;
        try {
          errData = await response.json();
        } catch {
          errData = { error: await response.text() };
        }
        throw new Error(errData.error?.message || errData.error || `API 请求失败: ${response.status}`);
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content || "";
      
      // 增强的 JSON 提取逻辑：只提取第一个 {} 包裹的内容
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const cleanJson = jsonMatch ? jsonMatch[0] : (content ? content.replace(/```json/g, "").replace(/```/g, "").trim() : "");
      
      try {
        const promptData = JSON.parse(cleanJson);
        
        // 二次清洗：确保 prompt 中不包含 negative 关键词
        let cleanPrompt = promptData.prompt;
        const negativeKeywords = ["negative_prompt", "lowres", "bad anatomy", "error", "worst quality", "low quality", "normal quality", "jpeg artifacts", "signature", "watermark", "username", "blurry"];
        
        // 简单过滤掉明显的 negative 字段泄漏（如果 AI 把 key 也生成进去了）
        cleanPrompt = cleanPrompt.replace(/"?negative_prompt"?:?.*$/i, ""); 
        
        setResult({
          prompt: cleanPrompt,
          negative_prompt: promptData.negative_prompt,
          recommended_settings: {
            steps: 28,
            cfg_scale: 7,
            sampler: "Euler a",
            width: 832,
            height: 1216,
            model: isAnime ? "Pony Diffusion V6 XL (推荐)" : "Juggernaut XL / RealVisXL (推荐)"
          }
        });
        deductLimit('prompt'); // 成功后扣除次数
      } catch (e) {
        console.error("JSON 解析错误:", e);
        console.warn("Raw content causing error:", cleanJson);

        // Fallback Strategy 1: Regex Extraction (Targeting "key": "value")
        let promptMatch = cleanJson.match(/"prompt"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        let negativeMatch = cleanJson.match(/"negative_prompt"\s*:\s*"((?:[^"\\]|\\.)*)"/);

        // Fallback Strategy 2: Substring Extraction (More robust against broken quotes)
        // If Regex failed, try to manually find the content between known keys
        if (!promptMatch || !negativeMatch) {
            const pKeyIndex = cleanJson.indexOf('"prompt"');
            const nKeyIndex = cleanJson.indexOf('"negative_prompt"');
            
            if (pKeyIndex !== -1 && nKeyIndex !== -1) {
                // Try to find the start of the prompt value (after the colon)
                const pColonIndex = cleanJson.indexOf(':', pKeyIndex);
                if (pColonIndex !== -1 && pColonIndex < nKeyIndex) {
                    // Extract everything between prompt's colon and negative_prompt's key
                    // This is "dirty" but works if the internal quotes are broken
                    let rawPrompt = cleanJson.substring(pColonIndex + 1, nKeyIndex).trim();
                    // Clean up trailing comma
                    if (rawPrompt.endsWith(',')) rawPrompt = rawPrompt.slice(0, -1).trim();
                    // Clean up wrapping quotes
                    if (rawPrompt.startsWith('"') && rawPrompt.endsWith('"')) {
                        rawPrompt = rawPrompt.slice(1, -1);
                    }
                    // Construct a fake match object
                    promptMatch = [rawPrompt, rawPrompt];
                }

                const nColonIndex = cleanJson.indexOf(':', nKeyIndex);
                if (nColonIndex !== -1) {
                    let rawNegative = cleanJson.substring(nColonIndex + 1).trim();
                     // Clean up trailing brace
                    const lastBrace = rawNegative.lastIndexOf('}');
                    if (lastBrace !== -1) rawNegative = rawNegative.substring(0, lastBrace).trim();
                    // Clean up wrapping quotes
                    if (rawNegative.startsWith('"') && rawNegative.endsWith('"')) {
                        rawNegative = rawNegative.slice(1, -1);
                    }
                    negativeMatch = [rawNegative, rawNegative];
                }
            }
        }

        if (promptMatch && negativeMatch) {
         setResult({
          prompt: promptMatch[1],
          negative_prompt: negativeMatch[1],
          recommended_settings: {
            steps: 28,
            cfg_scale: 7,
            sampler: "Euler a",
            width: 832,
            height: 1216,
            model: isAnime ? "Pony Diffusion V6 XL (推荐)" : "Juggernaut XL / RealVisXL (推荐)"
          }
        });
        // 成功救回，不报错
        setError(""); 
        deductLimit('prompt'); // 成功后扣除次数
      } else {
          // 如果正则也提取不到，再显示错误
          setResult({
            prompt: "生成格式有误，请重试...", 
            negative_prompt: "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry",
            recommended_settings: { steps: 28, cfg_scale: 7 }
          });
          setError("AI 返回格式异常，请重试");
        }
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      let errorMsg = err.message || "连接服务器失败";
      if (err.name === 'AbortError') {
        errorMsg = "⚠️ 请求超时：AI 响应时间过长，请稍后重试。";
      } else if (errorMsg.includes("Failed to fetch")) {
        errorMsg = isVideoMode
          ? "⚠️ 视频提示词接口连接失败，已切回 grok-3 默认模型，请重试。"
          : "⚠️ 接口连接失败，请检查网络或稍后重试。";
      } else if (errorMsg.includes("content-moderated") || errorMsg.includes("moderation")) {
        errorMsg = "⚠️ 触发了 AI 安全审查机制。创意模式下生成大尺度内容有概率被拦截，请稍后再试或微调输入词。";
      }
      setError(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(""), 2000);
  };

  const generatedImagePreviewSrc = generatedImage ? buildDisplayImageSrc(generatedImage) : "";

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 font-sans selection:bg-indigo-500/30 overflow-hidden relative pb-20">
      {/* Dynamic Background */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/20 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-rose-900/10 blur-[120px] pointer-events-none mix-blend-screen" />
      <div className="absolute top-0 left-0 w-full h-full bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-16 md:mb-24 bg-white/[0.02] border border-white/[0.05] rounded-2xl px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-black tracking-wider text-sm sm:text-base bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">PROMPT.STUDIO</h1>
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest hidden sm:block">中文创意提示词工作台</p>
            </div>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-4">
            <a 
              href="https://qm.qq.com/q/Q982XX0UAo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-900/50 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white rounded-xl text-xs font-medium transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.984 0A12 12 0 0 0 0 12c0 2.057.534 4.024 1.488 5.753l-1.077 3.993a.5.5 0 0 0 .61.61l3.993-1.077A11.944 11.944 0 0 0 11.984 24c6.627 0 12-5.373 12-12s-5.373-12-12-12zM7.5 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
              </svg>
              交流群
            </a>
            <button
              onClick={() => setShowSponsorBoard(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-xl transition-all"
              title="赞赏榜"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-bold">赞赏榜</span>
            </button>
            <button 
              onClick={() => setShowSponsor(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all"
              title="赞助支持"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span className="hidden sm:inline text-xs font-bold">给点？</span>
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="API 设置"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            <div className="hidden sm:block w-px h-6 bg-white/10 mx-1"></div>

            {user ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-all border border-rose-500/20"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{user.email.split('@')[0]}</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-2 sm:px-5 py-2 bg-white text-black hover:bg-zinc-200 rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">登录 / 注册</span>
              </button>
            )}
          </div>
        </header>

        {/* Hero Typography */}
        <div className="text-center mb-16 space-y-6">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-500 drop-shadow-2xl">
            让灵感 <br className="md:hidden" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400">直接出图</span>
          </h2>
          <p className="text-zinc-400 max-w-2xl mx-auto text-base md:text-lg font-light tracking-wide">
            突破想象边界。专业的二次元、写实及视频 AI 提示词生成与图生图引擎。
          </p>
          
          {!user && (
            <div className="flex flex-wrap justify-center gap-3 text-xs font-mono text-zinc-500 mt-4">
              <span className={`px-4 py-2 rounded-xl border bg-black/40 backdrop-blur-sm ${guestLimits.prompt > 0 ? 'border-indigo-500/30 text-indigo-400' : 'border-rose-500/30 text-rose-500'}`}>
                免费提示词：{guestLimits.prompt}
              </span>
              <span className={`px-4 py-2 rounded-xl border bg-black/40 backdrop-blur-sm ${guestLimits.image > 0 ? 'border-indigo-500/30 text-indigo-400' : 'border-rose-500/30 text-rose-500'}`}>
                免费生图：{guestLimits.image}
              </span>
              <span className={`px-4 py-2 rounded-xl border bg-black/40 backdrop-blur-sm ${gptImage2Remaining > 0 ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-500'}`}>
                GPT-Image-2：{gptImage2Remaining}/50
              </span>
              <span className="px-4 py-2 rounded-xl border bg-black/40 backdrop-blur-sm border-amber-500/30 text-amber-300">
                文生视频：登录后可用
              </span>
            </div>
          )}
          {user && (
            <div className="flex flex-wrap justify-center gap-3 text-xs font-mono text-zinc-500 mt-4">
              <span className={`px-4 py-2 rounded-xl border bg-black/40 backdrop-blur-sm ${user.isVideoLimitExempt ? 'border-emerald-500/30 text-emerald-400' : ((user.videoRemainingToday ?? 0) > 0 ? 'border-cyan-500/30 text-cyan-400' : 'border-rose-500/30 text-rose-500')}`}>
                {user.isVideoLimitExempt ? '视频额度：无限制' : `今日视频剩余：${user.videoRemainingToday ?? 0}/${user.videoDailyLimit ?? 10}`}
              </span>
            </div>
          )}
        </div>

        {/* Auth Modal (kept from original) */}
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
          onLoginSuccess={(token, userData) => {
            setUser(userData);
          }}
        />

        {/* Settings Panel */}
        {showSettings && (
          <div className="w-full bg-zinc-900/60 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 md:p-10 mb-12 shadow-2xl animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>
            <div className="grid md:grid-cols-2 gap-10">
              {/* Prompt API */}
              <div className="space-y-5">
                <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
                  <Wand2 className="w-5 h-5" /> 提示词接口配置
                </h3>
                <p className="text-xs text-zinc-500">用于生成高质量的英文 Prompt。默认使用内置高速通道。</p>
                <div className="space-y-3">
                  <input type="text" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} placeholder="自定义接口地址（留空使用内置）" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-colors" />
                  <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="自定义模型名称（留空使用内置）" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-colors" />
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="自定义密钥（留空使用内置）" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-colors" />
                </div>
              </div>
              {/* Image API */}
              <div className="space-y-5">
                <h3 className="text-lg font-bold flex items-center gap-2 text-rose-400">
                  <ImageIcon className="w-5 h-5" /> 生图接口配置
                </h3>
                <p className="text-xs text-zinc-500">用于实际生成图片。<span className="text-rose-400">填入自定义 Key 解除限制。</span></p>
                <div className="space-y-3">
                  <input type="text" value={imageApiEndpoint} onChange={(e) => setImageApiEndpoint(e.target.value)} placeholder="接口地址（如 https://api...）" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-rose-500 outline-none transition-colors" />
                  <input type="text" value={imageModelName} onChange={(e) => setImageModelName(e.target.value)} placeholder="模型名称（如 dall-e-3）" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-rose-500 outline-none transition-colors" />
                  <input type="password" value={imageApiKey} onChange={(e) => setImageApiKey(e.target.value)} placeholder="密钥（sk-...）" className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-sm focus:border-rose-500 outline-none transition-colors" />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={saveSettings} className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-xl font-bold transition-all hover:scale-95">
                <Save className="w-4 h-4" /> 保存配置
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace - Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: Mode Selector */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-5 backdrop-blur-xl shadow-2xl">
              <h3 className="text-xs font-mono text-zinc-500 mb-4 px-2 tracking-widest uppercase">工作模式 / Mode</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setIsAnime(true); setIsVideoMode(false); setIsTxt2VideoMode(false); setIsImg2ImgMode(false); }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isAnime && !isVideoMode && !isTxt2VideoMode && !isImg2ImgMode ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'hover:bg-white/5 text-zinc-400 border border-transparent'}`}
                >
                  <div className="flex items-center gap-3"><Sparkles className="w-4 h-4" /><span className="font-bold text-sm tracking-wide">二次元动漫</span></div>
                  {isAnime && !isVideoMode && !isTxt2VideoMode && !isImg2ImgMode && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />}
                </button>
                <button
                  onClick={() => { setIsAnime(false); setIsVideoMode(false); setIsTxt2VideoMode(false); setIsImg2ImgMode(false); }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${!isAnime && !isVideoMode && !isTxt2VideoMode && !isImg2ImgMode ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'hover:bg-white/5 text-zinc-400 border border-transparent'}`}
                >
                  <div className="flex items-center gap-3"><ImageIcon className="w-4 h-4" /><span className="font-bold text-sm tracking-wide">写实摄影</span></div>
                  {!isAnime && !isVideoMode && !isTxt2VideoMode && !isImg2ImgMode && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />}
                </button>
                <button
                  onClick={() => { setIsVideoMode(true); setIsTxt2VideoMode(false); setIsDeepThinking(false); setIsImg2ImgMode(false); }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isVideoMode && !isTxt2VideoMode && !isImg2ImgMode ? 'bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'hover:bg-white/5 text-zinc-400 border border-transparent'}`}
                >
                  <div className="flex items-center gap-3"><Video className="w-4 h-4" /><span className="font-bold text-sm tracking-wide">视频提示词</span></div>
                  {isVideoMode && !isTxt2VideoMode && !isImg2ImgMode && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,1)]" />}
                </button>
                <button
                  onClick={() => { setIsTxt2VideoMode(true); setIsVideoMode(false); setIsImg2ImgMode(false); }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isTxt2VideoMode ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'hover:bg-white/5 text-zinc-400 border border-transparent'}`}
                >
                  <div className="flex items-center gap-3"><Video className="w-4 h-4" /><span className="font-bold text-sm tracking-wide">文生视频</span></div>
                  {isTxt2VideoMode && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]" />}
                </button>
                <button
                  onClick={() => { setIsImg2ImgMode(true); setIsVideoMode(false); setIsTxt2VideoMode(false); setIsAnime(false); }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isImg2ImgMode ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'hover:bg-white/5 text-zinc-400 border border-transparent'}`}
                >
                  <div className="flex items-center gap-3"><ImageIcon className="w-4 h-4" /><span className="font-bold text-sm tracking-wide">AI 图生图</span></div>
                  {isImg2ImgMode && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]" />}
                </button>
              </div>
            </div>

            {/* Sub-controls (Safe mode, Characters) */}
            {!isImg2ImgMode && (
              <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-5 backdrop-blur-xl space-y-5 shadow-2xl">
                <h3 className="text-xs font-mono text-zinc-500 px-2 tracking-widest uppercase">参数设置 / Settings</h3>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      if (hasTriggeredHold) {
                        setHasTriggeredHold(false);
                        return;
                      }
                      if (!isSafeMode && isUncensoredMode) {
                        setIsSafeMode(true);
                        setIsUncensoredMode(false);
                      } else if (isSafeMode) {
                        setIsSafeMode(false);
                      } else {
                        setIsSafeMode(true);
                      }
                    }}
                    onMouseDown={() => {
                      startHold();
                    }}
                    onMouseUp={() => {
                      endHold();
                    }}
                    onMouseLeave={() => {
                      endHold();
                    }}
                    onTouchStart={() => {
                      startHold();
                    }}
                    onTouchEnd={() => {
                      endHold();
                    }}
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-all border select-none relative overflow-hidden ${isSafeMode ? "bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10" : (isUncensoredMode ? "bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] animate-pulse" : "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]")}`}
                  >
                    {/* 长按进度条 */}
                    {isHolding && !isUncensoredMode && (
                      <div 
                        className="absolute left-0 bottom-0 h-1 bg-purple-500 transition-all duration-75 ease-linear"
                        style={{ width: `${holdProgress}%` }}
                      />
                    )}
                    
                    <div className={`flex items-center gap-2 relative z-10 ${isHolding && !isUncensoredMode ? 'scale-95' : 'scale-100'} transition-transform`}>
                      {isSafeMode ? <Shield className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
                      {isSafeMode ? "安全模式: 开启" : (isUncensoredMode ? "无限制模式: 开启" : "创意模式: 解锁")}
                    </div>
                  </button>
                  <button
                    onClick={() => setIsDeepThinking(!isDeepThinking)}
                    disabled={isVideoMode || isTxt2VideoMode}
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-all border ${isDeepThinking || isVideoMode || isTxt2VideoMode ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-white/5 border-white/10 text-zinc-500 hover:bg-white/10 hover:text-zinc-300"}`}
                  >
                    <Brain className="w-4 h-4" />
                    {isVideoMode ? "视频提示词: 固定 grok-3" : (isTxt2VideoMode ? "文生视频: 不适用" : (isDeepThinking ? "深度思考: 开启" : "深度思考: 关闭"))}
                  </button>
                </div>
                
                {!isSafeMode && isUncensoredMode && (
                  <div className="border rounded-xl p-3 bg-purple-500/10 border-purple-500/20">
                    <p className="text-[10px] text-center leading-relaxed font-mono text-purple-400/90 font-bold">
                      ⚠️ 无限制模式已开启。已解除所有审查，生成内容将包含极端 NSFW 元素。
                    </p>
                  </div>
                )}

                {!isVideoMode && !isTxt2VideoMode && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-mono text-zinc-500 px-2 tracking-widest uppercase block">角色数量 / Characters</label>
                    <div className="bg-black/50 p-1.5 rounded-xl flex gap-1 border border-white/5">
                      {[
                        { id: 'default', label: '随机' },
                        { id: 'solo', label: '单人' },
                        { id: 'duo', label: '双人' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => setCharacterCount(type.id as any)}
                          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1.5 ${characterCount === type.id ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"}`}
                        >
                          {type.id === 'solo' && <User className="w-3 h-3" />}
                          {type.id === 'duo' && <Users className="w-3 h-3" />}
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Middle Column: Input & Prompt Results */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col relative z-10">
              
              {!isImg2ImgMode ? (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs font-mono text-zinc-400 mb-3 block tracking-widest flex items-center gap-2">
                      <Sparkles className={`w-3.5 h-3.5 ${isTxt2VideoMode ? "text-cyan-400" : "text-indigo-400"}`} /> {isTxt2VideoMode ? "视频描述 / Text to Video" : "创意描述 / 中文扩写"}
                    </label>
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={isTxt2VideoMode ? "描述你想要的视频，例如：雨夜赛博朋克街头，镜头缓慢推进，少女转身看向镜头..." : "描述你想要的画面，例如：一个赛博朋克风格的少女站在霓虹街头，雨水打湿了她的衣服..."}
                      className={`w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-sm text-zinc-200 placeholder-zinc-700 outline-none transition-all resize-none h-40 shadow-inner ${isTxt2VideoMode ? "focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50" : "focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"}`}
                    />
                  </div>
                  <button
                    onClick={isTxt2VideoMode ? handleGenerateVideo : handleGenerate}
                    disabled={isTxt2VideoMode ? videoLoading : loading}
                    className={`w-full py-4 rounded-2xl text-sm md:text-base font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group ${(isTxt2VideoMode ? videoLoading : loading) ? "bg-zinc-800 text-zinc-500 cursor-wait" : (isTxt2VideoMode ? "bg-cyan-500 text-white hover:bg-cyan-400 hover:scale-[0.98] shadow-[0_0_30px_rgba(34,211,238,0.25)]" : "bg-white text-black hover:bg-zinc-200 hover:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.15)]")}`}
                  >
                    {(isTxt2VideoMode ? videoLoading : loading) ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    {isTxt2VideoMode ? (videoLoading ? "视频生成中..." : `开始生成视频 (${VIDEO_DURATION_SECONDS}s)`) : (loading ? "灵感生成中..." : "生成提示词")}
                  </button>

                  {/* GPT-Image-2 一键切换按钮 - 移到这里更显眼 */}
                  {!isTxt2VideoMode && !isImg2ImgMode && (
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setIsGptImage2Mode(!isGptImage2Mode);
                          setError("");
                        }}
                        className={`w-full py-3 rounded-2xl font-bold text-sm tracking-widest transition-all duration-300 flex justify-center items-center gap-3 relative overflow-hidden ${isGptImage2Mode ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]" : "bg-emerald-500/10 border-2 border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400"}`}
                      >
                        <Sparkles className="w-4 h-4" />
                        {isGptImage2Mode ? (
                          <>GPT-Image-2 已启用 · 剩余 {gptImage2Remaining}/50 次 · 点击关闭</>
                        ) : (
                          <>✨ 切换 GPT-Image-2 模型（每天 50 次免费）</>
                        )}
                      </button>
                      {isGptImage2Mode && (
                        <p className="text-[10px] text-center text-amber-400/80 mt-2 font-mono">
                          ⚠️ 此模型响应较慢，请耐心等待（最长 3 分钟）
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-in fade-in">
                  <div>
                    <label className="text-xs font-mono text-zinc-400 mb-3 block tracking-widest flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-rose-400" /> 上传参考图
                    </label>
                    <div className="w-full h-56 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center bg-black/20 hover:bg-black/40 hover:border-rose-500/50 transition-all duration-300 relative overflow-hidden group">
                      {uploadedImage ? (
                        <>
                          <img src={uploadedImage} alt="Uploaded" className="h-full w-full object-contain z-10" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex items-center justify-center backdrop-blur-sm">
                            <p className="text-white font-bold tracking-widest border border-white/20 px-6 py-3 rounded-xl bg-white/5 flex items-center gap-2">
                              <RefreshCw className="w-4 h-4" /> 替换图片
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center text-zinc-500 group-hover:text-rose-400 transition-colors">
                          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            <ImageIcon className="w-6 h-6 opacity-70" />
                          </div>
                          <p className="text-sm font-bold tracking-widest">点击或拖拽上传图片</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-30" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-zinc-400 mb-3 block tracking-widest">转换效果 / Style</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {[
                        { id: 'figure', label: '手办化' }, { id: 'figure_box', label: '盒装手办' },
                        { id: 'cosplay', label: 'COS化' }, { id: 'cosplay_selfie', label: 'COS自拍' },
                        { id: 'real', label: '真人化' }, { id: 'anime', label: '动漫化' },
                        { id: 'chibi', label: 'Q版化' }, { id: 'sticker', label: '贴纸化' },
                        { id: 'first_person', label: '第一视角' }, { id: 'turnaround', label: '三视图' },
                        { id: 'storyboard', label: '分镜化' }, { id: 'random', label: '随机变异' },
                      ].map((effect) => (
                        <button
                          key={effect.id}
                          onClick={() => setImg2ImgEffect(effect.id)}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${img2ImgEffect === effect.id ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]" : "bg-black/40 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-white/10"}`}
                        >
                          {effect.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-zinc-400 mb-3 block tracking-widest">额外指令 / Optional</label>
                    <textarea
                      value={img2ImgInput}
                      onChange={(e) => setImg2ImgInput(e.target.value)}
                      placeholder="例如：换成红色的头发，背景变成赛博朋克城市..."
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-sm text-zinc-300 placeholder-zinc-700 focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition-all resize-none h-24 shadow-inner"
                    />
                  </div>

                  <button
                    onClick={handleImg2ImgSubmit}
                    disabled={imageLoading}
                    className={`w-full py-4 rounded-2xl text-sm md:text-base font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group ${imageLoading ? "bg-zinc-800 text-zinc-500 cursor-wait" : "bg-rose-500 text-white hover:bg-rose-400 hover:scale-[0.98] shadow-[0_0_30px_rgba(244,63,94,0.3)]"}`}
                  >
                    {imageLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {imageLoading ? "图像处理中..." : "开始图生图"}
                  </button>
                </div>
              )}
            </div>
            
            {/* Prompt Results - Always visible */}
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col gap-5 animate-in fade-in slide-in-from-top-4">
              <h3 className="text-xs font-mono text-zinc-400 tracking-widest uppercase flex items-center gap-2 border-b border-white/5 pb-4">
                <Wand2 className="w-3.5 h-3.5" /> 生成结果 / Result
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  <span className="text-indigo-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> 正向提示词</span>
                  <button onClick={() => copyToClipboard(result.prompt, "prompt")} className="hover:text-white transition-colors bg-white/5 px-3 py-1 rounded-lg">
                    {copied === "prompt" ? "已复制 ✓" : "复制 / Copy"}
                  </button>
                </div>
                <textarea
                  value={result.prompt}
                  onChange={(e) => setResult({ ...result, prompt: e.target.value })}
                  className="w-full p-4 bg-black/40 border border-white/5 rounded-2xl font-mono text-xs leading-relaxed text-indigo-100/90 h-32 resize-none focus:outline-none focus:border-indigo-500/50 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent shadow-inner"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  <span className="text-rose-400 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> 负向提示词</span>
                  <button onClick={() => copyToClipboard(result.negative_prompt, "negative")} className="hover:text-white transition-colors bg-white/5 px-3 py-1 rounded-lg">
                    {copied === "negative" ? "已复制 ✓" : "复制 / Copy"}
                  </button>
                </div>
                <textarea
                  value={result.negative_prompt}
                  onChange={(e) => setResult({ ...result, negative_prompt: e.target.value })}
                  className="w-full p-4 bg-black/40 border border-white/5 rounded-2xl font-mono text-xs leading-relaxed text-rose-100/70 h-24 resize-none focus:outline-none focus:border-rose-500/50 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent shadow-inner"
                />
              </div>

              {result.recommended_settings && (
                <div className="pt-2">
                  <label className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase mb-3 block">推荐参数 / Params</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(result.recommended_settings).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="bg-black/30 p-3 rounded-xl border border-white/5 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors">
                        <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mb-1">{key.replace('_', ' ')}</span>
                        <span className="text-xs font-bold text-zinc-300 truncate w-full" title={String(value)}>{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm font-mono flex items-center gap-3 animate-in fade-in">
                <ShieldAlert className="w-5 h-5 shrink-0" /> {error}
              </div>
            )}

          </div>

          {/* Right Column: Preview & Image Generation */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white/[0.02] border border-white/[0.05] rounded-[2rem] p-6 backdrop-blur-xl shadow-2xl flex flex-col lg:sticky lg:top-6 aspect-[3/4] max-h-[80vh]">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400 tracking-widest mb-4 pb-4 border-b border-white/5 shrink-0">
                <span className="flex items-center gap-2 uppercase">
                  <span className={`w-2 h-2 rounded-full ${(isTxt2VideoMode ? generatedVideo : generatedImage) ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`}></span>
                  {isTxt2VideoMode ? "视频预览 / Preview" : "出图预览 / Preview"}
                </span>
                {(isTxt2VideoMode ? generatedVideo : generatedImage) && (
                  <a href={isTxt2VideoMode ? generatedVideo : generatedImagePreviewSrc} target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-white transition-colors bg-white/5 px-3 py-1 rounded-lg">
                    {isTxt2VideoMode ? "查看视频 ↗" : "查看原图 ↗"}
                  </a>
                )}
              </div>
              {!isTxt2VideoMode && imageMeta?.displayModel && (
                <div className="mb-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] text-zinc-400">
                  当前展示模型：<span className="text-zinc-200">{imageMeta.displayModel}</span>
                  {imageMeta.modelChanged && imageMeta.actualModel ? ` · 高峰期自动切换为 ${imageMeta.actualModel}` : ""}
                </div>
              )}

              {/* Generate Image Button */}
              {!isVideoMode && !isTxt2VideoMode && !isImg2ImgMode && (
                <div className="mb-4 shrink-0">
                  <button 
                    onClick={() => handleGenerateImage(result.prompt)}
                    disabled={imageLoading}
                    className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 flex justify-center items-center gap-3 relative overflow-hidden ${imageLoading ? "bg-indigo-500/20 text-indigo-400/50 cursor-wait border border-indigo-500/30" : isGptImage2Mode ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-[0.98]" : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:scale-[0.98]"}`}
                  >
                    {imageLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    {imageLoading ? (isGptImage2Mode ? "GPT-Image-2 生成中..." : "图片生成中...") : (isGptImage2Mode ? "✨ 使用 GPT-Image-2 生成" : "🎨 一键生成画面")}
                  </button>
                </div>
              )}

              {/* Generate Image Button */}
              {!isVideoMode && !isTxt2VideoMode && result && !isImg2ImgMode && (
                <div className="mb-4 shrink-0">
                  <button 
                    onClick={() => handleGenerateImage(result.prompt)}
                    disabled={imageLoading}
                    className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 flex justify-center items-center gap-3 relative overflow-hidden ${imageLoading ? "bg-indigo-500/20 text-indigo-400/50 cursor-wait border border-indigo-500/30" : isGptImage2Mode ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:scale-[0.98]" : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:scale-[0.98]"}`}
                  >
                    {imageLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    {imageLoading ? (isGptImage2Mode ? "GPT-Image-2 生成中..." : "图片生成中...") : (isGptImage2Mode ? "使用 GPT-Image-2 生成" : "一键生成画面")}
                  </button>
                </div>
              )}

              {isTxt2VideoMode ? (
                generatedVideo ? (
                  <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 shadow-inner min-h-0 p-2">
                    <video src={generatedVideo} controls className="w-full h-full rounded-xl object-contain bg-black" />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-white/5 rounded-2xl bg-black/20 relative overflow-hidden min-h-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
                    <Video className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm font-mono tracking-widest opacity-50">暂无生成视频</p>
                    <p className="text-[10px] font-mono tracking-widest opacity-30 mt-2">No video generated yet</p>
                  </div>
                )
              ) : generatedImagePreviewSrc ? (
                <div className="flex-1 relative rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex justify-center items-center shadow-inner group min-h-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={generatedImagePreviewSrc} alt="Generated" loading="eager" referrerPolicy="no-referrer" className="w-full h-full object-contain absolute inset-0 transition-transform duration-700 group-hover:scale-105" />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 border-2 border-dashed border-white/5 rounded-2xl bg-black/20 relative overflow-hidden min-h-0">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
                  <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-sm font-mono tracking-widest opacity-50">暂无生成图片</p>
                  <p className="text-[10px] font-mono tracking-widest opacity-30 mt-2">No image generated yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sponsor Modal */}
      {showSponsor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowSponsor(false)}>
          <div className="relative bg-zinc-900 border border-white/10 p-8 rounded-[2rem] shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSponsor(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center mb-6">
              <Heart className="w-8 h-8 text-rose-500 mx-auto mb-3" />
              <h3 className="text-2xl font-black text-white tracking-wide">赞助支持</h3>
              <p className="text-sm text-zinc-400 mt-2 font-light">您的支持是持续迭代的动力</p>
            </div>
            <div className="bg-white p-3 rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/zanzhu.png" alt="Sponsor QR" className="w-full h-auto rounded-xl" />
            </div>
          </div>
        </div>
      )}
      {showSponsorBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowSponsorBoard(false)}>
          <div className="relative bg-zinc-900 border border-white/10 p-6 rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSponsorBoard(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="mb-5 pr-8">
              <div className="flex items-center gap-2 text-amber-300 mb-2">
                <Trophy className="w-5 h-5" />
                <h3 className="text-xl font-black tracking-wide">赞赏榜</h3>
              </div>
              <p className="text-xs text-zinc-400">排名不分先后，按时间顺序展示</p>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[62vh] pr-1">
              {sponsorBoard.map((item, index) => (
                <div key={`${item.name}-${item.time}-${index}`} className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{item.name}</p>
                    <p className="text-xs text-zinc-400">{item.time}</p>
                  </div>
                  <span className="text-sm font-black text-amber-300">+{item.amount} 元</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
