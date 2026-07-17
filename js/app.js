// js/app.js --- 洸限 前端核心互動邏輯 (精準插頁與點擊解衝突版) ---

/**
 * ============================================================================
 * 🌌 洸限 (Absence Resonance) - 前端核心控制中心
 * ────────────────────────────────────────────────────────────────────────────
 * 【核心用途】
 *  本檔案主導網頁與觀展者的所有互動儀式。透過與 Supabase 雲端即時連線，
 *  結合大語言模型 (LLM) 文案生成、GSAP 精緻補間動畫、html2canvas 圖像導出，
 *  以及 canvas.js 背景粒子系統，將思念與釋懷具體轉譯為沉浸式的展覽視覺。
 * 
 * 【整體互動流程】
 *  1. 載入初始化: 自 Supabase 獲取最新 36 筆數據，經排序後繪製於橫向滾動留言牆。
 *  2. 切換對象: 控制選擇按鈕之 active 狀態，暫存當前思念目標。
 *  3. 儀式生成: 呼叫 API 取得溫柔語錄，將卡片實體插入網格，並自動滾動引導至思念牆。
 *  4. 重逢彈窗: 點選留言牆上任意卡片時，呼叫 GSAP 浮現深黑遮罩全螢幕 Modal。
 *  5. 釋懷放手: 觸發 3D 卡片吹散抖動，產生 120 顆星砂粒子物理漂移，解除 Snap，精準滑動置底，啟動打字機。
 * ============================================================================
 */

// 🔌 Supabase 金鑰設定：用於雲端即時備份與讀取世界大眾的思念卡片數據
const SUPABASE_URL = "https://cwlxcsdqoigkutbeemvf.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_L52BGOl7tE2hBgLnqxnGoA_u6RQ3yrd";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * ────────────────────────────────────────────────────────────────────────────
 * 🚀 網頁 DOM 樹加載完畢事件
 * ────────────────────────────────────────────────────────────────────────────
 * 【執行流程】
 *  1. 呼叫 fetchWallMessages()，非同步從 Supabase 伺服器獲取歷史思念訊息。
 *  2. 呼叫 initDragScroll()，為思念牆滑軌綁定滑鼠按住拖曳的自然手勢監聽。
 *  3. 取得當前本機時間，自動格式化為「年.月.日」印鑑格式，並寫入 Modal 底部預備。
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchWallMessages(); // 初始化載入歷史訊息
    initDragScroll();    // 啟用拖曳滑動
    
    const today = new Date();
    document.getElementById('card-date-display').innerText = today.toLocaleDateString('zh-TW').replace(/\//g, '.');
});

// 🎯 全域狀態：儲存當前選定的思念對象（預設為 'relative' 親人）
let currentTarget = 'relative';

/**
 * @function setTarget
 * @description 切換思念對象類別。
 * @param {string} target - 切換目標英文代號（'relative'/'friend'/'pet'）
 * @param {HTMLElement} element - 點選的按鈕 HTML DOM 節點
 * 【流程】
 *  1. 更新全域變數 currentTarget。
 *  2. 移除其他按鈕的 active 樣式，並將其添加至當前被點選的按鈕上。
 */
