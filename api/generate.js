import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: '後端未設定 API Key' });
        }

        const { prompt } = req.body;

        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text; // 移除括號，改用屬性或相容寫法

        return res.status(200).json({ text: typeof text === 'function' ? await text() : text });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
}
