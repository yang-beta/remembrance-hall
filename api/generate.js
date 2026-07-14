// api/generate.js (通用 API 轉發 - 20260714)

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    
    if (!apiKey) {
        return res.status(400).json({ error: '後端未偵測到 NEXT_PUBLIC_GEMINI_KEY 環境變數，請確認 Vercel 後台已填寫。' });
    }

    try {
        const { prompt } = req.body;
        const apiUrl = "https://api.groq.com/openai/v1/chat/completions";

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

        const data = await response.json();

        if (!response.ok) {
            return res.status(200).json({ text: `[系統通道調整中]：${JSON.stringify(data)}` });
        }

        const responseText = data.choices?.[0]?.message?.content?.trim() || "未能成功生成思念文字。";
        return res.status(200).json({ text: responseText });

    } catch (error) {
        console.error('後端轉發錯誤:', error);
        return res.status(200).json({ text: `[通道維護報告]：${error.message}` });
    }
}
