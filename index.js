const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchAllData() {
    console.log("📥 正在从 GitHub 拉取全量数据 (X, Blogs, Podcasts)...");
    const baseUrl = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/';
    const files = ['feed-x.json', 'feed-blogs.json', 'feed-podcasts.json'];
    
    try {
        const results = await Promise.all(files.map(file => fetch(baseUrl + file).then(res => res.json())));
        
        const xData = results[0].x || [];
        const blogData = results[1].items || []; // 博客通常在 items 字段
        const podcastData = results[2].items || [];

        console.log(`✅ 数据拉取成功: X(${xData.length}), Blogs(${blogData.length}), Podcasts(${podcastData.length})`);
        
        // 组装成一个综合列表
        return {
            x: xData.slice(0, 10),
            blogs: blogData.slice(0, 5),
            podcasts: podcastData.slice(0, 5)
        };
    } catch (error) {
        console.error("❌ 拉取数据失败:", error);
        throw error;
    }
}

async function generateSummary(data) {
    console.log("🧠 正在生成全量 AI 行业简报...");

    // 格式化不同来源的内容
    const xContent = data.x.map(item => `[推特] ${item.name}: ${item.text}`).join('\n');
    const blogContent = data.blogs.map(item => `[博客] ${item.title} - ${item.url}`).join('\n');
    const podcastContent = data.podcasts.map(item => `[播客] ${item.title}`).join('\n');

    const fullPrompt = `你是一个专业的 AI 行业观察员。请阅读以下三个来源的最新动态：
1. X 推特动态：\n${xContent}
2. 深度博客：\n${blogContent}
3. 播客要点：\n${podcastContent}

任务：
请输出一份 HTML 格式的邮件简报。要求：
- 使用现代、高端、极简的内联 CSS 样式。
- 分为“Builder 洞察”、“技术深读”、“音频精华”三个板块。
- 语言简练，直击要点，不要废话。
- 仅输出 HTML 代码。`;

const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API 报错详情:", errorText);
        throw new Error(`Gemini API 请求失败，状态码: ${response.status}`);
    }

    const result = await response.json();
    let htmlContent = result.candidates[0].content.parts[0].text;
    htmlContent = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();
    
    require('fs').writeFileSync('digest.html', htmlContent);
    console.log("✅ 全量简报 HTML 生成成功！");
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
