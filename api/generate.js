// api/generate.js (Bearer 憑證通道版 — 徹底馴服 AQ. 新版金鑰)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    
    if (!apiKey) {
        return res.status(400).json({ error: '後端未偵測到 NEXT_PUBLIC_GEMINI_KEY 環境變數' });
    }

    try {
        const { prompt } = req.body;

        // 🎯 核心修正 1：URL 網址不帶 key 參數，走純淨的官方端點
        const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent`;

        // 🎯 核心修正 2：將 AQ. 金鑰作為 Bearer Token 塞進 Authorization 標頭中
        // 這正是 Google 錯誤訊息中提示的 "Expected OAuth 2 access token" 正確傳遞姿勢！
        const response = await fetch(googleUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey.trim()}`
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

        if (!response.ok) {
            const errText = await response.text();
            return res.status(200).json({ text: `[Google 伺服器拒絕連線]：${errText}` });
        }

        const data = await response.json();
        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "未能成功生成思念文字。";

        return res.status(200).json({ text: responseText });

    } catch (error) {
        console.error('後端轉發錯誤:', error);
        return res.status(200).json({ text: `[後端轉發錯誤報告]：${error.message}` });
    }
}
