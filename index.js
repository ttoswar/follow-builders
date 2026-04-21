const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchAllData() {
    console.log("📥 正在从 GitHub 拉取全量数据 (X, Blogs, Podcasts)...");
    const baseUrl = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/';
    
    // 同时请求三个数据源
    const [xRes, blogRes, podRes] = await Promise.all([
        fetch(baseUrl + 'feed-x.json').then(res => res.json()),
        fetch(baseUrl + 'feed-blogs.json').then(res => res.json()),
        fetch(baseUrl + 'feed-podcasts.json').then(res => res.json())
    ]);

    // 1. 处理 X 数据 (结构是：作者列表 -> tweets 数组)
    const xItems = [];
    if (xRes.x && Array.isArray(xRes.x)) {
        xRes.x.forEach(builder => {
            if (builder.tweets && Array.isArray(builder.tweets)) {
                builder.tweets.forEach(tweet => {
                    xItems.push({
                        type: 'X (Twitter)',
                        author: builder.name || builder.handle,
                        content: tweet.text,
                        url: tweet.url,
                        time: tweet.createdAt
                    });
                });
            }
        });
    }
    // 按时间倒序排，取最新的 15 条
    const finalX = xItems.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 15);

    // 2. 处理博客数据 (字段名是 blogs)
    const finalBlogs = (blogRes.blogs || []).slice(0, 5).map(item => ({
        type: 'Official Blog',
        author: item.author || 'AI Team',
        title: item.title,
        content: item.content_text || item.summary || "请阅读原文了解详情",
        url: item.url
    }));

    // 3. 处理播客数据 (字段名是 podcasts)
    const finalPods = (podRes.podcasts || []).slice(0, 5).map(item => ({
        type: 'Podcast',
        title: item.title,
        content: item.summary || item.description || "包含最新技术讨论",
        url: item.url
    }));

    console.log(`✅ 抓取完成: X(${finalX.length}), Blogs(${finalBlogs.length}), Podcasts(${finalPods.length})`);
    return { xItems: finalX, blogItems: finalBlogs, podItems: finalPods };
}

async function generateSummary(data) {
    const { xItems, blogItems, podItems } = data;
    // 如果三个源全部为空，才跳过
    if (xItems.length === 0 && blogItems.length === 0 && podItems.length === 0) {
        console.log("📭 没有任何新内容，跳过。");
        return;
    }

    console.log("🧠 正在调用 Gemini 生成全量精华简报...");

    const fullContext = [
        "### Builder 观点 (X/Twitter)",
        ...xItems.map(i => `作者: ${i.author}\n内容: ${i.content}\n原文链接: ${i.url}`),
        "\n### 官方技术博客",
        ...blogItems.map(i => `标题: ${i.title}\n作者: ${i.author}\n内容简述: ${i.content}\n阅读全文: ${i.url}`),
        "\n### 顶级 AI 播客",
        ...podItems.map(i => `标题: ${i.title}\n要点摘要: ${i.content}\n收听链接: ${i.url}`)
    ].join('\n\n---\n\n');

    const prompt = `你是一个专业的 AI 行业观察员。请阅读以下三个来源的最新动态，生成一份极简且硬核的 HTML 邮件简报。

要求：
1. **结构化呈现**：清晰划分为“Builder 洞察 (X)”、“技术长文 (Blogs)”、“音频精华 (Podcasts)”三个板块。
2. **深度提炼**：不要简单的翻译，要总结出其中的核心技术变动、新工具发布或行业洞见。
3. **原文链接**：每一条资讯的末尾必须提供[查看原文]或[阅读全文]的超链接。
4. **精美排版**：使用现代、高端的内联 CSS。包括卡片设计、优雅的衬线字体、合理的间距、浅灰色背景。
5. **只输出 HTML 代码**，不要任何 Markdown 标记（如 \`\`\`html）。

内容原文如下：\n${fullContext}`;

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
    console.log("✅ 全量 HTML 简报已成功生成！");
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
