# GPT-Image-2 高清任务后端连接失败修复概览

## 背景
- 用户反馈 GPT 生图出现：`无法连接本站 GPT 生图后端，请确认 Zeabur 服务已重新部署并正常运行。`
- 该提示来自浏览器请求本站 `/api/generate-image` 失败或任务链路异常后的前端兜底提示。
- 重点排查了上次新增的 2K/4K 异步任务队列。

## 原因判断
- 上次异步队列里，后端创建任务后通过 `setTimeout` 再 `fetch(`${origin}/api/generate-image`)` 自调用本站接口继续执行真实生图。
- 这种“请求结束后后台自调用本站接口”的方式在 Zeabur/Next 部署环境里不稳：
  - 后台任务可能被平台冻结或中断。
  - 站内自调用可能受部署网络、实例、代理或服务生命周期影响。
  - 2K/4K 请求本来就很慢，更容易放大这个问题。

## 已修复
- 修改 `app/api/generate-image/route.ts`：
  - 移除异步任务里的本站自调用逻辑。
  - 新增 `runGptImageTask(...)`，任务创建后直接在同一后端逻辑里请求上游 `https://yzgpt.zeabur.app/v1/images/generations`。
  - GPT 高清任务继续保留 `queued / running / succeeded / failed` 状态。
  - 保留任务 key 防重复创建。
  - 保留 2K/4K 前端轮询逻辑，不影响 Grok 模式。
  - 图生图参考图仍会在后端转换/归一化后传给 GPT-Image-2。

## 修改文件
- `app/api/generate-image/route.ts`

## 验证结果
- `npm run build` 构建成功。

## 部署注意
- 需要重新部署 Zeabur 后线上才会生效。
- 如果部署后仍报“无法连接本站 GPT 生图后端”，优先检查 Zeabur 服务是否启动成功、实例是否崩溃、环境变量是否仍为旧值。
- 当前仍是内存任务队列，服务重启会丢任务；如果后续还要继续提升稳定性，建议升级为数据库/Redis 持久化任务队列。
