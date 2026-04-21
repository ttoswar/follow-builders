const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchBuildersData() {
    console.log("📥 正在拉取数据...");
    const feedUrl = 'https://raw.githubusercontent.com/zarazhangrui/follow-builders/main/feed-x.json';
    const response = await fetch(feedUrl);
    
    if (!response.ok) {
        throw new Error(`网络请求失败，状态码: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.x && Array.isArray(data.x)) {
        const itemsToProcess = data.x;
        if (itemsToProcess.length === 0) {
            console.warn("⚠️ 警告：数据源当前没有内容。");
            return [];
        }
        console.log(`✅ 成功获取 ${itemsToProcess.length} 条动态。`);
        return itemsToProcess.slice(0, 15); 
    } else {
        throw new Error("无法在 JSON 中找到 'x' 数组。");
    }
}

async function generateSummary(items) {
    if (!items || items.length === 0) {
        console.log("没有获取到内容，跳过生成步骤。");
        return;
    }

    console.log("🧠 正在生成排版精美的简报...");
    
    const contentText = items.map(item => {
        const authorName = item.name || item.handle || "未知作者";
        const text = item.text || item.full_text || item.content_text || JSON.stringify(item);
        return `作者: ${authorName}\n内容: ${text}`;
    }).join('\n\n---\n\n');
    
    const prompt = `你是一个专业的 AI 行业观察员。阅读以下顶尖 AI Builder 动态，提取技术趋势、新工具或深度见解。
请用 HTML 格式输出一份精美的邮件简报，使用现代极简风格的内联 CSS，背景淡灰，卡片式白底。
只输出纯 HTML 代码，不要任何 Markdown 标记或废话。
内容如下：\n${contentText}`;


const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!response.ok) {
        // 关键增强：把 Google 服务器返回的真实错误信息抓取并打印出来
        const errorText = await response.text();
        console.error("❌ Gemini API 返回了详细的错误信息：", errorText);
        throw new Error(`Gemini API 请求失败，状态码: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
        console.error("❌ API 返回的数据结构异常：", JSON.stringify(result));
        throw new Error("Gemini API 返回了成功状态码，但没有生成内容。");
    }

    let htmlContent = result.candidates[0].content.parts[0].text;
    htmlContent = htmlContent.replace(/```html/g, '').replace(/```/g, '').trim();
    
    const fs = require('fs');
    fs.writeFileSync('digest.html', htmlContent);
    console.log("✅ 简报 HTML 文件生成成功！");
}

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
