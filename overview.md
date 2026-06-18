# 后台配置管理系统 - 实现完成

## 实现概览

已成功为项目添加完整的后台配置管理系统，支持通过管理后台直接修改所有API配置，无需修改代码。

## 新增文件
| 文件 | 说明 |
|------|------|
| `lib/config.ts` | 配置读取辅助库（带30秒缓存） |
| `app/api/admin/config/route.ts` | 配置管理API (GET/PUT) |
| `app/api/config/route.ts` | 公开配置端点（图生图提示词） |
| `scripts/seed-config.js` | 默认配置初始化脚本 |

## 修改文件
| 文件 | 修改内容 |
|------|---------|
| `prisma/schema.prisma` | 新增 Config 模型 |
| `app/admin/page.tsx` | 新增"系统配置"Tab，8个配置分类 |
| `app/api/generate/route.ts` | 使用动态配置替代硬编码 |
| `app/api/generate-image/route.ts` | 使用动态配置替代硬编码 |
| `app/api/vision/route.ts` | 使用动态配置替代硬编码 |
| `app/api/admin/overview/route.ts` | 管理员邮箱动态读取 |
| `lib/videoQuota.ts` | 视频配额动态读取 |
| `app/page.tsx` | 前端动态加载图生图提示词 |

## 管理后台功能

访问 `/admin` → 点击侧边栏"系统配置"Tab，可配置：

### API配置
- **Grok 提示词**: API Key、端点、模型
- **Grok 生图**: API Key、端点、文生图模型、图生图模型
- **GPT-Image-2**: API Key、端点、模型
- **Vision 反推**: API Key、端点、模型
- **视频生成**: API Key、端点、模型

### 系统参数
- **速率限制**: 每日免费生图上限、冷却时间、每日视频上限
- **系统设置**: 管理员邮箱、视频限制豁免邮箱
- **图生图提示词**: 12种效果的提示词(JSON格式编辑)

## 生效机制
- 配置保存后30秒内自动生效（缓存TTL）
- 无需重启服务
- 每个字段支持"还原默认"操作

## 初始化
首次使用时，配置表为空会自动填充21个默认值。也可手动运行：
```bash
node scripts/seed-config.js
```