window.setTarget = function(target, element) {
    currentTarget = target;
    document.querySelectorAll('.target-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
};

/**
 * @global {boolean} hasExperiencedRelease
 * @description 體驗狀態鎖：防止使用者在未重新生成新卡片的情況下，
 *              在全螢幕 Modal 內重複點擊「放手釋懷」造成動畫與粒子系統異常重疊。
 */
let hasExperiencedRelease = false;

/**
 * @function generateRemembrance
 * @description 核心儀式卡片生成器。引導 AI 生成溫柔文案、實時插頁、自動對齊滾動並寫入 Supabase。
 * 【運作流程詳解】
 *  1. 驗證欄位是否為空。若未填寫，跳出阻斷提示。
 *  2. 鎖定按鈕（避免重複點按），顯示載入中提示文字。
 *  3. 呼叫非同步函式 generateAIQuote()，向後端 Edge API 取得客製化思念語錄。
 *  4. 根據當前 currentTarget 設定 Modal 對應的中文字樣與 FontAwesome 類別圖標。
 *  5. 寫入 Modal 彈窗資訊，更新 localStorage 的體驗鎖狀態。
 *  6. 本地精準插頁邏輯：
 *     a. 取得牆面 .wall-grid 容器。
 *     b. 新增 wall-card 實體並賦予 my-new-card 與 card-fly-in 類別（使其具備金色發光外框與方形擴散光暈呼吸特效）。
 *     c. 將文字進行 Base64 編碼，安全地寫入 data- 屬性中，避免特殊符號或引號導致 DOM 解析錯誤。
 *     d. 為此張發光的新卡片單獨綁定 clickWallCard() 開啟 Modal 事件。
 *     e. 透過 insertBefore 插入至牆面最前列（最左側），並限制牆面總卡片數上限為 36，過多時自動將最舊卡片從 DOM 移去。
 *  7. 恢復放手按鈕為啟用狀態。
 *  8. 呼叫 scrollIntoView()，以平滑、靠頂（start）的方式自動磁鐵捲動至思念牆。
 *  9. 將滾動軸 slider-container 自動拉回最左側，確保能看見剛落下的發光卡片。
 *  10. 後台非同步（不阻塞 UI）上傳資料至 Supabase，並清空輸入表單。
 */
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

        // 1. 等待 AI 生成文案
        const finalQuote = await generateAIQuote(currentTarget, nickname, memory);
        let targetChinese = currentTarget === 'relative' ? '親人' : currentTarget === 'friend' ? '朋友' : '寵物';
        let iconClass = currentTarget === 'relative' ? 'fa-hands-holding-child' : currentTarget === 'friend' ? 'fa-user-group' : 'fa-paw';

        // 2. 設定 Modal 的內容預備
        document.getElementById('card-tag-display').innerText = `思念回憶錄 / ${targetChinese}`;
        document.getElementById('card-icon-display').innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
        document.getElementById('card-text-display').innerText = finalQuote;
        document.getElementById('card-sign-display').innerText = `— 致 ${nickname}`;
        
        const today = new Date();
        const dateStr = today.toLocaleDateString('zh-TW').replace(/\//g, '.');
        document.getElementById('card-date-display').innerText = dateStr;

        // 重置狀態鎖
        hasExperiencedRelease = false;
        localStorage.setItem('hasExperiencedRelease', 'false');

        // ====================================================================
        // 🎯 核心解決：精準本地插頁
        // ====================================================================
        const wallGrid = document.getElementById('wall-grid');
        
        // 如果原本是空的提示文字，先清空它
        if (wallGrid.innerHTML.includes("牆上目前空無一物")) {
            wallGrid.innerHTML = '';
        }

        // 建立新卡片的 DOM 節點
        const newCard = document.createElement('div');
        newCard.className = 'wall-card my-new-card card-fly-in'; // ⚡ 精準套用金色發光與飛入動畫
        newCard.style.cursor = 'pointer';

        // 為了安全避開引號衝突，將內容轉為 Base64
        const safeQuoteBase64 = btoa(unescape(encodeURIComponent(finalQuote)));
        newCard.setAttribute('data-category', targetChinese);
        newCard.setAttribute('data-quote', safeQuoteBase64);
        newCard.setAttribute('data-nickname', nickname);

        // 卡片內部 HTML
        newCard.innerHTML = `
            <div class="wall-card-header">
                <span>思念回憶錄 / ${targetChinese}</span>
                <span style="color: var(--text-muted);">${dateStr}</span>
            </div>
            <div class="wall-card-body">${finalQuote}</div>
            <div class="wall-card-footer">— 致 ${nickname}</div>
        `;

        // 為新卡片綁定專屬的 click 事件
        newCard.addEventListener('click', function() {
            window.clickWallCard(targetChinese, finalQuote, nickname, true);
        });

        // ➔ 將新卡片精準插入到思念牆的第一個位置
        wallGrid.insertBefore(newCard, wallGrid.firstChild);

        // 精準控制前端牆上最多只保留 36 張卡片
        const currentCards = wallGrid.querySelectorAll('.wall-card');
        if (currentCards.length > 36) {
            currentCards[currentCards.length - 1].remove(); 
        }

        // 重置放手按鈕
        const releaseBtn = document.getElementById('release-btn');
        if (releaseBtn) {
            releaseBtn.disabled = false;
            // 🎯 處 2：【請在此處修改】生成新卡片後，重置放手按鈕時的文字內容
            releaseBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> 釋懷，放手執著`;
        }

        // ➔ 將滾動目標改為對齊獨立出來的 wall-section-container，且靠頂對齊（start）
        document.getElementById('wall-section-container').scrollIntoView({ behavior: 'smooth', block: 'start' });

        // ➔ 滾動軸拉回最左邊，確保一眼看見剛落下的新卡片
        const container = document.getElementById('slider-container');
        if (container) {
            container.scrollLeft = 0;
        }

        // 3. 背景悄悄上傳到 Supabase
        if (supabaseClient) {
            const fullText = `[${targetChinese}] ${finalQuote} (${nickname})`;
            supabaseClient
                .from('remembrance-db')
                .insert([{ text: fullText }])
                .then(({ error }) => {
                    if (error) console.error('背景備份 Supabase 失敗:', error);
                });
        }

        // 清空輸入表單
        document.getElementById('nickname').value = "";
        document.getElementById('memory').value = "";

    } catch (err) {
        console.error('AI 生成或儲存失敗:', err);
        alert('通道暫時擁擠，請再試一次。');
    } finally {
        submitBtn.innerText = "⚡ 生成專屬思念卡片";
        submitBtn.disabled = false;
    }
};

/**
 * @function generateAIQuote
 * @description 向 Vercel 部署的邊緣（Edge）函式 API 發送 POST 請求。
 * @param {string} targetType - 選擇的類別代號
 * @param {string} name - 對象的姓名暱稱
 * @param {string} userMemory - 使用者留下的畫面細節文字
 * @returns {Promise<string>} 生成完畢的感性段落文字
 * 【流程】
 *  1. 定義結構嚴謹、帶有情緒轉折機制的 LLM Prompt 引導語。
 *  2. 發送 fetch 請求，若回傳失敗，拋出對應伺服器異常。
 *  3. 解析 JSON 回傳，並拋出生成的內文。
 */
async function generateAIQuote(targetType, name, userMemory) {
    let targetLabel = targetType === 'relative' ? '親人' : targetType === 'friend' ? '朋友' : '寵物';
    const prompt = `
        你是一位文字極具情感穿透力、細膩且內斂的當次CIS展覽文案大師。
        現在有一位參展者，他想念的對象是【${targetLabel}】，他稱呼對方為【${name}】。
        他留下的思念細節與記憶畫面是：『${userMemory}』。
        請為他撰寫一段 1 到 2 句、字數在 50~80 字內、極具文學美感的思念語錄。
        【核心美學限制與情緒轉折指令】：
        1. 語句必須完美、流暢地將參展者輸入的記憶細節融合進去，不得顯得突兀 or 語法不通.
        2. 重要：請敏銳分析使用者的字句。如果偵測到沉重、後悔、悲傷、寫到「過往時間無法挽回」、「遺憾」、「痛」等走不出的負面情緒，請在文案後半段巧妙地進行溫柔的意境轉折，改以溫暖、療癒、陪伴、或是賦予前行力量、釋懷的鼓勵方式結尾。
        3. 必須以第一人稱或致敬的宏觀視角書寫（例如：以「「致 ${name}：...」」或「「親愛的 ${name}：...」」為開頭，文字頭尾請加上引號「」）。
        4. 請直接輸出這段文案本身，絕對不要包含任何多餘的引言、解釋 or 「好的，這是為您生成的文案」等字眼。
    `;

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '後端伺服器錯誤');
    }

    const data = await response.json();
    return data.text; 
}

/**
 * @function fetchWallMessages
 * @description 從雲端 Supabase 資料庫載入最新 36 筆紀錄，並採用「完美橫向列優先排序演算法」進行排列。
 * 【演算法物理意義】
 *  - 預設 CSS Grid 網格在 `.wall-grid-row` 設定了 `grid-auto-flow: column`（橫向無限延伸網格）和 `grid-template-rows: repeat(3, 220px)`（固定三行）。
 *  - 若按常規順序渲染，卡片會呈現在第 1 直行由上往下排，排滿後才進入第 2 直行，這會使第 1 直行塞滿新卡片，第 2 直行都是舊卡片。
 *  - **解決方案：** 本演算法先計算出橫向總直行數（cols），然後透過數學公式 `targetIndex = c * rows + r` 橫向優先分派，
 *    使渲染時卡片由左至右、由上而下地排開，達到最自然、由新到舊的閱讀流線。
 * 【流程】
 *  1. 從 Supabase 取得歷史留言，若無資料顯示空提示。
 *  2. 執行「完美橫向列優先排序演算法」重新將 1D 資料映射到新陣列中。
 *  3. 清空 grid 舊有 DOM 節點。
 *  4. 遍歷排序後的資料，透過正則表達式解析出 `[類別] 語錄 (簽名)` 結構，轉化為 HTML 卡片 DOM。
 *  5. 綁定 `click` 事件為唯讀模式卡片（isNewCard = false），追加至畫面上。
 */
async function fetchWallMessages() {
    if (!supabaseClient) return;
    try {
        const { data: list, error } = await supabaseClient
            .from('remembrance-db')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(36);

        if (error) throw error;

        const wallGrid = document.getElementById('wall-grid');
        if (!list || list.length === 0) {
            wallGrid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px; width: 100%;">牆上目前空無一物，留下第一份思念吧。</div>`;
            return;
        }

        // ====================================================================
        // 🎯 完美橫向對齊演算法：
        // 將由新到舊的 1D 資料，重新分配到 3 列（rows）的表格中。
        // 當 grid-auto-flow: column 時，它會按照我們先橫向（r=0）、再橫向（r=1）分派，
        // 最終渲染時，卡片就會呈現由左至右，No.1 緊鄰 No.2、No.3 橫向排開！
        // ====================================================================
        const rows = 3;
        const cols = Math.ceil(list.length / rows);
        const sortedList = new Array(list.length);

        let itemIndex = 0;
        // 💡 橫向優先分派：先排第一排的所有欄位，再排第二排、第三排
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const targetIndex = c * rows + r; // CSS 網格 column 排列的物理索引對應
                if (itemIndex < list.length && targetIndex < list.length) {
                    sortedList[targetIndex] = list[itemIndex];
                    itemIndex++;
                }
            }
        }
        // ====================================================================

        wallGrid.innerHTML = '';
        
        // 💡 🎯 關鍵修正：迴圈必須改為遍歷我們重新數學對齊後的 sortedList 陣列！
        sortedList.forEach((targetItem) => {
            // 如果遇到不足 3 的倍數的空元素，直接跳過
            if (!targetItem) return;

            const match = targetItem.text.match(/^\[(.*?)\] (.*?) \((.*?)\)$/);
            let category = '留白處';
            let quote = targetItem.text;
            let nickname = '思念者';

            if (match) { 
                category = match[1]; 
                quote = match[2]; 
                nickname = match[3]; 
            }

            const dateStr = new Date(targetItem.created_at).toLocaleDateString('zh-TW').replace(/\//g, '.');
            const safeQuoteBase64 = btoa(unescape(encodeURIComponent(quote)));

            // 建立卡片 DOM 
            const cardEl = document.createElement('div');
            cardEl.className = 'wall-card';
            cardEl.style.cursor = 'pointer';
            cardEl.setAttribute('data-category', category);
            cardEl.setAttribute('data-quote', safeQuoteBase64);
            cardEl.setAttribute('data-nickname', nickname);
            
            cardEl.innerHTML = `
                <div class="wall-card-header">
                    <span>思念回憶錄 / ${category}</span>
                    <span style="color: var(--text-muted);">${dateStr}</span>
                </div>
                <div class="wall-card-body">${quote}</div>
                <div class="wall-card-footer">— 致 ${nickname}</div>
            `;

            // 綁定唯讀點擊事件
            cardEl.addEventListener('click', function() {
                window.clickWallCard(category, quote, nickname, false);
            });

            wallGrid.appendChild(cardEl);
        }); 
        
    } catch (err) {
        console.error('讀取留言牆失敗:', err);
    }
}

