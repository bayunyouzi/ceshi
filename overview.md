# GPT-Image-2 401 密钥错误修复概览

## 问题原因
- 报错为 `401 INVALID_API_KEY`，不是分辨率按钮导致的尺寸问题。
- 后端 `generate-image` 里有一段“自动切换免费/备用图片 Key”的逻辑：只要请求没显式传 `apiKey` 且走 `/images/generations`，就会把 `finalApiKey` 替换成旧 Grok 图片 Key。
- GPT-Image-2 文生图现在正好也是 `/images/generations`，所以被误伤，最终拿旧 Key 去请求 `yzgpt`，导致 `INVALID_API_KEY`。
- 如果线上环境变量 `GPT_IMAGE2_API_KEY` 还残留旧 Key，也会导致同样问题。

## 已修复
- `app/api/generate-image/route.ts` 中 GPT-Image-2 请求现在强制使用 GPT-Image-2 专用 Key 和专用 endpoint。
- GPT-Image-2 不再进入旧 Grok 图片 Key 自动切换逻辑。
- GPT-Image-2 不再进入旧图片额度限制/Key 替换逻辑。
- 对已知旧 Key 做了保护：如果 `GPT_IMAGE2_API_KEY` 环境变量仍是旧 Grok Key 或旧短 Key，会自动忽略，回退到新 yzgpt Key。
- Grok 模式未改，旧 Grok 生图仍保留原来的 Key 轮换逻辑。

## 验证结果
- 直连 `https://yzgpt.zeabur.app/v1/images/generations` 使用新 Key 实测返回 200，并拿到图片结果。
- `npm run build` 构建成功。

## 修改文件
- `app/api/generate-image/route.ts`

## 部署注意
- 需要重新部署线上服务后才生效。
- 建议 Zeabur 环境变量里把 `GPT_IMAGE2_API_KEY` 设置为新 Key，或者删除旧的 `GPT_IMAGE2_API_KEY`，避免旧配置继续覆盖。当前代码已做旧 Key 兜底保护，但线上重新构建/重启仍是必须的。
