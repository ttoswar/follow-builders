// index.js
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchBuildersData() {
    console.log("📥 正在从 follow-builders 拉取最新数据...");
    // 聚合了 X/Twitter 的 Builder 动态
    const feedUrl = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
    const response = await fetch(feedUrl);
    const data = await response.json();
    return data.items.slice(0, 15); // 取最新的 15 条
}

async function generateSummary(items) {
    console.log("🧠 正在调用 Gemini 进行深度总结...");
    
    const contentText = items.map(item => `作者: ${item.author.name}\n内容: ${item.content_text}`).join('\n\n---\n\n');
    
    const prompt = `你是一个专业的 AI 行业观察员。请阅读以下近期顶尖 AI Builder 的动态，过滤掉无意义的日常，提取出技术趋势、新工具发布或深度见解。
请用中文输出一份格式精美的 Markdown 简报。
动态内容如下：\n${contentText}`;

    // 使用 Gemini 1.5 Flash (速度快且免费额度高)
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    const result = await response.json();
    return result.candidates[0].content.parts[0].text;
}

async function main() {
    try {
        const items = await fetchBuildersData();
        const summary = await generateSummary(items);
        
        // 将结果写入文件，方便后续 GitHub Action 读取并发送邮件
        const fs = require('fs');
        fs.writeFileSync('digest.md', summary);
        console.log("✅ 摘要已生成至 digest.md");
    } catch (error) {
        console.error("❌ 执行出错:", error);
        process.exit(1);
    }
}

main();
