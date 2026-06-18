# 部署说明

## GitHub + Zeabur 部署流程

### 1. GitHub 准备

#### 1.1 确保已提交所有更改
```bash
git add .
git commit -m "优化图生图错误处理和更新赞赏榜"
git push origin main
```

#### 1.2 检查 .gitignore
确保以下文件/目录不会被上传：
- ✅ `node_modules/` - 依赖目录
- ✅ `.next/` - 构建输出
- ✅ `.env` - 环境变量（敏感信息）
- ✅ `prisma/dev.db` - 开发数据库

### 2. Zeabur 部署配置

#### 2.1 在 Zeabur 创建项目
1. 登录 [Zeabur](https://zeabur.com)
2. 创建新项目
3. 连接 GitHub 仓库
4. 选择 `anime-creative` 项目

#### 2.2 配置环境变量
在 Zeabur 控制台设置以下环境变量：

**必需的环境变量**：
```bash
# JWT密钥（随机生成一个复杂字符串）
JWT_SECRET=your-super-secret-jwt-key-here

# AI API配置（可选，有默认值）
GROK2API_KEY=your-api-key
GROK2API_ENDPOINT=your-api-endpoint
GROK2API_MODEL=your-model-name
```

**可选的环境变量**：
```bash
# 邮件服务配置（如需邮件功能）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
```

#### 2.3 数据库配置
项目使用 SQLite 数据库，Zeabur 会自动持久化数据。

**重要提示**：
- SQLite 数据库文件存储在 `/app/prisma/dev.db`
- Zeabur 会自动配置持久化存储
- 数据库会在首次部署时自动初始化

### 3. 部署步骤

#### 3.1 自动部署
Zeabur 会自动检测 Dockerfile 并使用 Docker 部署：
1. 拉取代码
2. 构建镜像
3. 运行容器
4. 自动启动服务

#### 3.2 查看部署日志
在 Zeabur 控制台查看部署日志，确保：
- ✅ 依赖安装成功
- ✅ Prisma 客户端生成成功
- ✅ 数据库初始化成功
- ✅ Next.js 构建成功
- ✅ 服务启动成功

### 4. 部署后验证

#### 4.1 检查服务状态
- 访问 Zeabur 提供的域名
- 检查首页是否正常加载
- 测试图生图功能

#### 4.2 测试功能
1. **文生图**：输入提示词生成图片
2. **图生图**：上传图片并输入提示词
3. **赞赏榜**：查看新增的赞助记录

### 5. 常见问题

#### 5.1 构建失败
**问题**：`npm install` 失败
**解决**：检查 `package.json` 依赖版本

**问题**：Prisma 生成失败
**解决**：检查 `prisma/schema.prisma` 语法

#### 5.2 运行时错误
**问题**：数据库连接失败
**解决**：检查 `DATABASE_URL` 环境变量

**问题**：API 调用失败
**解决**：检查 API Key 和 Endpoint 配置

#### 5.3 图生图报错
**问题**：图片上传失败
**解决**：
- 检查图片URL是否可访问
- 检查图片大小是否超过10MB
- 查看错误日志获取详细信息

### 6. 更新部署

#### 6.1 代码更新
```bash
git add .
git commit -m "更新说明"
git push origin main
```
Zeabur 会自动检测并重新部署。

#### 6.2 环境变量更新
在 Zeabur 控制台修改环境变量后，服务会自动重启。

### 7. 监控与日志

#### 7.1 查看日志
在 Zeabur 控制台：
- 实时查看控制台输出
- 查看错误日志
- 监控资源使用情况

#### 7.2 错误追踪
所有错误都会记录到 `GenerationLog` 表：
- 错误码
- 错误消息
- 详细错误信息
- 时间戳

### 8. 备份与恢复

#### 8.1 数据库备份
SQLite 数据库文件存储在持久化卷中：
- 定期备份 `/app/prisma/dev.db` 文件
- 可通过 Zeabur 控制台下载备份

#### 8.2 数据恢复
如需恢复数据：
1. 停止服务
2. 上传备份的数据库文件
3. 重启服务

---

## 技术支持

如遇问题，请检查：
1. Zeabur 部署日志
2. 应用错误日志
3. 数据库日志
4. 环境变量配置

## 更新日志

### 2024-04-02
- ✅ 优化图生图错误处理
- ✅ 添加图片验证功能
- ✅ 增强错误日志记录
- ✅ 修复 `[object Object]` 错误显示
- ✅ 更新赞赏榜数据
- ✅ 添加 `.gitignore` 文件
- ✅ 优化部署配置
