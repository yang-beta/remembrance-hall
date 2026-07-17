// api/generate.js (通用 API 轉發 - 20260714)

/**
 * ============================================================================
 * 🔌 洸限 (Absence Resonance) - 後端 Serverless API 轉發中心
 * ────────────────────────────────────────────────────────────────────────────
 * 【核心用途】
 *  本檔案為部署於 Vercel 的無伺服器 API 接口（Serverless Function）。
 *  主要負責接收前端傳來的思念細節 prompt，並在「安全保護」的前提下，
 *  將其附加後端環境變數中的金鑰，轉發至 Groq 雲端高速推理伺服器進行 AI 文字生成[cite: 32]。
 * 
 * 【安全防護與架構設計原理】
 *  - **防範金鑰洩漏：** API 密鑰（如本專案使用的 Groq API Key）屬於極度敏感資訊。
 *    若直接放在前端 `app.js` 的程式碼中，任何人都可以透過瀏覽器的「開發者工具 (F12)」或網路封包截獲該金鑰，造成盜刷風險[cite: 32]。
 *  - **後端代理（Backend Proxy）：** 我們將金鑰安全地存放在 Vercel 雲端後台的環境變數（Environment Variables）中，
 *    前端發送請求時不攜帶任何 Key，而是由本 Node.js 函式在伺服器端讀取環境變數、填入 Headers 後發送給 Groq[cite: 32]。
 *    如此一來，金鑰將對外完全隱蔽。
 * ============================================================================
 */

export default async function handler(req, res) {
    // 🛡️ 安全限制 1：僅允許 POST 請求方法。拒絕 GET/PUT/DELETE 等非法探測[cite: 32]
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 🔑 自伺服器環境變數中讀取密鑰（此處映射為 Vercel 設定的 NEXT_PUBLIC_GEMINI_KEY）[cite: 32]
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    
    // 🛡️ 安全檢查 2：若雲端平台尚未配置金鑰環境變數，立即中斷並發出明確警告，防止伺服器持續空轉[cite: 32]
    if (!apiKey) {
        return res.status(400).json({ error: '後端未偵測到 NEXT_PUBLIC_GEMINI_KEY 環境變數，請確認 Vercel 後台已填寫。' });
    }

    try {
        // 📥 解析前端發送過來的請求主體（Request Body），提取 userPrompt[cite: 32]
        const { prompt } = req.body;
        
        // 🌐 Groq 高速推理伺服器的 OpenAI 相容 API 端點[cite: 32]
        const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

        /**
         * 【API 轉發與請求調用流程】
         *  1. **Headers 設置：** 
         *     - Content-Type: 設定為 application/json。
         *     - Authorization: 夾帶 Bearer Token（自動修剪前後空白 `.trim()`），此時密鑰是在安全的伺服器端注入[cite: 32]。
         *  2. **Payload 參數配置（符合 OpenAI 標準格式）：**
         *     - `model`: 選用當前高性價比、理解複雜情感能力強的 Llama 3.3 70B 模型 (`llama-3.3-70b-versatile`)[cite: 32]。
         *     - `messages`: 以對話陣列格式封裝前端傳入的 prompt[cite: 32]。
         *     - `temperature`: 設定為 `0.7`。此數值能兼顧文字生成的「創意、溫柔度」與「邏輯語法嚴謹度」[cite: 32]。
         */
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", 
                messages: [
                    { role: "user", content: prompt }
                ],
                temperature: 0.7
            })
        });

        // 🔄 解析第三方伺服器回傳的 JSON 原始數據[cite: 32]
        const data = await response.json();

        // 🛡️ 容錯處理：若 Groq 伺服器發生異常（如超載、配額用盡、參數錯誤），不讓前端發生 Crash 崩潰[cite: 32]
        // 回傳狀態碼 200，但包裹錯誤狀態包供前端 app.js 進行友善的通道異常提示[cite: 32]。
        if (!response.ok) {
            return res.status(200).json({ text: `[系統通道調整中]：${JSON.stringify(data)}` });
        }

        /**
         * 【回傳提取邏輯】
         *  - 標準 OpenAI 回傳結構為：`data.choices[0].message.content`[cite: 32]。
         *  - 使用安全鏈運算子（?.）進行多層防護，若結構完整則提取生成的語錄並去除兩端空白字元[cite: 32]。
         *  - 若有意外缺失（如空字串），則使用備用預設詞「未能成功生成思念文字。」[cite: 32]
         */
        const responseText = data.choices?.[0]?.message?.content?.trim() || "未能成功生成思念文字。";
        
        // 🎉 成功生成：將經過 AI 梳理、溫柔淬鍊的文本以 JSON 物件的形式返回給前端 `app.js` 渲染[cite: 32]
        return res.status(200).json({ text: responseText });

    } catch (error) {
        // 🚨 系統崩潰與異常捕獲 (如網際網路斷線、請求超時等極限狀況)[cite: 32]
        console.error('後端轉發錯誤:', error);
        
        // 封裝異常日誌報告，優雅回傳，保障前端對話流程不受阻塞而無限期等待[cite: 32]
        return res.status(200).json({ text: `[通道維護報告]：${error.message}` });
    }
}
