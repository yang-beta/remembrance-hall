// js/app.js --- AI 驅動：思念留言板 前端核心邏輯 (Vercel轉發用) ---

const SUPABASE_URL = "https://cwlxcsdqoigkutbeemvf.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_L52BGOl7tE2hBgLnqxnGoA_u6RQ3yrd";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    fetchWallMessages();
    initDragScroll();
    
    const today = new Date();
    document.getElementById('card-date-display').innerText = today.toLocaleDateString('zh-TW').replace(/\//g, '.');
});

let currentTarget = 'relative';

// 選擇對象切換
window.setTarget = function(target, element) {
    currentTarget = target;
    document.querySelectorAll('.target-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
};

// 核心：生成思念儀式卡片
// ⚡ 新增全域狀態鎖：紀錄使用者是否體驗過放手（僅生成一次）
let hasExperiencedRelease = false;
// ⚡ 紀錄目前使用者剛生成的卡片 ID 或內容，用來在思念牆上比對「是不是自己的卡片」
let myLatestMessageText = ""; 

window.generateRemembrance = async function() {
    const nickname = document.getElementById('nickname').value.trim();
    const memory = document.getElementById('memory').value.trim();
    const submitBtn = document.querySelector('.btn-submit');

    if (!nickname || !memory) {
        alert('請填入稱呼與記憶細節，讓思念具體落地。');
        return;
    }

    try {
        submitBtn.innerText = "⏳ 正在引導 AI 梳理思念之緒...";
        submitBtn.disabled = true;

        const finalQuote = await generateAIQuote(currentTarget, nickname, memory);
        let targetChinese = currentTarget === 'relative' ? '親人' : currentTarget === 'friend' ? '朋友' : '寵物';
        let iconClass = currentTarget === 'relative' ? 'fa-hands-holding-child' : currentTarget === 'friend' ? 'fa-user-group' : 'fa-paw';

        // 填入全螢幕 Modal 卡片的內容（備用）
        document.getElementById('card-tag-display').innerText = `思念致意錄 / ${targetChinese}`;
        document.getElementById('card-icon-display').innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        document.getElementById('card-text-display').innerText = finalQuote;
        document.getElementById('card-sign-display').innerText = `— 致 ${nickname}`;
        
        const today = new Date();
        document.getElementById('card-date-display').innerText = today.toLocaleDateString('zh-TW').replace(/\//g, '.');

        // 🎯 核心改變點：此處不再直接開啟 output-section！
        // 而是儲存這筆內容特徵，供思念牆識別
        myLatestMessageText = finalQuote; // 🎯 儲存這筆內容，以便滾動時進行高亮配對
        
        // 重置狀態鎖，新卡片被建立，允許再次放手
        hasExperiencedRelease = false;
        localStorage.setItem('hasExperiencedRelease', 'false');

        // 寫入 Supabase 資料庫
        if (supabaseClient) {
            await saveToSupabase(targetChinese, finalQuote, nickname);
        }

        // 🎯 自動引導使用者向下平滑捲動到歷史思念牆
        document.querySelector('.wall-section').scrollIntoView({ behavior: 'smooth' });

        // 清空輸入表單，像沙子被拿走一樣
        document.getElementById('nickname').value = "";
        document.getElementById('memory').value = "";

    } catch (err) {
        console.error('AI 生成或儲存失敗:', err);
        alert('通道暫時擁擠，請再試一次。');
    } finally {
        submitBtn.innerText = "⚡ 生成思念儀式卡片";
        submitBtn.disabled = false;
    }
};

// 向 Vercel 後端 API 發送請求
async function generateAIQuote(targetType, name, userMemory) {
    let targetLabel = targetType === 'relative' ? '親人' : targetType === 'friend' ? '朋友' : '寵物';
    
    const prompt = `
        你是一位文字極具情感穿透力、細膩且內斂的當次CIS展覽文案大師。
        現在有一位參展者，他想念的對象是【${targetLabel}】，他稱呼對方為【${name}】。
        他留下的思念細節與記憶畫面是：『${userMemory}』。

        請為他撰寫一段 1 到 2 句、字數在 50~80 字內、極具文學美感的思念語錄。
        
        【核心美學限制與情緒轉折指令】：
        1. 語句必須完美、流暢地將參展者輸入的記憶細節融合進去，不得顯得突兀或語法不通。
        2. 重要：請敏銳分析使用者的字句。如果偵測到沉重、後悔、悲傷、寫到「過往時間無法挽回」、「遺憾」、「痛」等走不出的負面情緒，請在文案後半段巧妙地進行溫柔的意境轉折，改以溫暖、療癒、陪伴、或是賦予前行力量、釋懷的鼓勵方式結尾。
        3. 必須以第一人稱或致敬的宏觀視角書寫（例如：以「「致 ${name}：...」」或「「親愛的 ${name}：...」」為開頭，文字頭尾請加上引號「」）。
        4. 請直接輸出這段文案本身，絕對不要包含任何多餘的引言、解釋或「好的，這是為您生成的文案」等字眼。
    `;

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '後端伺服器錯誤');
    }

    const data = await response.json();
    return data.text; 
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

// 資料庫抓取最新 12 筆卡片（優化：加入飛入動態與點擊綁定）
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
        list.forEach((item, index) => {
            const match = item.text.match(/^\[(.*?)\] (.*?) \((.*?)\)$/);
            let category = '留白處';
            let quote = item.text;
            let nickname = '思念者';

            if (match) { 
                category = match[1]; 
                quote = match[2]; 
                nickname = match[3]; 
            }

            const dateStr = new Date(item.created_at).toLocaleDateString('zh-TW').replace(/\//g, '.');

            // 🎯 穩定判斷：如果目前抓到的是最新的一筆 (index === 0) 且使用者剛生成過卡片
            const isMyNewCard = (index === 0 && myLatestMessageText !== "" && item.text.includes(myLatestMessageText.substring(0, 15)));
            const extraClasses = isMyNewCard ? 'my-new-card card-fly-in' : '';

            // 💡 解決關鍵：我們不直接在 onclick 塞入 quote！而是用 base64 編碼，徹底避開引號衝突！
            const safeQuoteBase64 = btoa(unescape(encodeURIComponent(quote)));

            wallGrid.innerHTML += `
                <div class="wall-card ${extraClasses}" 
                     data-category="${category}" 
                     data-quote="${safeQuoteBase64}" 
                     data-nickname="${nickname}" 
                     style="cursor: pointer;">
                    <div class="wall-card-header">
                        <span>思念致意錄 / ${category}</span>
                        <span style="color: var(--text-muted);">${dateStr}</span>
                    </div>
                    <div class="wall-card-body">${quote}</div>
                    <div class="wall-card-footer">— 致 ${nickname}</div>
                </div>
            `;
        }); 

        // 🎯 綁定安全點擊事件
        document.querySelectorAll('.wall-card').forEach(card => {
            card.addEventListener('click', function() {
                const category = this.getAttribute('data-category');
                // 將 Base64 轉回正常中文字串
                const safeQuote = decodeURIComponent(escape(atob(this.getAttribute('data-quote'))));
                const nickname = this.getAttribute('data-nickname');
                
                // 呼叫彈出視窗
                window.clickWallCard(category, safeQuote, nickname);
            });
        });

        // 🎯 自動滾動到最左邊
        if (myLatestMessageText) {
            const container = document.getElementById('slider-container');
            if (container) {
                container.scrollLeft = 0;
            }
        }
        
    } catch (err) {
        console.error('讀取留言牆失敗:', err);
    }
}

// ==========================================
// 🎯 階段三：重逢 - 開啟全螢幕 Modal (完美防錯版)
// ==========================================
window.clickWallCard = function(category, quote, nickname) {
    // 1. 將解析後的乾淨內容塞入 Modal
    document.getElementById('card-tag-display').innerText = `思念致意錄 / ${category}`;
    document.getElementById('card-text-display').innerText = quote;
    document.getElementById('card-sign-display').innerText = `— 致 ${nickname}`;
    
    // 2. 開啟並淡入全螢幕覆蓋層
    const outputSection = document.getElementById('output-section');
    outputSection.style.display = 'flex';
    
    // 使用 GSAP 製作全螢幕卡片微微放大的登場動畫
    gsap.fromTo("#printable-card", 
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }
    );
};

// ==========================================
// 🎯 階段三：重逢 - 關閉全螢幕 Modal
// ==========================================
window.closeReunionModal = function() {
    const outputSection = document.getElementById('output-section');
    
    gsap.to("#printable-card", {
        scale: 0.8,
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => {
            outputSection.style.display = 'none';
        }
    });
};
