# AI Builder Daily Digest ☕

**基于 Gemini 2.5 + GitHub Actions 的自动化 AI 行业精华简报系统。**

这个项目能够每天定时从全球最顶尖的 AI 开发者、官方技术博客及播客中提取数据，通过 AI 进行深度提炼，并发送一份排版精美的 HTML 邮件到你的邮箱。

## 🌟 核心功能

* **全量数据聚合**：自动追踪 `follow-builders` 仓库提供的 X (Twitter) 推文、官方技术博客（如 Anthropic, Claude）以及顶级 AI 播客。
* **AI 深度总结**：利用 **Gemini 2.5 Flash** 模型进行内容总结。系统会自动识别博主、聚合同类信息，并提炼硬核技术洞见。
* **按博主分组 (X)**：针对 X 平台动态，系统会按博主姓名分类展示，确保每条推文都有独立的总结与原文链接。
* **防幻觉机制**：严格的 Prompt 约束，确保在无更新数据时自动隐藏对应板块，禁止编造虚假内容。
* **完全自动化**：利用 GitHub Actions 实现 0 成本定时运行，无需维护服务器。
* **现代 UI 排版**：生成的邮件采用极简现代风内联 CSS，卡片式布局，完美适配移动端与网页端。

## 🚀 快速开始

### 1. Fork 本仓库
点击右上角的 `Fork` 按钮，将项目复制到你的个人账号下。

### 2. 配置环境变量 (Secrets)
前往仓库的 **Settings > Secrets and variables > Actions**，点击 **New repository secret** 添加以下四个变量：

| 变量名 | 说明 |
| :--- | :--- |
| `GEMINI_API_KEY` | Google AI Studio 申请的 API Key |
| `MAIL_USERNAME` | 你的发件人邮箱（如 QQ 邮箱） |
| `MAIL_PASSWORD` | 邮箱 SMTP 授权码（非登录密码） |
| `RECEIVER_EMAIL` | 接收简报的邮箱地址 |

### 3. 启用 GitHub Actions
由于 GitHub 的安全限制，Fork 后的仓库需要手动开启 Actions：
1.  点击仓库上方的 **Actions** 标签。
2.  点击 **I understand my workflows, go ahead and enable them**。
3.  在左侧选择 `Daily Email Digest`，点击 **Run workflow** 进行首次手动测试。

## 📅 定时设置

默认设置在北京时间每天 **中午 12:00** 运行（对应 UTC 04:00）。如需修改，请编辑 `.github/workflows/digest.yml`：

```yaml
on:
  schedule:
    - cron: '0 4 * * *' # 北京时间 12:00
🛠️ 技术栈
Runtime: Node.js 18

LLM: Google Gemini 2.5 Flash API

Automation: GitHub Actions

Data Source: follow-builders

Email Service: SMTP (QQ Mail / Gmail etc.)

📝 免责声明
本项目生成的内容由 AI 自动提炼，仅供学习和参考。查看完整观点请务必点击邮件中的 [查看原文] 链接。