/**
 * @function clickWallCard
 * @description 觀展者點選牆上任意卡片時，呼叫此函式展開全螢幕重逢彈窗 Modal。
 * @param {string} category - 回憶對象中文別稱
 * @param {string} quote - 溫柔思念文案
 * @param {string} nickname - 留下的稱呼
 * @param {boolean} isNewCard - 是否為使用者在本次工作階段中「剛生成」的發光卡片
 * 【核心流程與衝突化解邏輯】
 *  1. 寫入 Modal 內部的對象、內文與致詞簽名。
 *  2. 判斷 `isNewCard`（按鈕狀態切換）：
 *     - 若為新生成的卡片，允許點選「放手釋懷（release-btn）」進行後續的消逝儀式。
 *     - 若為他人的卡片，按鈕呈現「已化為祝福之光」並鎖定停用。
 *  3. **關鍵的衝突化解（拔除牆上光暈）：**
 *     - 為了讓觀展者在點開自己的發光卡片時感受到儀式的過渡，點擊 Modal 展開的當下，
 *       利用 querySelector 找到牆面上對應的 `.wall-card.my-new-card`，
 *       移除它的發光（my-new-card）與飛入（card-fly-in）CSS 類別。
 *     - 使用 cloneNode(true) 取代原本節點，並重新綁定點擊事件為唯讀模式（isNewCard = false），
 *       確保當觀展者關閉 Modal 後，牆上的卡片已恢復平靜並正式融入大眾留下的痕跡中，防止邏輯重複觸發。
 *  4. 顯示 Modal 遮罩層，利用 GSAP 對 `#printable-card` 進行 scale 0.8 至 1、透明度 0 至 1 的高雅淡入補間動畫。
 */
