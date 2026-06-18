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

// 模拟 GPT-Image-2 的请求
const apiEndpoint = "https://yzgpt.zeabur.app/v1/images/generations";
const fallback = "http://default.endpoint/v1/chat/completions";
const finalEndpoint = normalizeEndpoint(apiEndpoint, fallback, "image", false);

console.log("=== GPT-Image-2 端点处理测试 ===");
console.log("输入端点:", apiEndpoint);
console.log("处理后端点:", finalEndpoint);
console.log("isImagesGenerationEndpoint:", isImagesGenerationEndpoint(finalEndpoint));
