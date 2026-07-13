// api/generate.js (Vercel 後端 Serverless Function)
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    // 限制只能用 POST 請求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // 讀取你在 Vercel 控制台填寫的環境變數
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'Vercel 後端尚未設定 NEXT_PUBLIC_GEMINI_KEY 環境變數' });
    }

    try {
        const { prompt } = req.body;
        
        // 在安全後端初始化 Google AI (支援 AQ. 金鑰)
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // 將結果傳回給前端
        return res.status(200).json({ text: responseText });
    } catch (error) {
        console.error('後端 AI 生成錯誤:', error);
        return res.status(500).json({ error: error.message || 'AI 思考過程中發生錯誤' });
    }
}