window.clickWallCard = function(category, quote, nickname, isNewCard) {
    document.getElementById('card-tag-display').innerText = `思念回憶錄 / ${category}`;
    document.getElementById('card-text-display').innerText = quote;
    document.getElementById('card-sign-display').innerText = `— 致 ${nickname}`;
    
    const releaseBtn = document.getElementById('release-btn');
    
    if (releaseBtn) {
        if (isNewCard) {
            releaseBtn.disabled = false;
            // 🎯 處 3：【請在此處修改】點擊新卡片開啟 Modal 時，按鈕預設呈現的文字
            releaseBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> 釋懷，放手執著`;
            hasExperiencedRelease = false;
        } else {
            releaseBtn.disabled = true;
            // 🎯 處 4：【請在此處修改】點擊他人卡片（唯讀）時，按鈕鎖死呈現的文字
            releaseBtn.innerHTML = `<i class="fa-solid fa-check"></i> 已化為祝福之光`;
        }
    }

    // ==========================================
    // 🎯 核心解決問題 2：點擊新卡片的瞬間，立刻將牆上卡片的光暈、金色外框消除
    // ==========================================
    if (isNewCard) {
        const myNewCardOnWall = document.querySelector('.wall-card.my-new-card');
        if (myNewCardOnWall) {
            // 拔除光暈與動畫 Class，平靜融入留言牆
            myNewCardOnWall.classList.remove('my-new-card', 'card-fly-in');
            
            // 重新綁定為唯讀事件（防止不放手關閉後再次點開仍能發光）
            const safeQuoteBase64 = myNewCardOnWall.getAttribute('data-quote');
            const safeQuote = decodeURIComponent(escape(atob(safeQuoteBase64)));
            
            const clonedCard = myNewCardOnWall.parentNode.replaceChild(myNewCardOnWall.cloneNode(true), myNewCardOnWall) || myNewCardOnWall;
            
            // 重新抓取替換後的 DOM 以確保事件綁定成功
            const updatedCard = document.querySelector(`[data-quote="${safeQuoteBase64}"]`);
            if (updatedCard) {
                updatedCard.addEventListener('click', function() {
                    window.clickWallCard(category, safeQuote, nickname, false);
                });
            }
        }
    }
    
    const outputSection = document.getElementById('output-section');
    outputSection.style.display = 'flex';
    
    gsap.fromTo("#printable-card", 
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }
    );
};

/**
 * @function closeReunionModal
 * @description 關閉全螢幕 Modal 彈窗。
 * 【流程】
 *  - 調用 GSAP 讓實體卡片往內縮小並漸隱（縮小至 0.8、透明度漸層至 0）。
 *  - 在動畫補間完成的 callbacks（onComplete）中，將 overlay 遮罩隱藏（display = 'none'），確保介面乾淨。
 */
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

/**
 * @function slideWall
 * @description 點選留言牆兩側懸浮箭頭時的滑軌平滑前進控制。
 * @param {string} direction - 滑動方向（'left' / 'right'）
 * @if direction == 'left' - 滑槽水平橫移滾動量減去 304px (卡片物理寬度 290px + 格線 gap 24px 中的分配邊距)。
 * @else - 滾動量加上 304px。
 */
window.slideWall = function(direction) {
    const container = document.getElementById('slider-container');
    const scrollAmount = 304; 
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
};

/**
 * @function initDragScroll
 * @description 為桌面裝置瀏覽器客製化的 Drag-to-Scroll (滑鼠按住拖拉滾動) 邏輯。
 * 【流程】
 *  1. 監聽 mousedown：開啟滑動鎖 isDown = true，記錄起始 X 座標，並讀取當前的滾動偏移量。
 *  2. 監聽 mouseleave & mouseup：釋放滑動鎖 isDown = false。
 *  3. 監聽 mousemove：若未按住（!isDown）則阻斷執行。否則，計算當前滑鼠水平偏移差，
 *     乘上 1.5 倍阻尼滑行比率，動態覆寫 .scrollLeft 屬性，營造出如手機觸控般的自然拖拽流暢度。
 */
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

/**
 * @function downloadCard
 * @description 將清水模樣式卡片 DOM 高解析導出並儲存為 PNG 圖檔。
 * 【運作流程】
 *  1. 鎖定 `#printable-card` 的 DOM 節點。
 *  2. 呼叫 html2canvas 繪製，設定 `scale: 3` 進行高解析 3 倍超取樣像素繪製，防止在視網膜螢幕上破圖或字體模糊；
 *     設定 `useCORS: true` 允許跨域請求（避免 FontAwesome 在 Canvas 裡遺失圖標）。
 *  3. 繪製完成後取得畫布物件，建立虛擬下載錨點 `<a>` 元素，設定預設檔名，觸發點擊（click()）完成靜默下載。
 */
window.downloadCard = function() {
    const cardNode = document.getElementById('printable-card');
    html2canvas(cardNode, {
        scale: 3, 
        backgroundColor: null,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `思念回憶卡-${document.getElementById('nickname').value || '洸限'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        console.error('卡片生成失敗:', err);
        alert('卡片導出失敗，請再試一次。');
    });
};

/**
 * @function releaseCardAndFly
 * @description 【整場展覽最震撼的靈魂儀式】── 釋懷與放手。
 * 【物理與視覺特效流向詳解】
 *  1. 阻斷重覆執行：判斷 `hasExperiencedRelease` 是否已被鎖死，若是則退出。
 *  2. 設定體驗狀態鎖為 true，並將「放手按鈕」停用、文字轉為「🍃 正在化為祝福之光...」。
 *  3. 獲取卡片當前相對於視窗的精確物理邊界坐標（getBoundingClientRect()），作為碎屑星砂的噴發源。
 *  4. **卡片顫抖動態 (GSAP Shake):** 
 *     建構 timeline 時間線，讓卡片沿水平與垂直進行微幅高速 yoyo 往返抖動，模擬釋懷前物質的最後凝聚張力。
 *  5. **120 顆金色星砂物理噴散:**
 *     a. 遍歷 120 次，使用 `document.createElement('div')` 在 DOM 樹上動態建立粒子節點。
 *     b. 設定 CSS 類別 `.particle-debris`，利用 `Math.random()` 為每一顆粒子動態生成不同的直徑。
 *     c. 從預設調色盤中亂數選擇冷金、亮金、象牙白等背景顏色。
 *     d. 物理噴發點設定：將粒子起始位置設定在剛獲取的卡片 DOM 矩形範圍內。
 *     e. 拋物線向量計算：極坐標轉換，設定朝右上方 $-45^\circ$ (即 $-\pi/4$) 為軸心，並加入 $\pm 0.3$ 弧度的隨機發散偏角。
 *     f. 設定隨機噴發初始速度（150 ~ 500 px/s）。
 *     g. 調用 GSAP 動態補間：讓粒子以 `power2.out` 速度阻尼往計算好的目標坐標飛去，同時縮放尺寸至 0、透明度至 0，
 *        在 2~4 秒的隨機時間內緩緩消失，並在完成時（onComplete）將粒子節點自 DOM 中完全卸除，確保記憶體安全。
 *  6. **卡片 3D 翻轉與消逝:**
 *     使用 GSAP 動態讓實體卡片縮小至 `0.3` 倍，沿 Y 軸旋轉 $90^\circ$、X 軸旋轉 $30^\circ$，並套用 `blur(15px)` 濾鏡，
 *     在 3.5 秒內完美演譯「在看不見的地方，溫柔共振、昇華消逝」的意境。
 *  7. **終極破解 兩段式滾動頓挫 流程：**
 *     *當卡片完全消逝並關閉 Modal（onComplete）時：*
 *     a. 清除卡片的 3D 動態與濾鏡屬性，重置隱藏 Modal 區塊。
 *     b. **解鎖 Snap 機制：** 將 `html` 的 `scroll-snap-type` 設定為 `none`。
 *        *（因為若不解除 Snap 磁鐵機制，當滾動指針經過留言牆時，瀏覽器會強制對齊該區，導致滾動卡住並產生劇烈跳動）*
 *     c. **瞬時打破 CSS Transition 延遲：** 將結尾區塊的 transition 設為 `none`，主動添加 `active`、高度強制擴展至實體 `100vh`、不透明度拉滿。
 *        此時實體高度瞬間生成，瀏覽器的滾動矩陣才得以計算完畢。
 *     d. 延遲 50 毫秒（確保瀏覽器重新計算完網頁總長度），將留言牆橫滾軸歸零，並對底部隱形錨點 `outro-align-anchor`
 *        呼叫 `scrollIntoView({ behavior: 'smooth', block: 'end' })`。
 *     e. 網頁一氣呵成下滑至底，完美置底後，等待 1.5 秒讓使用者靜心，接著觸發 `startTypewriterEffect()` 啟動打字。
 *     f. 最後將頁尾的 transition 恢復、重新將 `scrollSnapType` 改回 `y mandatory`，讓磁鐵捲動保護重新歸位。
 */
window.releaseCardAndFly = function() {
    const card = document.getElementById('printable-card');
    const releaseBtn = document.getElementById('release-btn');
    const outputSection = document.getElementById('output-section');
    
    if (!card || hasExperiencedRelease) return;
    
    hasExperiencedRelease = true;
    localStorage.setItem('hasExperiencedRelease', 'true');
    releaseBtn.disabled = true;
    // 🎯 處 5：【請在此處修改】點擊放手後，卡片正在吹散時，按鈕過渡呈現的文字
    releaseBtn.innerHTML = `🍃 正在化為祝福之光...`;

    const rect = card.getBoundingClientRect();

    const shakeTl = gsap.timeline();
    shakeTl.to(card, { x: "+=6", y: "-=3", rotation: 1, duration: 0.12, repeat: 10, yoyo: true })
           .to(card, { x: 0, y: 0, rotation: 0, duration: 0.15 });

    const particleCount = 120; 
    const colors = ['#c5a880', '#B59E74', '#FAF8F5', '#ffffff'];

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle-debris';
        
        const size = Math.random() * 8 + 3;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        
        const startX = rect.left + Math.random() * rect.width;
        const startY = rect.top + Math.random() * rect.height;
        particle.style.left = `${startX}px`;
        particle.style.top = `${startY}px`;
        
        document.body.appendChild(particle);

        const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.6; 
        const velocity = Math.random() * 350 + 150; 
        const targetX = startX + Math.cos(angle) * velocity;
        const targetY = startY + Math.sin(angle) * velocity - 100; 

        gsap.to(particle, {
            x: targetX - startX,
            y: targetY - startY,
            scale: 0,
            opacity: 0,
            rotation: Math.random() * 720,
            duration: Math.random() * 2.0 + 2.0, 
            ease: "power2.out",
            onComplete: () => {
                particle.remove(); 
            }
        });
    }

    gsap.to(card, {
        scale: 0.3,
        rotationY: 90, 
        rotationX: 30,
        filter: "blur(15px)",
        opacity: 0,
        duration: 3.5, 
        ease: "power2.inOut",
        onComplete: () => {
            outputSection.style.display = 'none'; 
            gsap.set(card, { scale: 1, rotationY: 0, rotationX: 0, filter: "none", opacity: 1 }); 
            
            releaseBtn.disabled = true; 
            // 🎯 處 6：【請在此處修改】放手成功後，鎖死按鈕呈現的狀態文字
            releaseBtn.innerHTML = `<i class="fa-solid fa-check"></i> 已化為祝福之光`; 

            // ==========================================
            // 🎯 核心修復問題 1：徹底根治第一次「兩段式滾動頓挫」
            // ==========================================
            const outroSection = document.getElementById('outro-section');
            const anchor = document.getElementById('outro-align-anchor');
            
            if (outroSection && anchor) {
                // 1. 關閉 Scroll Snap 防干擾
                document.documentElement.style.scrollSnapType = 'none';
                
                // 2. ⚡ 終極破解：直接強行打破 CSS 延遲，瞬時渲染實體 100vh 供瀏覽器計算滾動指針
                outroSection.style.transition = 'none'; 
                outroSection.classList.add('active');
                outroSection.style.height = '100vh';
                outroSection.style.opacity = '1';
                
                // 3. 稍微等待 50 毫秒（等待 DOM 繪製完成），執行 100% 準確的一次性 Y 軸精確下沉
                setTimeout(() => {
                    const container = document.getElementById('slider-container');
                    if (container) {
                        container.scrollLeft = 0; 
                    }

                    // 4. 精確對齊至最底部隱形錨點，一氣呵成！
                    anchor.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'end' 
                    });
                    
                    // 5. 滾動完畢後（約 1.5 秒），啟動打字，並悄悄恢復 Transition 與 Snap 功能
                    setTimeout(() => {
                        startTypewriterEffect();
                        
                        // 恢復常規設定
                        outroSection.style.transition = ''; 
                        document.documentElement.style.scrollSnapType = 'y mandatory';
                    }, 1500);
                }, 50); 
            }
        }
    });
};

/**
 * @function startTypewriterEffect
 * @description 落幕感性文字打字機效果。
 * 【運作流程】
 *  1. 鎖定主標題與副標題的 HTML 容器，並清空預設文字。
 *  2. 使用 `setInterval` 計時器，每 120 毫秒將 mainText 中的下一個字元串接寫入主標 DOM。
 *  3. 當主標題全部繪製完畢（mainIndex === mainText.length）時，清除主計時器。
 *  4. 設定一個 800 毫秒的溫柔等待留白，接著啟用第二計時器，
 *     每 100 毫秒將 subText 一字一字推入副標 DOM 中，完成充滿禪意的寂靜結尾。
 */
function startTypewriterEffect() {
    const textEl = document.getElementById('typewriter-text');
    const subEl = document.getElementById('typewriter-sub');
    
    const mainText = "「 那些不曾被遺忘的，都將在看不見的地方，溫柔地共振。」";
    const subText = "洸限 — 願你帶著光，溫暖前行 — ";
    
    if (!textEl || !subEl) return;
    
    textEl.innerHTML = "";
    subEl.innerHTML = "";
    
    let mainIndex = 0;
    const mainTimer = setInterval(() => {
        if (mainIndex < mainText.length) {
            textEl.innerHTML += mainText.charAt(mainIndex);
            mainIndex++;
        } else {
            clearInterval(mainTimer);
            
            setTimeout(() => {
                let subIndex = 0;
                const subTimer = setInterval(() => {
                    if (subIndex < subText.length) {
                        subEl.innerHTML += subText.charAt(subIndex);
                        subIndex++;
                    } else {
                        clearInterval(subTimer);
                    }
                }, 100); 
            }, 800);
        }
    }, 120);
}

/**
 * @function scrollToContent
 * @description 綁定於首頁「略過動畫」按鈕。
 * 【流程】
 *  1. 當點選時，強行將 GSAP 進場動畫時間線的進度 (tl.progress()) 設為 100% 完結狀態，避免背景粒子與線條因還沒跑完而卡頓。
 *  2. 呼叫 `scrollIntoView`，以平滑、靠頂對齊方式將畫面推至留言輸入板。
 *  3. 利用 GSAP 對「略過按鈕」本身進行 0.5 秒的淡出隱藏並鎖死點選功能，優雅離場。
 */
window.scrollToContent = function() {
    if (window.tl) window.tl.progress(1);
    document.getElementById('main-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
    gsap.to(".skip-anim-btn", { opacity: 0, pointerEvents: "none", duration: 0.5 });
};
