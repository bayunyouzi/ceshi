"use client";
import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { Copy, RefreshCw, Wand2, Settings, Save, Sparkles, Image as ImageIcon, Shield, ShieldAlert, Users, User, Brain, Video, Heart, X, Trophy, MessageCircle, Sun, Moon } from "lucide-react";

import { getRandomTags } from "../lib/utils";
import { img2ImgPrompts, img2ImgEffectOptions } from "../lib/img2imgPrompts";

const AuthModal = dynamic(() => import("./components/AuthModal"), { ssr: false });

export default function Home() {
  const DEFAULT_PROMPT_ENDPOINT = "https://apifree.rensumo.top/";
  const DEFAULT_PROMPT_MODEL = "openai/gpt-oss-20b";
  // GPT-Image-2 配置 - 使用独立的 API Key
  const GPT_IMAGE_2_API_KEY = process.env.NEXT_PUBLIC_GPT_IMAGE_2_API_KEY || "sk-aT8zbZSLI8mNNm91bVmAUqPLpVmpqIuo";
  const GPT_IMAGE_2_API_ENDPOINT = process.env.NEXT_PUBLIC_GPT_IMAGE_2_API_ENDPOINT || "https://gpt2.zeabur.app/v1/chat/completions";
  const GPT_IMAGE_2_MODEL = process.env.NEXT_PUBLIC_GPT_IMAGE_2_MODEL || "gpt-image-2";
  const FRONTEND_IMG_API_KEY = process.env.NEXT_PUBLIC_IMG_API_KEY || "sk-aT8zbZSLI8mNNm91bVmAUqPLpVmpqIuo";
  const FRONTEND_IMG_API_ENDPOINT = process.env.NEXT_PUBLIC_IMG_API_ENDPOINT || "http://bayunzi.shop/v1";
  const FRONTEND_IMG_MODEL_NAME = process.env.NEXT_PUBLIC_IMG_MODEL_NAME || "grok-imagine-image-lite";
  const FRONTEND_VIDEO_API_KEY = process.env.NEXT_PUBLIC_VIDEO_API_KEY || "xai-I1k5xdu1X9fAxANwIXP2sBSdrJZkravAOfbDffwv0P6YgGFj3u597hVEb6B3kvOeClJFNCkx7vQeJsnh";
  const FRONTEND_VIDEO_API_ENDPOINT = process.env.NEXT_PUBLIC_VIDEO_API_ENDPOINT || "https://api.x.ai/v1/videos/generations";
  const FRONTEND_VIDEO_MODEL_NAME = process.env.NEXT_PUBLIC_VIDEO_MODEL_NAME || "grok-imagine-video";
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>({ prompt: "", negative_prompt: "", recommended_settings: null });
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [isAnime, setIsAnime] = useState(true);
  const [isVideoMode, setIsVideoMode] = useState(false);
  const [isTxt2VideoMode, setIsTxt2VideoMode] = useState(false);
  const [isImg2ImgMode, setIsImg2ImgMode] = useState(false); // 新增图生图模式
  const [isGptImage2Mode, setIsGptImage2Mode] = useState(false); // GPT-Image-2 模型切换
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

  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
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
  const [videoLoading, setVideoLoading] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState("");
  const imageRequestLockRef = useRef(false);
  const videoRequestLockRef = useRef(false);
  const lastImagePromptRef = useRef("");
  const lastImagePromptAtRef = useRef(0);
  const lastImg2ImgFingerprintRef = useRef("");
  const lastImg2ImgAtRef = useRef(0);
  const VIDEO_DURATION_SECONDS = 10;
  const IMAGE_DEBOUNCE_MS = 1200;
  const IDEMPOTENCY_BUCKET_MS = 10000;
  // GPT-Image-2 官方支持的比例
  const aspectRatioOptions = ["1:1", "3:2", "2:3", "auto"] as const;
  type AspectRatioOption = (typeof aspectRatioOptions)[number];
  const aspectRatioSizeMap: Record<AspectRatioOption, string> = {
    "1:1": "1024x1024",
    "3:2": "1536x1024",
    "2:3": "1024x1536",
    "auto": "auto"
  };
  const [imageAspectRatio, setImageAspectRatio] = useState<AspectRatioOption>("1:1");
  const imageAspectRatioCss = imageAspectRatio === "auto" ? "1 / 1" : imageAspectRatio.replace(":", " / ");
  const imagePreviewStyle = !isTxt2VideoMode ? { aspectRatio: imageAspectRatioCss, minHeight: "360px" } : undefined;
  
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
    { name: "迷朔如梦", amount: "5.00", time: "4月7日 19:58" },
    { name: "未知", amount: "5.00", time: "4月7日 9:00" },
    { name: "未知", amount: "5.00", time: "4月6日 9:02" },
    { name: "未知", amount: "10.00", time: "4月6日 1:04" },
    { name: "未知", amount: "20.00", time: "4月5日 16:52" },
    { name: "未知", amount: "1.00", time: "4月4日 9:16" },
    { name: "今夜星光灿烂", amount: "6.66", time: "4月2日 22:11" },
    { name: "TangC", amount: "8.88", time: "4月2日 21:54" },
    { name: "未知", amount: "5.00", time: "4月2日 10:37" },
    { name: "经验+3", amount: "5.20", time: "4月1日 13:27" },
    { name: "秋瘴", amount: "5.00", time: "4月1日 10:54" },
    { name: "未知", amount: "5.00", time: "3月30日 18:28" },
    { name: "薄荷", amount: "50.00", time: "3月30日 17:20" },
    { name: "未知", amount: "0.20", time: "3月30日 01:47" },
    { name: "未知", amount: "1.00", time: "3月29日 16:52" },
    { name: "女同桌推的", amount: "4.33", time: "3月29日 09:28" },
    { name: "未知", amount: "2.22", time: "3月28日 23:05" },
    { name: "未知", amount: "1.00", time: "3月28日 23:00" },
    { name: "turn A", amount: "50.00", time: "3月28日 22:07" },
    { name: "犬人", amount: "50.00", time: "3月28日 13:28" },
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

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (next === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('theme', next);
  };

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
      } catch (_e) {}
    }
    return "guest";
  };

  const readSetting = (scope: string, key: string) => {
    return localStorage.getItem(`${key}_${scope}`) ?? localStorage.getItem(key) ?? "";
  };

  const cleanCustomEndpoint = (value: string) => value.trim().replace(/^[`'"\s]+/, '').replace(/[`'"\s]+$/, '');

  const validateCustomImageEndpoint = (endpoint: string) => {
    if (!/^https?:\/\//i.test(endpoint)) {
      throw new Error("请填写完整的自定义生图接口地址，必须以 http:// 或 https:// 开头");
    }
    try {
      new URL(endpoint);
    } catch (_err) {
      throw new Error("自定义生图接口地址格式不正确，请填写完整 URL");
    }
  };

  const saveSetting = (scope: string, key: string, value: string) => {
    try {
      localStorage.setItem(`${key}_${scope}`, value);
    } catch (_e) {}
  };

  const toggleGptImage2Mode = () => {
    const newState = !isGptImage2Mode;
    setIsGptImage2Mode(newState);
    const scope = getSettingScope();
    localStorage.setItem(`gpt_image2_mode_${scope}`, String(newState));
  };

  const getChinaDateKey = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

  const selectImageAspectRatio = (ratio: AspectRatioOption) => {
    setImageAspectRatio(ratio);
    const scope = getSettingScope();
    saveSetting(scope, "image_aspect_ratio", ratio);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setTheme('light');
      document.documentElement.classList.add('light');
    }

    const scope = getSettingScope();
    const savedKey = readSetting(scope, "creative_api_key");
    const savedEndpoint = readSetting(scope, "creative_api_endpoint");
    const savedModel = readSetting(scope, "creative_model_name");
    
    if (savedKey) setApiKey(savedKey);
    setApiEndpoint(savedEndpoint || "");
    setModelName(savedModel || "");

    // 加载 GPT-Image-2 模式标志
    const savedGptImage2Mode = localStorage.getItem(`gpt_image2_mode_${scope}`);
    const isGptMode = savedGptImage2Mode === 'true';
    if (isGptMode) {
      setIsGptImage2Mode(true);
    }

    const savedImageKey = readSetting(scope, "image_gen_api_key");
    const savedImageEndpoint = readSetting(scope, "image_gen_api_endpoint");
    const savedImageModel = readSetting(scope, "image_gen_model_name");
    const savedAspectRatio = readSetting(scope, "image_aspect_ratio");

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
    if (aspectRatioOptions.includes(savedAspectRatio as any)) {
      setImageAspectRatio(savedAspectRatio as any);
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

    // 清理函数：防止内存泄漏
    return () => {
      if (holdTimerRef.current) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
      if (holdProgressTimerRef.current) {
        clearInterval(holdProgressTimerRef.current);
        holdProgressTimerRef.current = null;
      }
    };
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

    // 优化：减少随机标签数量，提升性能
    const tagCount = hasUserInput ? 2 : 3;

    const randomFace = getRandomTags('face', tagCount);
    const randomPose = getRandomTags('pose', tagCount, securityLevel as any);
    const randomClothing = getRandomTags('clothing', tagCount);
    const randomEnv = getRandomTags('environment', tagCount);
    const randomStyle = getRandomTags('style', tagCount);
    const randomNsfw = isUncensored ? getRandomTags('nsfw', tagCount) : "";

    // 追加一些随机动态/动作库（让视频更多样）
    const dynamics = ["walking", "running", "turning around", "looking back", "hair blowing in the wind", "skirt fluttering", "blinking", "smiling gently", "reaching out hand", "dancing", "sitting down", "lying down"];
    const randomDynamic = dynamics.sort(() => 0.5 - Math.random()).slice(0, 2).join(', ');

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

    // 优化：减少随机标签数量，提升性能和AI理解能力
    // 根据用户输入长度动态调整标签数量
    const tagCount = hasUserInput ? 2 : 3; // 有用户输入时减少随机标签

    const randomFace = getRandomTags('face', tagCount);
    const randomHair = getRandomTags('hair', tagCount);
    const randomPose = getRandomTags('pose', tagCount, securityLevel as any);
    const randomClothing = getRandomTags('clothing', tagCount);
    const randomAccessories = getRandomTags('accessories', tagCount);
    const randomEnv = getRandomTags('environment', tagCount);
    const randomStyle = getRandomTags('style', tagCount);
    const randomNsfw = safeMode ? "" : getRandomTags('nsfw', tagCount);

    // 随机体型、视角等库
    const bodyTypes = ["petite (娇小)", "tall (高挑)", "curvy (丰满)", "slender (苗条)", "mature female (成熟女性)", "young girl (年轻女孩)", "chubby (微胖)"];

    // 按照 25% 正面，75% 其他视角（侧面、背面、特殊角度）的比例来生成视角
    const isFrontal = Math.random() < 0.25;
    let randomView = "";
    if (isFrontal) {
      const frontalAngles = ["looking at viewer (看着观众)", "front view (正面)", "looking ahead (直视前方)"];
      randomView = frontalAngles.sort(() => 0.5 - Math.random()).slice(0, 1).join(', ');
    } else {
      const otherAngles = ["from below (仰视)", "from above (俯视)", "from behind (背影)", "side profile (侧颜)", "dutch angle (倾斜镜头)", "looking away (看向别处)", "looking back (回眸)"];
      randomView = otherAngles.sort(() => 0.5 - Math.random()).slice(0, 1).join(', ');
    }

    const randomBody = bodyTypes.sort(() => 0.5 - Math.random()).slice(0, 1).join(', ');

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

  const isRenderableImageRef = (value: unknown): value is string => {
    if (typeof value !== "string") return false;
    const text = value.trim();
    if (!text) return false;
    if (/^data:image\/[a-zA-Z0-9.+-]+;base64,/i.test(text)) return true;
    if (/^https?:\/\//i.test(text)) return true;
    if (text.length > 1000 && !text.includes(' ') && /^[a-zA-Z0-9+/]+={0,2}$/.test(text.substring(0, 100))) return true;
    return false;
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
      const base64Match = text.match(/(?:base64|b64_json)["'`\s:=]+([a-zA-Z0-9+/]{1000,}={0,2})/i);
      if (base64Match) return `data:image/png;base64,${base64Match[1]}`;
      
      // Fallback: Check if the string itself is a raw base64 string
      if (text.length > 1000 && !text.includes(' ') && /^[a-zA-Z0-9+/]+={0,2}$/.test(text.substring(0, 100))) {
        return `data:image/jpeg;base64,${text}`;
      }

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return extractImageUrlFromAny(parsed);
        }
      } catch (_e) {}
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
      } catch (_e) {}
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

  const handleViewMedia = (url: string, isVideo: boolean) => {
    if (!url) return;
    if (url.startsWith('data:')) {
      const [header, base64Data] = url.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
      const binary = atob(base64Data);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([array], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } else {
      window.open(url, '_blank', 'noreferrer');
    }
  };

  const hashText = (value: string) => {
    let hash = 5381;
    for (let i = 0; i < value.length; i++) {
      hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  };

  const buildImageIdempotencyKey = (
    prompt: string,
    options?: { kind?: "txt2img" | "img2img"; imageSeed?: string; phase?: "primary" | "retry" }
  ) => {
    const kind = options?.kind || "txt2img";
    const phase = options?.phase || "primary";
    const imageSeed = options?.imageSeed || "";
    const normalizedPrompt = prompt.trim().replace(/\s+/g, " ").slice(0, 300);
    const windowBucket = Math.floor(Date.now() / IDEMPOTENCY_BUCKET_MS);
    return `img:${hashText(`${kind}|${phase}|${normalizedPrompt}|${imageSeed}|${imageAspectRatio}|${windowBucket}`)}`;
  };

  const handleGenerateImage = async (prompt: string) => {
    if (imageRequestLockRef.current || imageLoading) return;
    const normalizedPrompt = prompt.trim().replace(/\s+/g, " ");
    const now = Date.now();
    if (normalizedPrompt && lastImagePromptRef.current === normalizedPrompt && now - lastImagePromptAtRef.current < IMAGE_DEBOUNCE_MS) {
      return;
    }
    lastImagePromptRef.current = normalizedPrompt;
    lastImagePromptAtRef.current = now;
    if (!(imageApiKey && imageApiEndpoint)) {
      if (!checkLimit('image')) return;
    }
    imageRequestLockRef.current = true;

    setImageLoading(true);
    setError("");
    setGeneratedImage("");
    setImageMeta(null);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), isGptImage2Mode ? 310000 : 110000);
    
    try {
      let data: any;

      const useCustomApi = Boolean(imageApiKey && imageApiEndpoint && !isGptImage2Mode);
      const effectiveKey = useCustomApi ? imageApiKey : (isGptImage2Mode ? GPT_IMAGE_2_API_KEY : FRONTEND_IMG_API_KEY);
      const effectiveEndpoint = useCustomApi ? imageApiEndpoint : (isGptImage2Mode ? GPT_IMAGE_2_API_ENDPOINT : FRONTEND_IMG_API_ENDPOINT);
      const effectiveModel = useCustomApi ? (imageModelName || "grok-imagine-image-lite") : (isGptImage2Mode ? GPT_IMAGE_2_MODEL : FRONTEND_IMG_MODEL_NAME);

      const endpoint = cleanCustomEndpoint(effectiveEndpoint);
      if (useCustomApi) {
        try {
          validateCustomImageEndpoint(endpoint);
        } catch (ve: any) {
          throw new Error(ve.message);
        }
      }
      const sizeStr = aspectRatioSizeMap[imageAspectRatio] || "1024x1024";
      const isImagesGenEndpoint = /\/images\/generations\/?$/i.test(endpoint);
      const buildPayload = (withSize: boolean) => {
        if (isImagesGenEndpoint) {
          const p: any = { model: effectiveModel, prompt, n: 1, response_format: "url" };
          if (withSize) p.size = sizeStr;
          return p;
        }
        const p: any = {
          model: effectiveModel,
          messages: [{ role: "user", content: prompt }],
          stream: false,
          max_tokens: 4096
        };
        if (withSize) {
          p.image_config = { n: 1, size: sizeStr, response_format: "b64_json" };
        }
        return p;
      };
      let response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveKey}`
        },
        body: JSON.stringify(buildPayload(true)),
        signal: controller.signal
      });
      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 400 && /size|image_config/i.test(errText)) {
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${effectiveKey}`
            },
            body: JSON.stringify(buildPayload(false)),
            signal: controller.signal
          });
          if (!response.ok) {
            const errText2 = await response.text();
            clearTimeout(timeoutId);
            throw new Error(`API 请求失败 (${response.status}): ${errText2.substring(0, 200)}`);
          }
        } else {
          clearTimeout(timeoutId);
          throw new Error(`API 请求失败 (${response.status}): ${errText.substring(0, 200)}`);
        }
      }
      clearTimeout(timeoutId);
      data = await response.json();

      const extractedImage = extractImageUrlFromAny(data);
      if (extractedImage) {
        setGeneratedImage(extractedImage);
        setImageMeta(readImageMeta(data));
        if (!(imageApiKey && imageApiEndpoint)) deductLimit('image');
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
      const errMsg = err.message || "生成图片失败";
      let displayMsg = errMsg;

      if (err.name === "AbortError") {
        displayMsg = "请求超时，生成时间过长，请稍后重试";
      } else if (
        errMsg.includes("PROHIBITED_CONTENT") ||
        errMsg.includes("prompt_blocked") ||
        errMsg.includes("content-moderated") ||
        errMsg.includes("Moderated")
      ) {
        displayMsg = "提示词触发安全审查，请尝试修改内容或开启安全模式";
      } else if (errMsg.includes("Failed to fetch")) {
        displayMsg = "无法直连该自定义生图接口，可能是网络问题、服务未开启跨域访问(CORS)，或接口不可达。请确认地址正确且服务端支持浏览器跨域请求。";
      } else if (errMsg.includes("500") || errMsg.includes("服务暂时不可用")) {
        displayMsg = "图片生成服务暂时不可用，请稍后重试";
      } else if (errMsg.includes("429") || errMsg.includes("请求过于频繁")) {
        displayMsg = "请求过于频繁，请等待10秒后重试";
      } else if (
        errMsg.includes("502") ||
        errMsg.includes("Bad Gateway") ||
        errMsg.includes("JSON") ||
        errMsg.includes("Unexpected token")
      ) {
        displayMsg = "上游服务暂时异常，请稍后重试";
      }

      setError(displayMsg);
    } finally {
      setImageLoading(false);
      imageRequestLockRef.current = false;
    }
  };

  const buildVideoStatusEndpoint = (startEndpoint: string, requestId: string) => {
    const encodedRequestId = encodeURIComponent(requestId);
    try {
      const url = new URL(startEndpoint);
      url.pathname = url.pathname.replace(/\/generations\/?$/i, `/${encodedRequestId}`);
      return url.toString();
    } catch (_e) {
      return startEndpoint.replace(/\/generations\/?$/i, `/${encodedRequestId}`);
    }
  };

  const handleGenerateVideo = async () => {
    if (videoRequestLockRef.current || videoLoading) return;
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
    videoRequestLockRef.current = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000);

    try {
      const effectiveKey = imageApiKey || FRONTEND_VIDEO_API_KEY;
      const effectiveEndpoint = imageApiEndpoint || FRONTEND_VIDEO_API_ENDPOINT;
      const effectiveModel = imageModelName || FRONTEND_VIDEO_MODEL_NAME;
      const finalEndpoint = cleanCustomEndpoint(effectiveEndpoint);

      const videoPayload: Record<string, any> = {
        model: effectiveModel,
        prompt: userInput.trim(),
        duration: VIDEO_DURATION_SECONDS
      };

      const startResponse = await fetch(finalEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveKey}`
        },
        body: JSON.stringify(videoPayload),
        signal: controller.signal
      });

      if (!startResponse.ok) {
        const errText = await startResponse.text();
        clearTimeout(timeoutId);
        throw new Error(`视频API请求失败 (${startResponse.status}): ${errText.substring(0, 200)}`);
      }

      const startData = await startResponse.json();
      
      const immediateVideo = extractVideoUrlFromAny(startData);
      if (immediateVideo) {
        clearTimeout(timeoutId);
        setGeneratedVideo(immediateVideo);
        if (!imageApiKey) deductLimit('video');
        return;
      }

      const requestId = startData?.id || 
                        startData?.request_id || 
                        startData?.video?.id ||
                        startData?.data?.id ||
                        startData?.result?.id;
      
      if (!requestId) {
        clearTimeout(timeoutId);
        throw new Error("视频API未返回任务ID，无法轮询状态");
      }

      const statusEndpoint = buildVideoStatusEndpoint(finalEndpoint, String(requestId));
      const pollStartedAt = Date.now();
      const POLL_INTERVAL = 5000;
      const MAX_WAIT = 8 * 60 * 1000;

      while (Date.now() - pollStartedAt < MAX_WAIT) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
        
        if (controller.signal.aborted) break;

        const pollResponse = await fetch(statusEndpoint, {
          headers: {
            "Authorization": `Bearer ${effectiveKey}`
          },
          signal: controller.signal
        });

        if (!pollResponse.ok) {
          const pollText = await pollResponse.text();
          clearTimeout(timeoutId);
          throw new Error(`视频状态查询失败 (${pollResponse.status}): ${pollText.substring(0, 200)}`);
        }

        const pollData = await pollResponse.json();
        const status = String(pollData?.status ?? "").toLowerCase();
        
        if (status === "pending" || status === "processing" || status === "queued") {
          continue;
        }

        if (status === "done" || status === "completed" || status === "succeeded") {
          const videoUrl = extractVideoUrlFromAny(pollData);
          if (videoUrl) {
            clearTimeout(timeoutId);
            setGeneratedVideo(videoUrl);
            if (!imageApiKey) deductLimit('video');
            return;
          }
          clearTimeout(timeoutId);
          throw new Error("视频已完成但未找到视频链接");
        }

        const statusError = pollData?.error?.message || pollData?.message || `视频生成失败，状态: ${status}`;
        clearTimeout(timeoutId);
        throw new Error(statusError);
      }

      clearTimeout(timeoutId);
      throw new Error("视频生成超时（超过8分钟），请稍后重试");
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setError("请求超时，Grok 官方视频接口生成时间较长，请稍后重试");
      } else {
        setError(err.message || "生成视频失败，请稍后重试");
      }
    } finally {
      setVideoLoading(false);
      videoRequestLockRef.current = false;
    }
  };

  const handleImg2ImgSubmit = async () => {
    if (imageRequestLockRef.current || imageLoading) return;
    if (!uploadedImage) {
      setError("请先上传参考图片");
      return;
    }

    if (!(imageApiKey && imageApiEndpoint) && !checkLimit('image')) return;
    imageRequestLockRef.current = true;

    setImageLoading(true);
    setError("");
    setGeneratedImage("");
    setImageMeta(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), isGptImage2Mode ? 310000 : 60000); // GPT-Image-2: 310秒，其他: 60秒

    try {
      let promptInstruction = img2ImgPrompts[img2ImgEffect] || img2ImgPrompts.random;
      
      // 添加用户额外需求
      if (img2ImgInput && img2ImgInput.trim()) {
        promptInstruction += `\n\nUser Additional Request: ${img2ImgInput}`;
      }

      const imageSeed = `${uploadedImage.slice(0, 128)}|${uploadedImage.length}`;
      const img2imgFingerprint = `${hashText(promptInstruction.slice(0, 500))}|${hashText(imageSeed)}|${imageAspectRatio}|${img2ImgEffect}`;
      const now = Date.now();
      if (img2imgFingerprint === lastImg2ImgFingerprintRef.current && now - lastImg2ImgAtRef.current < IMAGE_DEBOUNCE_MS) {
        return;
      }
      lastImg2ImgFingerprintRef.current = img2imgFingerprint;
      lastImg2ImgAtRef.current = now;

      const useCustomApi = Boolean(imageApiKey && imageApiEndpoint && !isGptImage2Mode);
      const effectiveKey = useCustomApi ? imageApiKey : (isGptImage2Mode ? GPT_IMAGE_2_API_KEY : FRONTEND_IMG_API_KEY);
      const effectiveEndpoint = useCustomApi ? imageApiEndpoint : (isGptImage2Mode ? GPT_IMAGE_2_API_ENDPOINT : FRONTEND_IMG_API_ENDPOINT);
      const effectiveModel = useCustomApi ? (imageModelName || "grok-imagine-image-edit") : (isGptImage2Mode ? GPT_IMAGE_2_MODEL : "grok-imagine-image-edit");
      let data: any;

      const endpoint = cleanCustomEndpoint(effectiveEndpoint);
      if (useCustomApi) {
        try {
          validateCustomImageEndpoint(endpoint);
        } catch (ve: any) {
          throw new Error(ve.message);
        }
      }
      const sizeStr = aspectRatioSizeMap[imageAspectRatio] || "1024x1024";
      const buildImg2ImgPayload = (text: string, withSize: boolean) => {
        const p: any = {
          model: effectiveModel,
          messages: [{
            role: "user",
            content: [
              { type: "text", text },
              { type: "image_url", image_url: { url: uploadedImage } }
            ]
          }],
          stream: false,
          max_tokens: 4096
        };
        if (withSize) {
          p.image_config = { n: 1, size: sizeStr, response_format: "b64_json" };
        }
        return p;
      };
      let response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${effectiveKey}`
        },
        body: JSON.stringify(buildImg2ImgPayload(promptInstruction, true)),
        signal: controller.signal
      });
      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 400 && /size|image_config/i.test(errText)) {
          response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${effectiveKey}`
            },
            body: JSON.stringify(buildImg2ImgPayload(promptInstruction, false)),
            signal: controller.signal
          });
          if (!response.ok) {
            const errText2 = await response.text();
            clearTimeout(timeoutId);
            throw new Error(`API 请求失败 (${response.status}): ${errText2.substring(0, 200)}`);
          }
        } else {
          clearTimeout(timeoutId);
          throw new Error(`API 请求失败 (${response.status}): ${errText.substring(0, 200)}`);
        }
      }
      clearTimeout(timeoutId);
      data = await response.json();

      const extractedImage = extractImageUrlFromAny(data);
      if (extractedImage) {
        setGeneratedImage(extractedImage);
        setImageMeta(readImageMeta(data));
        if (!(imageApiKey && imageApiEndpoint)) deductLimit('image');
        return;
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.length > 0) {
        const retryPrompt = `Generate one image only. Keep character identity strictly consistent with the reference image: same face, hairstyle, outfit, body proportions, pose and camera framing. Do not drift style away from reference. Use this recovered guidance as secondary hint: ${content}. Original transformation request: ${promptInstruction}`;
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), isGptImage2Mode ? 310000 : 90000);
        let retryData: any;

        const retryEndpoint = cleanCustomEndpoint(effectiveEndpoint);
        const retryPayload: any = {
          model: effectiveModel,
          messages: [{
            role: "user",
            content: [
              { type: "text", text: retryPrompt },
              { type: "image_url", image_url: { url: uploadedImage } }
            ]
          }],
          stream: false,
          max_tokens: 4096
        };
        retryPayload.image_config = { n: 1, size: sizeStr, response_format: "b64_json" };
        let retryResponse = await fetch(retryEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${effectiveKey}`
          },
          body: JSON.stringify(retryPayload),
          signal: retryController.signal
        });
        if (!retryResponse.ok) {
          const errText = await retryResponse.text();
          if (retryResponse.status === 400 && /size|image_config/i.test(errText)) {
            delete retryPayload.image_config;
            retryResponse = await fetch(retryEndpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${effectiveKey}`
              },
              body: JSON.stringify(retryPayload),
              signal: retryController.signal
            });
          }
        }
        clearTimeout(retryTimeoutId);
        if (!retryResponse.ok) {
          const errText = await retryResponse.text();
          throw new Error(`重试请求失败 (${retryResponse.status}): ${errText.substring(0, 200)}`);
        }
        retryData = await retryResponse.json();

        const retryImage = extractImageUrlFromAny(retryData);
        if (retryImage) {
          setGeneratedImage(retryImage);
          setImageMeta(readImageMeta(retryData));
          if (!(imageApiKey && imageApiEndpoint)) deductLimit('image');
          return;
        }
        throw new Error(`生成失败，模型未能返回图片链接，仅返回了文本: ${content.substring(0, 100)}...`);
      }
      
      throw new Error("未能识别图片链接，API 返回格式异常");

    } catch (err: any) {
      clearTimeout(timeoutId);
      const msg = err.message || "生成图片失败，请稍后重试";
      if (err.name === "AbortError") {
        setError("请求超时，图像处理时间过长，请稍后重试");
      } else if (msg.includes("Failed to fetch")) {
        setError("无法直连该自定义生图接口，可能是网络问题、服务未开启跨域访问(CORS)，或接口不可达。请确认地址正确且服务端支持浏览器跨域请求。");
      } else if (msg.includes("500") || msg.includes("服务暂时不可用")) {
        setError("图片生成服务暂时不可用，请稍后重试");
      } else if (msg.includes("429") || msg.includes("请求过于频繁")) {
        setError("请求过于频繁，请等待10秒后重试");
      } else if (msg.includes("502") || msg.includes("Bad Gateway") || msg.includes("JSON")) {
        setError("上游服务暂时异常，请稍后重试");
      } else {
        setError(msg);
      }
    } finally {
      setImageLoading(false);
      imageRequestLockRef.current = false;
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
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const useCustomPromptConfig = Boolean(apiKey || apiEndpoint || modelName);

    const FALLBACK_MODEL = isVideoMode ? "grok-4.20-0309-non-reasoning" : (isDeepThinking ? "grok-4.20-0309-reasoning" : "grok-4.20-0309-non-reasoning");
    
    const finalEndpoint = apiEndpoint || undefined;
    const finalApiKey = apiKey || undefined;
    const finalModel = modelName || FALLBACK_MODEL;

    try {
      const isUncensored = isUncensoredMode && !isSafeMode;
      const hasUserInput = Boolean(userInput && userInput.trim());
      const systemPrompt = isVideoMode 
        ? getVideoSystemPrompt(isSafeMode, isUncensored, hasUserInput)
        : getSystemPrompt(isAnime, isSafeMode, isUncensored, characterCount, hasUserInput);

      const messages = [
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
      ];

      let data: any;

      if (useCustomPromptConfig && finalApiKey && finalEndpoint) {
        const endpoint = finalEndpoint.trim().replace(/^[`'"\s]+/, '').replace(/[`'"\s]+$/, '');
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${finalApiKey}`
          },
          body: JSON.stringify({
            model: finalModel,
            messages,
            temperature: isDeepThinking ? undefined : 0.8,
            stream: false
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`提示词API请求失败 (${response.status}): ${errText.substring(0, 200)}`);
        }
        data = await response.json();
      } else {
        const token = localStorage.getItem("auth_token");
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            model: finalModel,
            temperature: isDeepThinking ? undefined : 0.8,
            stream: false,
            apiEndpoint: useCustomPromptConfig ? finalEndpoint : undefined,
            apiKey: useCustomPromptConfig ? finalApiKey : undefined,
            messages
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errData;
          const errTextRaw = await response.text();
          try {
            errData = JSON.parse(errTextRaw);
          } catch (_e) {
            errData = { error: errTextRaw };
          }
          throw new Error(errData.error?.message || errData.error || `API 请求失败: ${response.status}`);
        }

        const rawText = await response.text();
        try {
          data = JSON.parse(rawText);
        } catch (e) {
          console.error("Failed to parse API response:", rawText);
          throw new Error("上游服务返回了异常的数据格式，请稍后再试。");
        }
      }
      
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
      const msg = err.message || "连接服务器失败";
      let displayMsg = msg;
      if (err.name === "AbortError") {
        displayMsg = "请求超时，AI 响应时间过长，请稍后重试";
      } else if (msg.includes("Failed to fetch")) {
        displayMsg = isVideoMode
          ? "接口连接失败，请检查网络后重试"
          : "接口连接失败，请检查网络或稍后重试";
      } else if (msg.includes("content-moderated") || msg.includes("moderation")) {
        displayMsg = "触发了 AI 安全审查，请稍后再试或微调输入词";
      }
      setError(displayMsg);
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
    <div className="min-h-screen bg-theme-bg text-theme-text-primary font-sans selection:bg-indigo-500/30 overflow-hidden relative pb-20">
      {/* Dynamic Background */}
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none" style={{backgroundColor: 'var(--theme-glow-indigo)', mixBlendMode: 'var(--theme-glow-blend)'}} />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[120px] pointer-events-none" style={{backgroundColor: 'var(--theme-glow-rose)', mixBlendMode: 'var(--theme-glow-blend)'}} />
      <div className="absolute top-0 left-0 w-full h-full bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" style={{backgroundImage:'linear-gradient(var(--theme-grid-line) 1px,transparent 1px),linear-gradient(90deg,var(--theme-grid-line) 1px,transparent 1px)'}} />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 mb-8 sm:mb-16 md:mb-24 bg-theme-bg-card border border-theme-border rounded-2xl px-3 sm:px-6 py-4 backdrop-blur-md">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-black tracking-wider text-sm sm:text-base bg-clip-text text-transparent bg-gradient-to-r from-theme-hero-from to-theme-hero-to truncate">PROMPT.STUDIO</h1>
                <p className="text-[10px] text-theme-text-muted font-mono tracking-widest hidden sm:block">中文创意提示词工作台</p>
              </div>
            </div>
            
            {/* 移动端右上角登录状态 */}
            <div className="sm:hidden flex-shrink-0 ml-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg text-xs font-bold transition-all border border-rose-500/20"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>退出</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-theme-bg-card text-theme-text-primary hover:bg-theme-bg-card-hover border border-theme-border-strong rounded-lg text-xs font-bold transition-all whitespace-nowrap"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>登录</span>
                </button>
              )}
            </div>
          </div>
          
          <div className="flex flex-row items-center justify-center sm:justify-end gap-1.5 sm:gap-4 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <a 
              href="https://unapi.zeabur.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">聊天·酒馆</span>
              <span className="sm:hidden">酒馆</span>
            </a>
            <a 
              href="https://qm.qq.com/q/Q982XX0UAo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-theme-bg-card hover:bg-theme-bg-card-hover border border-theme-border-strong text-theme-text-primary hover:text-theme-text-primary rounded-xl text-xs font-medium transition-all flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.984 0A12 12 0 0 0 0 12c0 2.057.534 4.024 1.488 5.753l-1.077 3.993a.5.5 0 0 0 .61.61l3.993-1.077A11.944 11.944 0 0 0 11.984 24c6.627 0 12-5.373 12-12s-5.373-12-12-12zM7.5 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
              </svg>
              交流群
            </a>
            <button
              onClick={() => setShowSponsorBoard(true)}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-3 sm:py-2 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-xl transition-all whitespace-nowrap flex-shrink-0"
              title="赞赏榜"
            >
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-bold">赞赏榜</span>
            </button>
            <button 
              onClick={() => setShowSponsor(true)}
              className="flex items-center gap-1.5 px-3 py-2 sm:px-3 sm:py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all whitespace-nowrap flex-shrink-0"
              title="赞助支持"
            >
              <Heart className="w-4 h-4 fill-current" />
              <span className="text-xs font-bold">给点？</span>
            </button>
            <button 
              onClick={toggleTheme}
              className="p-2 sm:p-2 text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-card-hover rounded-xl transition-all flex-shrink-0"
              title={theme === 'dark' ? "切换到白天模式" : "切换到黑夜模式"}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 sm:p-2 text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-card-hover rounded-xl transition-all flex-shrink-0"
              title="API 设置"
            >
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            <div className="hidden sm:block w-px h-6 bg-theme-border-strong mx-1"></div>

            <div className="hidden sm:block">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-2 sm:px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold transition-all border border-rose-500/20"
                >
                  <User className="w-4 h-4" />
                  <span>{user.email.split('@')[0]}</span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="flex items-center gap-2 px-2 sm:px-5 py-2 bg-theme-bg-card text-theme-text-primary hover:bg-theme-bg-card-hover border border-theme-border-strong rounded-xl text-xs font-bold transition-all"
                >
                  <User className="w-4 h-4" />
                  <span>登录 / 注册</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Hero Typography */}
        <div className="text-center mb-16 space-y-6">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-theme-hero-from to-theme-hero-to drop-shadow-2xl">
            让灵感 <br className="md:hidden" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-rose-400">直接出图</span>
          </h2>
          <p className="text-theme-text-secondary max-w-2xl mx-auto text-base md:text-lg font-light tracking-wide">
            突破想象边界。专业的二次元、写实及视频 AI 提示词生成与图生图引擎。
          </p>
          
          {!user && (
            <div className="flex flex-wrap justify-center gap-3 text-xs font-mono text-theme-text-muted mt-4">
              <span className={`px-4 py-2 rounded-xl border bg-theme-bg-input backdrop-blur-sm ${guestLimits.prompt > 0 ? 'border-indigo-500/30 text-indigo-400' : 'border-rose-500/30 text-rose-500'}`}>
                免费提示词：{guestLimits.prompt}
              </span>
              <span className={`px-4 py-2 rounded-xl border bg-theme-bg-input backdrop-blur-sm ${guestLimits.image > 0 ? 'border-indigo-500/30 text-indigo-400' : 'border-rose-500/30 text-rose-500'}`}>
                免费生图：{guestLimits.image}
              </span>
              <span className="px-4 py-2 rounded-xl border bg-theme-bg-input backdrop-blur-sm border-amber-500/30 text-amber-300">
                文生视频：登录后可用
              </span>
            </div>
          )}
          {user && (
            <div className="flex flex-wrap justify-center gap-3 text-xs font-mono text-theme-text-muted mt-4">
              <span className={`px-4 py-2 rounded-xl border bg-theme-bg-input backdrop-blur-sm ${user.isVideoLimitExempt ? 'border-emerald-500/30 text-emerald-400' : ((user.videoRemainingToday ?? 0) > 0 ? 'border-cyan-500/30 text-cyan-400' : 'border-rose-500/30 text-rose-500')}`}>
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
          <div className="w-full bg-theme-bg-card backdrop-blur-3xl border border-theme-border-strong rounded-3xl p-6 md:p-10 mb-12 shadow-2xl animate-in fade-in slide-in-from-top-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500"></div>
            <div className="grid md:grid-cols-2 gap-10">
              {/* Prompt API */}
              <div className="space-y-5">
                <h3 className="text-lg font-bold flex items-center gap-2 text-indigo-400">
                  <Wand2 className="w-5 h-5" /> 提示词接口配置
                </h3>
                <p className="text-xs text-theme-text-muted">用于生成高质量的英文 Prompt。默认使用内置高速通道。</p>
                <div className="space-y-3">
                  <input type="text" value={apiEndpoint} onChange={(e) => setApiEndpoint(e.target.value)} placeholder="自定义接口地址（留空使用内置）" className="w-full bg-theme-bg-input border border-theme-border rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-colors" />
                  <input type="text" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="自定义模型名称（留空使用内置）" className="w-full bg-theme-bg-input border border-theme-border rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-colors" />
                  <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="自定义密钥（留空使用内置）" className="w-full bg-theme-bg-input border border-theme-border rounded-xl px-4 py-3 text-sm focus:border-indigo-500 outline-none transition-colors" />
                </div>
              </div>
              {/* Image API */}
              <div className="space-y-5">
                <h3 className="text-lg font-bold flex items-center gap-2 text-rose-400">
                  <ImageIcon className="w-5 h-5" /> 生图接口配置
                </h3>
                <p className="text-xs text-theme-text-muted">用于实际生成图片。<span className="text-rose-400">填入自定义 Key 解除限制。</span></p>
                <div className="space-y-3">
                  <input type="text" value={imageApiEndpoint} onChange={(e) => setImageApiEndpoint(e.target.value)} placeholder="完整接口地址，如 https://api.example.com/v1/chat/completions" className="w-full bg-theme-bg-input border border-theme-border rounded-xl px-4 py-3 text-sm focus:border-rose-500 outline-none transition-colors" />
                  <input type="text" value={imageModelName} onChange={(e) => setImageModelName(e.target.value)} placeholder="模型名称（如 dall-e-3）" className="w-full bg-theme-bg-input border border-theme-border rounded-xl px-4 py-3 text-sm focus:border-rose-500 outline-none transition-colors" />
                  <input type="password" value={imageApiKey} onChange={(e) => setImageApiKey(e.target.value)} placeholder="密钥（sk-...）" className="w-full bg-theme-bg-input border border-theme-border rounded-xl px-4 py-3 text-sm focus:border-rose-500 outline-none transition-colors" />
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={saveSettings} className="flex items-center gap-2 bg-theme-bg-card text-theme-text-primary px-8 py-3 rounded-xl font-bold transition-all hover:scale-95 border border-theme-border-strong">
                <Save className="w-4 h-4" /> 保存配置
              </button>
            </div>
          </div>
        )}

        {/* Main Workspace - Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Left Column: Mode Selector */}
          <div className="lg:col-span-3 flex flex-col gap-6">
            <div className="bg-theme-bg-card border border-theme-border rounded-[2rem] p-5 backdrop-blur-xl shadow-2xl">
              <h3 className="text-xs font-mono text-theme-text-muted mb-4 px-2 tracking-widest uppercase">工作模式 / Mode</h3>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setIsAnime(true); setIsVideoMode(false); setIsTxt2VideoMode(false); setIsImg2ImgMode(false); }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isAnime && !isVideoMode && !isTxt2VideoMode && !isImg2ImgMode ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'hover:bg-theme-bg-card-hover text-theme-text-secondary border border-transparent'}`}
                >
                  <div className="flex items-center gap-3"><Sparkles className="w-4 h-4" /><span className="font-bold text-sm tracking-wide">二次元动漫</span></div>
                  {isAnime && !isVideoMode && !isTxt2VideoMode && !isImg2ImgMode && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,1)]" />}
                </button>
                <button
                  onClick={() => { setIsAnime(false); setIsVideoMode(false); setIsTxt2VideoMode(false); setIsImg2ImgMode(false); }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${!isAnime && !isVideoMode && !isTxt2VideoMode && !isImg2ImgMode ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'hover:bg-theme-bg-card-hover text-theme-text-secondary border border-transparent'}`}
                >
                  <div className="flex items-center gap-3"><ImageIcon className="w-4 h-4" /><span className="font-bold text-sm tracking-wide">写实摄影</span></div>
                  {!isAnime && !isVideoMode && !isTxt2VideoMode && !isImg2ImgMode && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,1)]" />}
                </button>
                <button
                  onClick={() => { setIsVideoMode(true); setIsTxt2VideoMode(false); setIsDeepThinking(false); setIsImg2ImgMode(false); }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isVideoMode && !isTxt2VideoMode && !isImg2ImgMode ? 'bg-purple-500/10 border border-purple-500/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'hover:bg-theme-bg-card-hover text-theme-text-secondary border border-transparent'}`}
                >
                  <div className="flex items-center gap-3"><Video className="w-4 h-4" /><span className="font-bold text-sm tracking-wide">视频提示词</span></div>
                  {isVideoMode && !isTxt2VideoMode && !isImg2ImgMode && <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,1)]" />}
                </button>
                <button
                  onClick={() => { setIsTxt2VideoMode(true); setIsVideoMode(false); setIsImg2ImgMode(false); if (isGptImage2Mode) { setIsGptImage2Mode(false); } }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isTxt2VideoMode ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 'hover:bg-theme-bg-card-hover text-theme-text-secondary border border-transparent'}`}
                >
                  <div className="flex items-center gap-3"><Video className="w-4 h-4" /><span className="font-bold text-sm tracking-wide">文生视频</span></div>
                  {isTxt2VideoMode && <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,1)]" />}
                </button>
                <button
                  onClick={() => { setIsImg2ImgMode(true); setIsVideoMode(false); setIsTxt2VideoMode(false); setIsAnime(false); }}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 ${isImg2ImgMode ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'hover:bg-theme-bg-card-hover text-theme-text-secondary border border-transparent'}`}
                >
                  <div className="flex items-center gap-3"><ImageIcon className="w-4 h-4" /><span className="font-bold text-sm tracking-wide">AI 图生图</span></div>
                  {isImg2ImgMode && <div className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]" />}
                </button>
              </div>
            </div>

            {/* Sub-controls (Safe mode, Characters) */}
            {!isImg2ImgMode && (
              <div className="bg-theme-bg-card border border-theme-border rounded-[2rem] p-5 backdrop-blur-xl space-y-5 shadow-2xl">
                <h3 className="text-xs font-mono text-theme-text-muted px-2 tracking-widest uppercase">参数设置 / Settings</h3>
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
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-all border select-none relative overflow-hidden ${isSafeMode ? "bg-theme-bg-card border-theme-border-strong text-theme-text-primary hover:bg-theme-bg-card-hover" : (isUncensoredMode ? "bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] animate-pulse" : "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]")}`}
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
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-all border ${isDeepThinking || isVideoMode || isTxt2VideoMode ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" : "bg-theme-bg-card border-theme-border-strong text-theme-text-muted hover:bg-theme-bg-card-hover hover:text-theme-text-secondary"}`}
                  >
                    <Brain className="w-4 h-4" />
                    {isVideoMode ? "视频提示词: 固定 grok-3" : (isTxt2VideoMode ? "文生视频: 不适用" : (isDeepThinking ? "深度思考: 开启" : "深度思考: 关闭"))}
                  </button>
                  <button
                    onClick={toggleGptImage2Mode}
                    disabled={isVideoMode || isTxt2VideoMode}
                    className={`flex items-center justify-center gap-2 py-3.5 rounded-2xl text-xs font-bold transition-all border ${isGptImage2Mode ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : (isVideoMode || isTxt2VideoMode) ? "bg-theme-bg-card border-theme-border-strong text-theme-text-placeholder cursor-not-allowed" : "bg-theme-bg-card border-theme-border-strong text-theme-text-muted hover:bg-theme-bg-card-hover hover:text-amber-300 hover:border-amber-500/30"}`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    {isGptImage2Mode ? (isImg2ImgMode ? "GPT-Image-2 图生图: 已开启" : "GPT-Image-2 文生图: 已开启") : "GPT-Image-2: 点击切换"}
                  </button>
                  {isGptImage2Mode && (
                    <div className="border rounded-xl p-2.5 bg-amber-500/10 border-amber-500/20">
                      <p className="text-[10px] text-center leading-relaxed font-mono text-amber-400/90 font-bold">
                        GPT-Image-2 模型每日仅限50次，先到先得。生成速度较慢，请耐心等待。{isImg2ImgMode ? "当前为图生图模式。" : ""}
                      </p>
                    </div>
                  )}
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
                    <label className="text-[10px] font-mono text-theme-text-muted px-2 tracking-widest uppercase block">角色数量 / Characters</label>
                    <div className="bg-theme-bg-input p-1.5 rounded-xl flex gap-1 border border-theme-border">
                      {[
                        { id: 'default', label: '随机' },
                        { id: 'solo', label: '单人' },
                        { id: 'duo', label: '双人' }
                      ].map(type => (
                        <button
                          key={type.id}
                          onClick={() => setCharacterCount(type.id as any)}
                          className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex justify-center items-center gap-1.5 ${characterCount === type.id ? "bg-theme-bg-card-hover text-theme-text-primary shadow-sm" : "text-theme-text-muted hover:text-theme-text-secondary hover:bg-theme-bg-card"}`}
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
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-theme-bg-card border border-theme-border rounded-[2rem] p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col relative z-10">
              
              {!isImg2ImgMode ? (
                <div className="flex flex-col gap-5">
                  <div>
                    <label className="text-xs font-mono text-theme-text-secondary mb-3 block tracking-widest flex items-center gap-2">
                      <Sparkles className={`w-3.5 h-3.5 ${isTxt2VideoMode ? "text-cyan-400" : "text-indigo-400"}`} /> {isTxt2VideoMode ? "视频描述 / Text to Video" : "创意描述 / 中文扩写"}
                    </label>
                    <textarea
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder={isTxt2VideoMode ? "描述你想要的视频，例如：雨夜赛博朋克街头，镜头缓慢推进，少女转身看向镜头..." : "描述你想要的画面，例如：一个赛博朋克风格的少女站在霓虹街头，雨水打湿了她的衣服..."}
                      className={`w-full bg-theme-bg-input border border-theme-border-strong rounded-2xl px-6 py-5 text-sm text-theme-text-primary placeholder-theme-text-placeholder outline-none transition-all resize-none h-40 shadow-inner ${isTxt2VideoMode ? "focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50" : "focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50"}`}
                    />
                  </div>
                  <button
                    onClick={isTxt2VideoMode ? handleGenerateVideo : handleGenerate}
                    disabled={isTxt2VideoMode ? videoLoading : loading}
                    className={`w-full py-4 rounded-2xl text-sm md:text-base font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group ${(isTxt2VideoMode ? videoLoading : loading) ? "bg-theme-bg-card text-theme-text-muted cursor-wait" : (isTxt2VideoMode ? "bg-cyan-500 text-white hover:bg-cyan-400 hover:scale-[0.98] shadow-[0_0_30px_rgba(34,211,238,0.25)]" : "bg-theme-bg-card text-theme-text-primary hover:bg-theme-bg-card-hover border border-theme-border-strong hover:scale-[0.98]")}`}
                  >
                    {(isTxt2VideoMode ? videoLoading : loading) ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Wand2 className="w-5 h-5" />}
                    {isTxt2VideoMode ? (videoLoading ? "视频生成中..." : `开始生成视频 (${VIDEO_DURATION_SECONDS}s)`) : (loading ? "灵感生成中..." : "生成提示词")}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-6 animate-in fade-in">
                  <div>
                    <label className="text-xs font-mono text-theme-text-secondary mb-3 block tracking-widest flex items-center gap-2">
                      <ImageIcon className="w-3.5 h-3.5 text-rose-400" /> 上传参考图
                    </label>
                    <div className="w-full h-56 border-2 border-dashed border-theme-border-strong rounded-2xl flex flex-col items-center justify-center bg-theme-bg-input hover:bg-theme-bg-input hover:border-rose-500/50 transition-all duration-300 relative overflow-hidden group">
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
                        <div className="flex flex-col items-center text-theme-text-muted group-hover:text-rose-400 transition-colors">
                          <div className="w-16 h-16 rounded-full bg-theme-bg-card flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500 shadow-inner">
                            <ImageIcon className="w-6 h-6 opacity-70" />
                          </div>
                          <p className="text-sm font-bold tracking-widest">点击或拖拽上传图片</p>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-30" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-theme-text-secondary mb-3 block tracking-widest">转换效果 / Style</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                      {img2ImgEffectOptions.map((effect) => (
                        <button
                          key={effect.id}
                          onClick={() => setImg2ImgEffect(effect.id)}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${img2ImgEffect === effect.id ? "bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.15)]" : "bg-theme-bg-input border-theme-border text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-bg-card-hover"}`}
                        >
                          {effect.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-mono text-theme-text-secondary mb-3 block tracking-widest">额外指令 / Optional</label>
                    <textarea
                      value={img2ImgInput}
                      onChange={(e) => setImg2ImgInput(e.target.value)}
                      placeholder="例如：换成红色的头发，背景变成赛博朋克城市..."
                      className="w-full bg-theme-bg-input border border-theme-border-strong rounded-2xl px-5 py-4 text-sm text-theme-text-primary placeholder-theme-text-placeholder focus:border-rose-500/50 focus:ring-1 focus:ring-rose-500/50 outline-none transition-all resize-none h-24 shadow-inner"
                    />
                  </div>

                  <button
                    onClick={handleImg2ImgSubmit}
                    disabled={imageLoading}
                    className={`w-full py-4 rounded-2xl text-sm md:text-base font-black tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden group ${imageLoading ? "bg-theme-bg-card text-theme-text-muted cursor-wait" : "bg-rose-500 text-white hover:bg-rose-400 hover:scale-[0.98] shadow-[0_0_30px_rgba(244,63,94,0.3)]"}`}
                  >
                    {imageLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                    {imageLoading ? "图像处理中..." : "开始图生图"}
                  </button>
                </div>
              )}
            </div>
            
            {/* Prompt Results (Moved here) */}
            {!isImg2ImgMode && !isTxt2VideoMode && (
              <div className="bg-theme-bg-card border border-theme-border rounded-[2rem] p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col gap-5 animate-in fade-in slide-in-from-top-4">
                <h3 className="text-xs font-mono text-theme-text-secondary tracking-widest uppercase flex items-center gap-2 border-b border-theme-border pb-4">
                  <Wand2 className="w-3.5 h-3.5" /> 生成结果 / Result
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-theme-text-muted uppercase tracking-widest">
                    <span className="dark:text-indigo-400 text-indigo-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> 正向提示词</span>
                    <button onClick={() => copyToClipboard(result.prompt, "prompt")} className="hover:text-theme-text-primary transition-colors bg-theme-bg-card px-3 py-1 rounded-lg">
                      {copied === "prompt" ? "已复制 ✓" : "复制 / Copy"}
                    </button>
                  </div>
                  <textarea
                    value={result.prompt}
                    onChange={(e) => setResult({ ...result, prompt: e.target.value })}
                    placeholder="点击「生成提示词」自动生成，或直接在此输入提示词..."
                    className="w-full p-4 bg-theme-bg-input border border-theme-border rounded-2xl font-mono text-xs leading-relaxed text-theme-prompt-positive h-32 resize-none focus:outline-none focus:border-indigo-500/50 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent shadow-inner"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[10px] font-mono text-theme-text-muted uppercase tracking-widest">
                    <span className="dark:text-rose-400 text-rose-600 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> 负向提示词</span>
                    <button onClick={() => copyToClipboard(result.negative_prompt, "negative")} className="hover:text-theme-text-primary transition-colors bg-theme-bg-card px-3 py-1 rounded-lg">
                      {copied === "negative" ? "已复制 ✓" : "复制 / Copy"}
                    </button>
                  </div>
                  <textarea
                    value={result.negative_prompt}
                    onChange={(e) => setResult({ ...result, negative_prompt: e.target.value })}
                    placeholder="lowres, bad anatomy, bad hands, text, error, missing fingers..."
                    className="w-full p-4 bg-theme-bg-input border border-theme-border rounded-2xl font-mono text-xs leading-relaxed text-theme-prompt-negative h-24 resize-none focus:outline-none focus:border-rose-500/50 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent shadow-inner"
                  />
                </div>

                {result.recommended_settings && (
                  <div className="pt-2">
                    <label className="text-[10px] font-mono text-theme-text-muted tracking-widest uppercase mb-3 block">推荐参数 / Params</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(result.recommended_settings).slice(0, 4).map(([key, value]) => (
                        <div key={key} className="bg-theme-bg-input p-3 rounded-xl border border-theme-border flex flex-col items-center justify-center text-center hover:bg-theme-bg-card-hover transition-colors">
                          <span className="text-[9px] text-theme-text-muted font-mono uppercase tracking-widest mb-1">{key.replace('_', ' ')}</span>
                          <span className="text-xs font-bold text-theme-text-primary truncate w-full" title={String(value)}>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-sm font-mono flex items-center gap-3 animate-in fade-in">
                <ShieldAlert className="w-5 h-5 shrink-0" /> {error}
              </div>
            )}

          </div>

          {/* Right Column: Preview & Image Generation */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-theme-bg-card border border-theme-border rounded-[2rem] p-6 backdrop-blur-xl shadow-2xl flex flex-col lg:sticky lg:top-6 lg:max-h-[92vh] overflow-auto">
              <div className="flex items-center justify-between text-xs font-mono text-theme-text-secondary tracking-widest mb-4 pb-4 border-b border-theme-border shrink-0">
                <span className="flex items-center gap-2 uppercase">
                  <span className={`w-2 h-2 rounded-full ${(isTxt2VideoMode ? generatedVideo : generatedImage) ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`}></span>
                  {isTxt2VideoMode ? "视频预览 / Preview" : "出图预览 / Preview"}
                </span>
                {(isTxt2VideoMode ? generatedVideo : generatedImage) && (
                  <button onClick={() => handleViewMedia((isTxt2VideoMode ? generatedVideo : generatedImage) || '', isTxt2VideoMode)} className="text-theme-text-secondary hover:text-theme-text-primary transition-colors bg-theme-bg-card px-3 py-1 rounded-lg">
                    {isTxt2VideoMode ? "查看视频 ↗" : "查看原图 ↗"}
                  </button>
                )}
              </div>
              {!isTxt2VideoMode && imageMeta?.displayModel && (
                <div className="mb-4 rounded-xl border border-theme-border-strong bg-theme-bg-input px-3 py-2 text-[11px] text-theme-text-secondary">
                  当前展示模型：<span className="text-theme-text-primary">{imageMeta.displayModel}</span>
                  {imageMeta.modelChanged && imageMeta.actualModel ? ` · 高峰期自动切换为 ${imageMeta.actualModel}` : ""}
                </div>
              )}

              {/* Generate Image Button */}
              {!isVideoMode && !isTxt2VideoMode && result?.prompt && !isImg2ImgMode && (
                <div className="mb-4 shrink-0">
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] font-mono text-theme-text-muted uppercase tracking-widest">
                      <span>生成比例</span>
                      <span className="text-theme-text-placeholder">{imageAspectRatio}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {aspectRatioOptions.map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => selectImageAspectRatio(ratio)}
                          disabled={imageLoading}
                          className={`px-3 py-1.5 rounded-lg text-xs font-black tracking-widest transition-colors border ${imageAspectRatio === ratio ? "bg-amber-300/15 text-amber-200 border-amber-300/30" : "bg-theme-bg-card text-theme-text-primary border-theme-border-strong hover:bg-theme-bg-card-hover"} ${imageLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                        >
                          {ratio === "auto" ? "AUTO" : ratio}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleGenerateImage(result.prompt)}
                    disabled={imageLoading}
                    className={`w-full py-4 rounded-2xl font-black text-sm tracking-widest uppercase transition-all duration-300 flex justify-center items-center gap-3 relative overflow-hidden ${imageLoading ? "bg-indigo-500/20 text-indigo-400/50 cursor-wait border border-indigo-500/30" : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] hover:scale-[0.98]"}`}
                  >
                    {imageLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
                    {imageLoading ? "图片生成中..." : "一键生成画面"}
                  </button>
                </div>
              )}

              {isTxt2VideoMode ? (
                generatedVideo ? (
                  <div className="flex-1 relative rounded-2xl overflow-hidden border border-theme-border-strong bg-theme-bg-input shadow-inner min-h-0 p-2">
                    <video src={generatedVideo} controls className="w-full h-full rounded-xl object-contain bg-black" />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-theme-text-muted border-2 border-dashed border-theme-border rounded-2xl bg-theme-bg-input relative overflow-hidden min-h-0">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
                    <Video className="w-16 h-16 mb-4 opacity-20" />
                    <p className="text-sm font-mono tracking-widest opacity-50">暂无生成视频</p>
                    <p className="text-[10px] font-mono tracking-widest opacity-30 mt-2">No video generated yet</p>
                  </div>
                )
              ) : generatedImagePreviewSrc ? (
                <div className="w-full relative rounded-2xl overflow-hidden border border-theme-border-strong bg-theme-bg-input flex justify-center items-center shadow-inner group" style={imagePreviewStyle}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={generatedImagePreviewSrc} alt="Generated" loading="eager" referrerPolicy="no-referrer" className="w-full h-full object-contain absolute inset-0 transition-transform duration-700 group-hover:scale-105" />
                </div>
              ) : (
                <div className="w-full flex flex-col items-center justify-center text-theme-text-muted border-2 border-dashed border-theme-border rounded-2xl bg-theme-bg-input relative overflow-hidden" style={imagePreviewStyle}>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-overlay backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowSponsor(false)}>
          <div className="relative bg-theme-bg-card border border-theme-border-strong p-8 rounded-[2rem] shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSponsor(false)} className="absolute top-4 right-4 text-theme-text-muted hover:text-theme-text-primary transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="text-center mb-6">
              <Heart className="w-8 h-8 text-rose-500 mx-auto mb-3" />
              <h3 className="text-2xl font-black text-theme-text-primary tracking-wide">赞助支持</h3>
              <p className="text-sm text-theme-text-secondary mt-2 font-light">您的支持是持续迭代的动力</p>
            </div>
            <div className="bg-white p-3 rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/zanzhu.png" alt="Sponsor QR" className="w-full h-auto rounded-xl" />
            </div>
          </div>
        </div>
      )}
      {showSponsorBoard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-theme-overlay backdrop-blur-md p-4 animate-in fade-in" onClick={() => setShowSponsorBoard(false)}>
          <div className="relative bg-theme-bg-card border border-theme-border-strong p-6 rounded-[2rem] shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowSponsorBoard(false)} className="absolute top-4 right-4 text-theme-text-muted hover:text-theme-text-primary transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="mb-5 pr-8">
              <div className="flex items-center gap-2 text-amber-300 mb-2">
                <Trophy className="w-5 h-5" />
                <h3 className="text-xl font-black tracking-wide">赞赏榜</h3>
              </div>
              <p className="text-xs text-theme-text-secondary">排名不分先后，按时间顺序展示</p>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[62vh] pr-1">
              {sponsorBoard.map((item, index) => (
                <div key={`${item.name}-${item.time}-${index}`} className="flex items-center justify-between bg-theme-bg-card border border-theme-border-strong rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-theme-text-primary">{item.name}</p>
                    <p className="text-xs text-theme-text-secondary">{item.time}</p>
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
