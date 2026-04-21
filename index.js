const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchAllData() {
    console.log("📥 正在拉取全量数据 (X, Blogs, Podcasts)...");
    const baseUrl = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/';
    
    // 同时请求三个数据源
    const [xRes, blogRes, podRes] = await Promise.all([
        fetch(baseUrl + 'feed-x.json').then(res => res.json()),
        fetch(baseUrl + 'feed-blogs.json').then(res => res.json()),
        fetch(baseUrl + 'feed-podcasts.json').then(res => res.json())
    ]);

    // 格式化 X 数据
    const xItems = (xRes.x || []).slice(0, 15).map(item => ({
        type: 'X (Twitter)',
        author: item.name || item.handle,
        content: item.text || item.content_text,
        url: item.url
    }));

    // 格式化 博客数据 (Anthropic, Claude 等)
    const blogItems = (blogRes.items || []).slice(0, 5).map(item => ({
        type: 'Official Blog',
        author: item.author?.name || 'AI Team',
        title: item.title,
        content: item.content_text || item.summary,
        url: item.url
    }));

    // 格式化 播客数据
    const podItems = (podRes.items || []).slice(0, 5).map(item => ({
        type: 'Podcast',
        title: item.title,
        content: item.summary || item.description,
        url: item.url
    }));

    console.log(`✅ 抓取完成: X(${xItems.length}), Blogs(${blogItems.length}), Podcasts(${podItems.length})`);
    return { xItems, blogItems, podItems };
}

async function generateSummary(data) {
    const { xItems, blogItems, podItems } = data;
    if (xItems.length === 0 && blogItems.length === 0 && podItems.length === 0) {
        console.log("📭 没有任何新内容，跳过。");
        return;
    }

    console.log("🧠 正在调用 Gemini 生成全量精华简报...");

    // 将所有内容拼接成给 AI 的上下文
  // 在 generateSummary 函数内部修改拼接逻辑
    const xContent = xItems.length > 0 
        ? xItems.map(i => `- [推特] 作者: ${i.author}\n  内容: ${i.content}\n  原文链接: ${i.url}`).join('\n\n')
        : "（当前无推特更新数据）";

    const blogContent = blogItems.length > 0
        ? blogItems.map(i => `- [博客] 标题: ${i.title}\n  作者: ${i.author}\n  简述: ${i.content}\n  原文链接: ${i.url}`).join('\n\n')
        : "（当前无博客更新数据）";

    const podContent = podItems.length > 0
        ? podItems.map(i => `- [播客] 标题: ${i.title}\n  摘要: ${i.content}\n  原文链接: ${i.url}`).join('\n\n')
        : "（当前无播客更新数据）";

    const fullContext = `【数据来源清单】\n\n1. X/Twitter 动态：\n${xContent}\n\n2. 技术博客：\n${blogContent}\n\n3. 播客动态：\n${podContent}`;

   const prompt = `你是一个专业的 AI 行业观察员，负责根据提供的【数据来源清单】生成一份极简且硬核的 HTML 邮件简报。

### 严格指令（必须遵守）：
1. **禁止幻想**：如果某个板块下显示“（当前无数据）”，则在 HTML 中**完全隐藏（不要显示）**该板块。绝对禁止编造任何虚假内容、示例或占位符。
2. **链接对齐**：每个总结条目的末尾，必须附带其对应的原始 [原文链接]。**禁止自行猜测或修改 URL**，必须直接使用清单中提供的完整链接。
3. **内容深度**：不要逐条翻译。请将相关联的推文、博客或播客合并，提炼出核心的技术变动或行业趋势。

### HTML 结构要求：
- **布局**：使用现代感强的内联 CSS。浅灰色背景 (#f6f8fa)，白色卡片式容器 (#ffffff)。
- **板块**：
    - 如果有推文，板块标题为：Builder 洞察 (X)
    - 如果有博客，板块标题为：深度技术长文 (Blogs)
    - 如果有播客，板块标题为：音频精华 (Podcasts)
- **样式**：深灰色优雅字体 (#24292f)，蓝色可点击链接 (#0969da)，合理的卡片间距和边框圆角。

### 输出限制：
- **只输出纯 HTML 代码**，不要任何 Markdown 标记（如 \`\`\`html），不要包含任何解释性的文字或注释。

【数据来源清单如下】：
${fullContext}`;

    // 使用你验证过可行的 Gemini 端点
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API 返回错误：", errorText);
        throw new Error(`Gemini API 请求失败: ${response.status}`);
    }

    const result = await response.json();
    let htmlContent = result.candidates[0].content.parts[0].text;
    htmlContent = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();
    
    const fs = require('fs');
    fs.writeFileSync('digest.html', htmlContent);
    console.log("✅ 全量 HTML 简报已生成至 digest.html");
}

async function main() {
    try {
        const data = await fetchAllData();
        await generateSummary(data);
    } catch (error) {
        console.error("❌ 执行出错:", error);
        process.exit(1);
    }
}

main();
