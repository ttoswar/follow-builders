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

    // 1. 处理 X 数据 (修正嵌套结构：作者 -> tweets 数组)
    const xItems = [];
    if (xRes.x && Array.isArray(xRes.x)) {
        xRes.x.forEach(builder => {
            if (builder.tweets && Array.isArray(builder.tweets)) {
                builder.tweets.forEach(tweet => {
                    xItems.push({
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

    // 2. 处理博客数据 (注意：字段名是 blogs)
    const finalBlogs = (blogRes.blogs || []).slice(0, 5).map(item => ({
        author: item.author || 'AI Team',
        title: item.title,
        content: item.content_text || item.summary || "点击链接查看全文",
        url: item.url
    }));

    // 3. 处理播客数据 (注意：字段名是 podcasts)
    const finalPods = (podRes.podcasts || []).slice(0, 5).map(item => ({
        title: item.title,
        content: item.summary || item.description || "包含最新技术讨论",
        url: item.url
    }));

    console.log(`✅ 抓取完成: X(${finalX.length}), Blogs(${finalBlogs.length}), Podcasts(${finalPods.length})`);
    return { xItems: finalX, blogItems: finalBlogs, podItems: finalPods };
}

async function generateSummary(data) {
    const { xItems, blogItems, podItems } = data;
    if (xItems.length === 0 && blogItems.length === 0 && podItems.length === 0) {
        console.log("📭 没有任何新内容，跳过。");
        return;
    }

    console.log("🧠 正在调用 Gemini 生成全量精华简报...");

    // 严谨的数据拼接逻辑
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

    const prompt = `你是一个专业的 AI 行业观察员，负责根据提供的【数据来源清单】生成一份 HTML 邮件简报。

### 核心任务：
1. **按博主分组 (X/Twitter)**：
   - 必须以“博主姓名”作为小标题。
   - 在该博主下，**逐条列出**其发布的每条推文总结。
   - **严禁聚合成段落**：每一条原始推文必须对应一个独立的列表项或摘要点。
   - **链接精准对齐**：每条推文摘要后面必须紧跟其对应的 [查看原文] 链接。

2. **处理博客与播客**：
   - 博客和播客依然按照独立条目列出，包含标题、简述和[阅读全文]链接。

3. **严格指令**：
   - **禁止幻想**：若某板块无数据，则完全不显示该板块标题和内容。
   - **禁止编造链接**：必须直接使用清单提供的 URL，确保 <a> 标签的 href 属性完整。
   - **语言风格**：硬核、专业、精炼。

### HTML/CSS 样式要求：
- **容器**：背景 #f6f8fa，主体宽度 600px，居中。
- **卡片**：每个博主或每个板块使用白色背景 (#ffffff) 的卡片，带圆角和微弱阴影。
- **文字**：标题使用深色 (#24292f)，正文使用灰黑色 (#444d56)，字号 14px，行高 1.6。
- **链接**：蓝色 (#0969da)，去掉下划线，增强点击感。
- **纯净输出**：只返回 HTML 代码，不带 Markdown 代码块标记。

【数据来源清单如下】：
${fullContext}`;

    // 使用你验证过可行的端点
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
    
    // 彻底清理可能存在的 Markdown 标签
    htmlContent = htmlContent.replace(/```html/gi, '').replace(/```/gi, '').trim();
    
    require('fs').writeFileSync('digest.html', htmlContent);
    // 在原有的生成 html 代码下方加上：
    const markdownContent = `# 今日 AI Builder 动态\n\n${fullContext}`;
    fs.writeFileSync('digest.md', markdownContent);
    console.log("✅ HTML与MD简报均已成功生成！");
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
