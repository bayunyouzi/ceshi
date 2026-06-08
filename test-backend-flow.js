// 完整模拟后端 API 处理流程

const GPT_IMAGE_2_API_KEY = "sk-a74cccffcda0c7b918873bfbaac1dcb7c3914f9758838d797b7d6d10124795aa";
const GPT_IMAGE_2_API_ENDPOINT = "https://yzgpt.zeabur.app/v1/images/generations";
const GPT_IMAGE_2_MODEL = "gpt-image-2";

const normalizeEndpoint = (raw, fallback, routeKind, isImg2Img) => {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (isImg2Img) {
      url.pathname = "/v1/images/generations";
    } else if (pathname === "/v1/chat/completions") {
      url.pathname = routeKind === "video" ? "/v1/videos/generations" : "/v1/images/generations";
    } else if (pathname === "/v1" || pathname === "") {
      url.pathname = routeKind === "video" ? "/v1/videos/generations" : "/v1/images/generations";
    }
    return url.toString();
  } catch {
    return fallback;
  }
};

const isImagesGenerationEndpoint = (endpoint) => {
  try {
    const url = new URL(endpoint);
    return /\/images\/generations\/?$/i.test(url.pathname);
  } catch {
    return /\/images\/generations\/?$/i.test(endpoint);
  }
};

const isGptImage2Model = (model) => {
  if (!model) return false;
  return /gpt-image-2/i.test(model);
};

const ASPECT_RATIO_SIZES = {
  "1:1": { width: 1024, height: 1024 },
  "4:3": { width: 1280, height: 720 },
  "3:4": { width: 720, height: 1280 },
  "16:9": { width: 1280, height: 720 },
  "9:16": { width: 720, height: 1280 },
  "3:2": { width: 1792, height: 1024 },
  "2:3": { width: 1024, height: 1792 }
};

async function testGPTImage2Flow() {
  console.log('\n========================================');
  console.log('模拟后端处理 GPT-Image-2 请求流程');
  console.log('========================================\n');

  // 模拟前端发送的请求参数
  const requestBody = {
    prompt: "a cute fluffy cat",
    aspectRatio: "1:1",
    apiKey: GPT_IMAGE_2_API_KEY,
    apiEndpoint: GPT_IMAGE_2_API_ENDPOINT,
    modelName: GPT_IMAGE_2_MODEL
  };

  console.log('1️⃣ 前端请求参数:');
  console.log(JSON.stringify(requestBody, null, 2));
  console.log();

  // 后端处理逻辑
  const { prompt, aspectRatio, apiKey, apiEndpoint, modelName } = requestBody;
  
  const isVideo = false;
  const isImg2Img = false;
  const isGpt2Model = modelName && isGptImage2Model(modelName);
  
  console.log('2️⃣ 后端参数处理:');
  console.log(`  isVideo: ${isVideo}`);
  console.log(`  isImg2Img: ${isImg2Img}`);
  console.log(`  isGpt2Model: ${isGpt2Model}`);
  console.log(`  modelName: ${modelName}`);
  console.log();

  const finalApiKey = apiKey;
  const finalEndpoint = normalizeEndpoint(apiEndpoint, "fallback", "image", isImg2Img);
  const finalModel = modelName;
  const actualModel = finalModel;
  const useImagesGenerationApi = !isVideo && isImagesGenerationEndpoint(finalEndpoint);

  console.log('3️⃣ 最终参数:');
  console.log(`  finalApiKey: ${finalApiKey.substring(0, 8)}...`);
  console.log(`  finalEndpoint: ${finalEndpoint}`);
  console.log(`  finalModel: ${finalModel}`);
  console.log(`  actualModel: ${actualModel}`);
  console.log(`  useImagesGenerationApi: ${useImagesGenerationApi}`);
  console.log();

  const aspectKey = aspectRatio;
  const aspectSize = aspectKey && ASPECT_RATIO_SIZES[aspectKey] ? ASPECT_RATIO_SIZES[aspectKey] : null;
  const finalPrompt = aspectSize
    ? `${prompt}\n\nAspect ratio: ${aspectKey}. Output must be exactly ${aspectSize.width}x${aspectSize.height} (STRICT).`
    : prompt;

  console.log('4️⃣ Prompt 处理:');
  console.log(`  aspectKey: ${aspectKey}`);
  console.log(`  aspectSize: ${JSON.stringify(aspectSize)}`);
  console.log(`  finalPrompt: ${finalPrompt.substring(0, 100)}...`);
  console.log();

  // 构建请求 payload
  let requestPayload;
  if (useImagesGenerationApi) {
    requestPayload = {
      model: actualModel,
      prompt: finalPrompt,
      n: 1,
      response_format: "url",
      size: `${aspectSize?.width ?? 1024}x${aspectSize?.height ?? 1024}`
    };
  } else {
    requestPayload = {
      model: actualModel,
      messages: [{ role: "user", content: finalPrompt }],
      stream: false,
      max_tokens: 4096
    };
  }

  // 添加额外尺寸参数
  if (aspectSize) {
    requestPayload.size = `${aspectSize.width}x${aspectSize.height}`;
    requestPayload.width = aspectSize.width;
    requestPayload.height = aspectSize.height;
    requestPayload.aspect_ratio = aspectKey;
    requestPayload.image_size = { width: aspectSize.width, height: aspectSize.height };
  }

  console.log('5️⃣ 请求 Payload:');
  console.log(JSON.stringify(requestPayload, null, 2));
  console.log();

  // 发送请求
  console.log('6️⃣ 发送请求到 GPT-Image-2 API...');
  const startTime = Date.now();

  try {
    const response = await fetch(finalEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalApiKey}`
      },
      body: JSON.stringify(requestPayload)
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`  响应状态: ${response.status} (耗时: ${elapsed}秒)`);
    console.log();

    const responseText = await response.text();
    console.log('7️⃣ 原始响应:');
    console.log(responseText.substring(0, 500));
    console.log();

    if (!response.ok) {
      console.log('❌ API 请求失败!');
      console.log(`  Status: ${response.status}`);
      console.log(`  Body: ${responseText}`);
      return;
    }

    const data = JSON.parse(responseText);
    
    // 提取图片 URL
    let imageUrl = data?.data?.[0]?.url || 
                   data?.images?.[0]?.url || 
                   data?.images?.[0]?.image_url ||
                   data?.output?.[0] ||
                   data?.result?.url;

    console.log('8️⃣ 图片 URL 提取:');
    console.log(`  data?.data?.[0]?.url: ${data?.data?.[0]?.url || 'null'}`);
    console.log(`  最终 imageUrl: ${imageUrl || 'null'}`);
    console.log();

    // 修复 http 为 https
    if (imageUrl && imageUrl.startsWith('http://yzgpt.zeabur.app/')) {
      imageUrl = imageUrl.replace('http://yzgpt.zeabur.app/', 'https://yzgpt.zeabur.app/');
      console.log('  ✅ 已修复 http 为 https');
      console.log(`  修复后 URL: ${imageUrl}`);
    }

    if (imageUrl) {
      console.log('\n✅ 测试成功!');
      console.log(`图片地址: ${imageUrl}`);
    } else {
      console.log('\n❌ 未能提取图片 URL');
    }

  } catch (error) {
    console.log(`\n❌ 请求异常: ${error.message}`);
    console.log(error.stack);
  }
}

testGPTImage2Flow();
