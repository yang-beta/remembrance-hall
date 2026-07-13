// --- AI 驅動：思念終點館 核心邏輯 (環境變數安全版) ---

// 1. 連線設定 
const SUPABASE_URL = "https://cwlxcsdqoigkutbeemvf.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_L52BGOl7tE2hBgLnqxnGoA_u6RQ3yrd";

// 💡 讀取 Vercel 環境變數的防呆寫法
const GEMINI_API_KEY = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GEMINI_KEY) 
    || window?.ENV?.NEXT_PUBLIC_GEMINI_KEY 
    || "NEXT_PUBLIC_GEMINI_KEY_PLACEHOLDER"; 

// 2. 初始化雲端服務
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🎯 先宣告全域變數
let ai;

// 當頁面加載完成自動執行
document.addEventListener('DOMContentLoaded', () => {
    // 🚀 萬能動態識別：檢查所有可能的 Google Gemini SDK 全域變數命名空間
    try {
        // 1. 印出目前全域狀態，方便排查
        console.log("偵測全域變數:", {
            googleGenerativeAI: window.googleGenerativeAI,
            GoogleGenAI: window.GoogleGenAI,
            GoogleGenerativeAI: window.GoogleGenerativeAI
        });

        // 2. 尋找有效的 SDK 進入點
        const targetSDK = window.GoogleGenAI || window.googleGenerativeAI || window.GoogleGenerativeAI;

        if (targetSDK) {
            // 情況 A：如果 SDK 是一個包含建構函式的物件 (e.g., { GoogleGenAI: ... })
            if (targetSDK.GoogleGenAI) {
                ai = new targetSDK.GoogleGenAI({ apiKey: GEMINI_API_KEY });
            } 
            // 情況 B：如果 SDK 本身就是一個建構函式，且需要物件參數
            else if (typeof targetSDK === 'function') {
                try {
                    ai = new targetSDK({ apiKey: GEMINI_API_KEY });
                } catch(e) {
                    // 情況 C：如果建構函式只需要純字串參數
                    ai = new targetSDK(GEMINI_API_KEY);
                }
            }
            
            if (ai) {
                console.log("✅ Gemini AI 成功連線！", ai);
            } else {
                throw new Error("無法成功實例化 ai 物件");
            }
        } else {
            console.error("Gemini SDK 載入失敗，請檢查網路或 CDN 連結");
        }
    } catch (e) {
        console.error("初始化 Gemini 失敗，錯誤回報:", e);
    }

    fetchWallMessages();
    initDragScroll();
    
    const today = new Date();
    document.getElementById('card-date-display').innerText = today.toLocaleDateString('zh-TW').replace(/\//g, '.');
});

// 全域變數定義
let currentTarget = 'relative';

// 選擇對象切換
function setTarget(target, element) {
    currentTarget = target;
    document.querySelectorAll('.target-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
}

// 核心：生成思念儀式卡片
async function generateRemembrance() {
    const nickname = document.getElementById('nickname').value.trim();
    const memory = document.getElementById('memory').value.trim();
    const submitBtn = document.querySelector('.btn-submit');

    if (!nickname || !memory) {
        alert('請填入稱呼與記憶細節，讓思念具體落地。');
        return;
    }

    try {
        // 優化體驗：讓按鈕變成加載中狀態，防止重複點擊
        submitBtn.innerText = "⏳ 正在引導 AI 梳理思念之緒...";
        submitBtn.disabled = true;

        // 3. 呼叫下方強大的 AI 生成函數
        const finalQuote = await generateAIQuote(currentTarget, nickname, memory);

        // 4. 更新卡片畫面的 DOM 顯示
        let targetChinese = currentTarget === 'relative' ? '親人' : currentTarget === 'friend' ? '朋友' : '寵物';
        let iconClass = currentTarget === 'relative' ? 'fa-hands-holding-child' : currentTarget === 'friend' ? 'fa-user-group' : 'fa-paw';

        document.getElementById('card-tag-display').innerText = `思念致意錄 / ${targetChinese}`;
        document.getElementById('card-icon-display').innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        document.getElementById('card-text-display').innerText = finalQuote;
        document.getElementById('card-sign-display').innerText = `— 致 ${nickname}`;
        
        const today = new Date();
        document.getElementById('card-date-display').innerText = today.toLocaleDateString('zh-TW').replace(/\//g, '.');

        document.getElementById('output-section').style.display = 'flex';

        // 5. 將 AI 生成的完美短句同步存入 Supabase 資料庫
        if (supabaseClient) {
            await saveToSupabase(targetChinese, finalQuote, nickname);
        }

    } catch (err) {
        console.error('AI 生成或儲存失敗:', err);
        alert('通道暫時擁擠，請再試一次。');
    } finally {
        // 還原按鈕狀態
        submitBtn.innerText = "⚡ 生成思念儀式卡片";
        submitBtn.disabled = false;
    }
}

// 🌟 核心：Gemini AI 智慧提示詞工程函數
async function generateAIQuote(targetType, name, userMemory) {
    let targetLabel = targetType === 'relative' ? '親人' : targetType === 'friend' ? '朋友' : '寵物';
    
    const prompt = `
        你是一位文字極具情感穿透力、細膩且內斂的當次CIS展覽文案大師。
        現在有一位參展者，他想念的對象是【${targetLabel}】，他稱呼對方為【${name}】。
        他留下的思念細節與記憶畫面是：『${userMemory}』。

        請為他撰寫一段 1 到 2 句、字數在 50~80 字內、極具文學美感的思念語錄。
        
        【核心美學限制與情緒轉折指令】：
        1. 語句必須完美、流暢地將參展者輸入的記憶細節融合進去，不得顯得突兀或語法不通。
        2. 重要：請敏銳分析使用者的字句。如果偵測到沉重、後悔、悲傷、寫到「過往時間無法挽回 Foroever」、「遺憾」、「痛」等走不出的負面情緒，請在文案後半段巧妙地進行溫柔的意境轉折，改以溫暖、療癒、陪伴、或是賦予前行力量、釋懷的鼓勵方式結尾。
        3. 必須以第一人稱或致敬的宏觀視角書寫（例如：以「「致 ${name}：...」」或「「親愛的 ${name}：...」」為開頭，文字頭尾請加上引號「」）。
        4. 請直接輸出這段文案本身，絕對不要包含任何多餘的引言、解釋或「好的，這是為您生成的文案」等字眼。
    `;

    // 呼叫 Google 官方 UMD 規範的模型獲取方法
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
}

// 資料庫寫入
async function saveToSupabase(category, quote, nickname) {
    try {
        const fullText = `[${category}] ${quote} (${nickname})`;
        const { error } = await supabaseClient
            .from('remembrance-db')
            .insert([{ text: fullText }]);

        if (error) throw error;
        fetchWallMessages(); 
    } catch (err) {
        console.error('儲存至資料庫失敗:', err);
    }
}

// 資料庫抓取最新 12 筆卡片
async function fetchWallMessages() {
    if (!supabaseClient) return;
    try {
        const { data: list, error } = await supabaseClient
            .from('remembrance-db')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(12);

        if (error) throw error;

        const wallGrid = document.getElementById('wall-grid');
        if (!list || list.length === 0) {
            wallGrid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px; width: 100%;">牆上目前空無一物，留下第一份思念吧。</div>`;
            return;
        }

        wallGrid.innerHTML = '';
        list.forEach(item => {
            const match = item.text.match(/^\[(.*?)\] (.*?) \((.*?)\)$/);
            let category = '留白處';
            let quote = item.text;
            let nickname = '思念者';

            if (match) { category = match[1]; quote = match[2]; nickname = match[3]; }

            const dateStr = new Date(item.created_at).toLocaleDateString('zh-TW').replace(/\//g, '.');

            wallGrid.innerHTML += `
                <div class="wall-card">
                    <div class="wall-card-header">
                        <span>思念致意錄 / ${category}</span>
                        <span style="color: var(--text-muted);">${dateStr}</span>
                    </div>
                    <div class="wall-card-body">${quote}</div>
                    <div class="wall-card-footer">— 致 ${nickname}</div>
                </div>
            `;
        });
    } catch (err) {
        console.error('讀取留言牆失敗:', err);
    }
}

// 橫向箭頭滑動
function slideWall(direction) {
    const container = document.getElementById('slider-container');
    const scrollAmount = 304; 
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

// 滑鼠拖曳滑動
function initDragScroll() {
    const slider = document.getElementById('slider-container');
    let isDown = false; let startX; let scrollLeft;
    slider.addEventListener('mousedown', (e) => {
        isDown = true; startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => { isDown = false; });
    slider.addEventListener('mouseup', () => { isDown = false; });
    slider.addEventListener('mousemove', (e) => {
        if(!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5; 
        slider.scrollLeft = scrollLeft - walk;
    });
}

// 卡片導出下載
function downloadCard() {
    const cardNode = document.getElementById('printable-card');
    html2canvas(cardNode, {
        scale: 3, 
        backgroundColor: null,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `思念致意卡-${document.getElementById('nickname').value}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        console.error('卡片生成失敗:', err);
        alert('卡片導出失敗，請再試一次。');
    });
}
