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
    const fullContext = [
        ...xItems.map(i => `[X推文] 作者:${i.author} | 内容:${i.content} | 链接:${i.url}`),
        ...blogItems.map(i => `[技术博客] 标题:${i.title} | 内容简述:${i.content} | 链接:${i.url}`),
        ...podItems.map(i => `[顶级播客] 标题:${i.title} | 摘要:${i.content} | 链接:${i.url}`)
    ].join('\n\n---\n\n');

    const prompt = `你是一个专业的 AI 行业观察员。请阅读以下来自顶尖 AI Builder、技术博客和播客的动态，生成一份极简且硬核的 HTML 邮件简报。

要求：
1. **结构分明**：分为“Builder 观点 (X)”、“深度技术长文 (Blogs)”、“播客精华 (Podcasts)”三个板块。
2. **提炼价值**：不要逐条翻译，而是提取出最值得关注的技术趋势、产品更新或深度洞察。
3. **保留链接**：每个条目或板块末尾必须包含对应的[查看原文]超链接。
4. **视觉风格**：使用现代感强的内联 CSS。卡片式布局、浅灰色背景、深色优雅文字、蓝色链接。
5. **纯净输出**：只返回 HTML 代码，不要任何 Markdown 标记。

内容原文如下：\n${fullContext}`;

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
