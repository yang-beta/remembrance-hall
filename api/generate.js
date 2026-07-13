// api/generate.js (Vercel 後端 Serverless Function)
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    console.log("GEMINI_API_KEY exists:", !!process.env.GEMINI_API_KEY);
    console.log("Key prefix:", process.env.GEMINI_API_KEY?.substring(0, 5));
    
    // 🎯 防呆：確保能拿到環境變數
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_KEY;
    
    if (!apiKey) {
        return res.status(400).json({ error: '後端未偵測到 NEXT_PUBLIC_GEMINI_KEY，請確認 Vercel 後台有正確填寫並儲存。' });
    }

    try {
        const { prompt } = req.body;
        
        // 初始化 Google AI
        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        return res.status(200).json({ text: responseText });
    } catch (error) {
        console.error('後端 AI 生成錯誤:', error);
        // 🎯 將真實的錯誤訊息傳回前端，方便我們抓漏
        return res.status(200).json({ text: `[後端錯誤報告]：${error.message}` });
    }
    console.log("API Key exists:", !!process.env.GEMINI_API_KEY);
}
