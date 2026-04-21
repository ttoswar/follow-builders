// index.js
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchBuildersData() {
    console.log("📥 正在拉取数据...");
    const feedUrl = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
    const response = await fetch(feedUrl);
    const data = await response.json();
    return data.items.slice(0, 15); 
}

async function generateSummary(items) {
    console.log("🧠 正在生成排版精美的简报...");
    const contentText = items.map(item => `作者: ${item.author.name}\n内容: ${item.content_text}`).join('\n\n---\n\n');
    
    // 让大模型直接输出带样式的 HTML
    const prompt = `你是一个专业的 AI 行业观察员。阅读以下顶尖 AI Builder 动态，提取技术趋势、新工具或深度见解。
请用 HTML 格式输出一份精美的邮件简报，使用现代极简风格的内联 CSS，背景淡灰，卡片式白底。
只输出纯 HTML 代码，不要任何 Markdown 标记或废话。
内容如下：\n${contentText}`;

    // 使用 Gemini API
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    const result = await response.json();
    let htmlContent = result.candidates[0].content.parts[0].text;
    htmlContent = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();
    
    // 生成一个 html 文件
    const fs = require('fs');
    fs.writeFileSync('digest.html', htmlContent);
    console.log("✅ 简报 HTML 文件生成成功！");
}

// 标准的顶层调用方式（完美解决报错）
async function main() {
    try {
        const items = await fetchBuildersData();
        await generateSummary(items);
    } catch (error) {
        console.error("❌ 执行出错:", error);
        process.exit(1);
    }
}

main();
