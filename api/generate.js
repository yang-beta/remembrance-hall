// api/generate.js (原生 HTTP 請求版 — 完美相容 AQ. 新版金鑰)

export default async function handler(req, res) {
    // 限制只能用 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 讀取 Vercel 後台的環境變數
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    
    if (!apiKey) {
        return res.status(400).json({ error: '後端未偵測到 NEXT_PUBLIC_GEMINI_KEY 環境變數' });
    }

    try {
        const { prompt } = req.body;

        // 🎯 繞過 SDK 限制：直接向 Google 官方 API 發送標準 HTTP POST 請求
        // 將金鑰直接帶在 URL 的 key 參數中，這是 Google 官方最底層、絕對支援 AQ. 金鑰的通道
        const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

        const response = await fetch(googleUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            { text: prompt }
                        ]
                    }
                ]
            })
        });

        // 如果 Google 回傳錯誤
        if (!response.ok) {
            const errText = await response.text();
            return res.status(200).json({ text: `[Google 伺服器拒絕連線]：${errText}` });
        }

        const data = await response.json();
        
        // 解析 Google 回傳的標準 JSON 結構，安全拿到 AI 生成的文字
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "未能成功生成思念文字。";

        // 將完美的 AI 句子回傳給前端 app.js
        return res.status(200).json({ text: responseText });

    } catch (error) {
        console.error('後端轉發錯誤:', error);
        return res.status(200).json({ text: `[後端轉發錯誤報告]：${error.message}` });
    }
}
