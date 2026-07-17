// js/app.js --- 洸限 前端核心互動邏輯 (精準插頁與點擊解衝突版) ---

const SUPABASE_URL = "https://cwlxcsdqoigkutbeemvf.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_L52BGOl7tE2hBgLnqxnGoA_u6RQ3yrd";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 頁面初始化：載入歷史思念、初始化拖曳功能、自動生成當日日期印鑑[cite: 21]
document.addEventListener('DOMContentLoaded', () => {
    fetchWallMessages(); 
    initDragScroll();
    
    const today = new Date();
    document.getElementById('card-date-display').innerText = today.toLocaleDateString('zh-TW').replace(/\//g, '.');[cite: 21]
});

let currentTarget = 'relative'; // 目前選取的思念對象類別[cite: 21]
let hasExperiencedRelease = false; // 體驗鎖：紀錄參展者在同一次生成中是否已釋放卡片[cite: 21]

/**
 * @function setTarget
 * @description 選擇思念對象類別切換（親人/朋友/寵物），同步更新介面按鈕的啟動狀態（Active Class）。[cite: 21]
 * @param {string} target - 選擇的對象英文代號（relative/friend/pet）[cite: 21]
 * @param {HTMLElement} element - 觸發該事件的按鈕 DOM 元素[cite: 21]
 */
window.setTarget = function(target, element) {
    currentTarget = target;[cite: 21]
    document.querySelectorAll('.target-btn').forEach(btn => btn.classList.remove('active'));[cite: 21]
    element.classList.add('active');[cite: 21]
};

/**
 * @function generateRemembrance
 * @description 核心思念儀式卡片生成器。包含：
 *              1. 驗證表單輸入。
 *              2. 呼叫後端 LLM 溫柔撰寫儀式語錄。
 *              3. 寫入本地牆上（採橫向 3 列數學排位優化）。
 *              4. 預備 Modal 並平滑吸附對齊至思念留言牆。
 *              5. 後台背景悄悄同步至 Supabase。[cite: 21]
 */
window.generateRemembrance = async function() {
    const nickname = document.getElementById('nickname').value.trim();[cite: 21]
    const memory = document.getElementById('memory').value.trim();[cite: 21]
    const submitBtn = document.querySelector('.btn-submit');[cite: 21]

    if (!nickname || !memory) {
        alert('請填入稱呼與記憶細節，讓思念具體落地。');[cite: 21]
        return;
    }

    try {
        submitBtn.innerText = "⏳ 正在引導 AI 梳理思念之緒...";[cite: 21]
        submitBtn.disabled = true;[cite: 21]

        // 1. 等待後端 AI 生成情感語錄[cite: 21]
        const finalQuote = await generateAIQuote(currentTarget, nickname, memory);[cite: 21]
        let targetChinese = currentTarget === 'relative' ? '親人' : currentTarget === 'friend' ? '朋友' : '寵物';[cite: 21]
        let iconClass = currentTarget === 'relative' ? 'fa-hands-holding-child' : currentTarget === 'friend' ? 'fa-user-group' : 'fa-paw';[cite: 21]

        // 2. 設定 Modal 的內容預備[cite: 21]
        document.getElementById('card-tag-display').innerText = `思念回憶錄 / ${targetChinese}`;[cite: 21]
        document.getElementById('card-icon-display').innerHTML = `<i class="fa-solid ${iconClass}"></i>`;[cite: 21]
        document.getElementById('card-text-display').innerText = finalQuote;[cite: 21]
        document.getElementById('card-sign-display').innerText = `— 致 ${nickname}`;[cite: 21]
        
        const today = new Date();[cite: 21]
        const dateStr = today.toLocaleDateString('zh-TW').replace(/\//g, '.');[cite: 21]
        document.getElementById('card-date-display').innerText = dateStr;[cite: 21]

        hasExperiencedRelease = false;[cite: 21]
        localStorage.setItem('hasExperiencedRelease', 'false');[cite: 21]

        // 3. 本地精準插頁[cite: 21]
        const wallGrid = document.getElementById('wall-grid');[cite: 21]
        if (wallGrid.innerHTML.includes("牆上目前空無一物")) {[cite: 21]
            wallGrid.innerHTML = '';[cite: 21]
        }

        const newCard = document.createElement('div');[cite: 21]
        newCard.className = 'wall-card my-new-card card-fly-in'; // 啟用金色光暈與動態進場[cite: 21]
        newCard.style.cursor = 'pointer';[cite: 21]

        const safeQuoteBase64 = btoa(unescape(encodeURIComponent(finalQuote)));[cite: 21]
        newCard.setAttribute('data-category', targetChinese);[cite: 21]
        newCard.setAttribute('data-quote', safeQuoteBase64);[cite: 21]
        newCard.setAttribute('data-nickname', nickname);[cite: 21]

        newCard.innerHTML = `
            <div class="wall-card-header">
                <span>思念回憶錄 / ${targetChinese}</span>
                <span style="color: var(--text-muted);">${dateStr}</span>
            </div>
            <div class="wall-card-body">${finalQuote}</div>
            <div class="wall-card-footer">— 致 ${nickname}</div>
        `;

        // 為新卡片綁定獨立的 click 事件[cite: 21]
        newCard.addEventListener('click', function() {
            window.clickWallCard(targetChinese, finalQuote, nickname, true);[cite: 21]
        });

        // 插入最前方[cite: 21]
        wallGrid.insertBefore(newCard, wallGrid.firstChild);[cite: 21]

        // 前端牆上限額 36 張以確保載入流暢[cite: 21]
        const currentCards = wallGrid.querySelectorAll('.wall-card');[cite: 21]
        if (currentCards.length > 36) {[cite: 21]
            currentCards[currentCards.length - 1].remove();[cite: 21]
        }

        // 重置放手按鈕狀態[cite: 21]
        const releaseBtn = document.getElementById('release-btn');[cite: 21]
        if (releaseBtn) {
            releaseBtn.disabled = false;[cite: 21]
            releaseBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> 釋懷，放手執著`;[cite: 21]
        }

        // 吸附滾動到留言牆[cite: 21]
        document.getElementById('wall-section-container').scrollIntoView({ behavior: 'smooth', block: 'start' });[cite: 21]

        const container = document.getElementById('slider-container');[cite: 21]
        if (container) {
            container.scrollLeft = 0; // 滾動軸拉回最左[cite: 21]
        }

        // 4. 背景非同步上傳到 Supabase[cite: 21]
        if (supabaseClient) {
            const fullText = `[${targetChinese}] ${finalQuote} (${nickname})`;[cite: 21]
            supabaseClient
                .from('remembrance-db')
                .insert([{ text: fullText }])[cite: 21]
                .then(({ error }) => {
                    if (error) console.error('背景備份 Supabase 失敗:', error);[cite: 21]
                });
        }

        // 清空表單[cite: 21]
        document.getElementById('nickname').value = "";[cite: 21]
        document.getElementById('memory').value = "";[cite: 21]

    } catch (err) {
        console.error('AI 生成或儲存失敗:', err);[cite: 21]
        alert('通道暫時擁擠，請再試一次。');[cite: 21]
    } finally {
        submitBtn.innerText = "⚡ 生成專屬思念卡片";[cite: 21]
        submitBtn.disabled = false;[cite: 21]
    }
};

/**
 * @function generateAIQuote
 * @description 發送請求至後端 Vercel Edge API（使用 Groq/Llama 3.3）進行高美學、帶有溫柔轉折的情感思念語錄生成。[cite: 21]
 * @param {string} targetType - 對象英文別名[cite: 21]
 * @param {string} name - 對方的稱呼[cite: 21]
 * @param {string} userMemory - 腦海中的畫面對象細節[cite: 21]
 * @returns {Promise<string>} 生成完畢的溫柔思念文案
 */
async function generateAIQuote(targetType, name, userMemory) {
    let targetLabel = targetType === 'relative' ? '親人' : targetType === 'friend' ? '朋友' : '寵物';[cite: 21]
    const prompt = `
        你是一位文字極具情感穿透力、細膩且內斂的當次CIS展覽文案大師。
        現在有一位參展者，他想念的對象是【${targetLabel}】，他稱呼對方為【${name}】。
        他留下的思念細節與記憶畫面是：『${userMemory}』。
        請為他撰寫一段 1 到 2 句、字數在 50~80 字內、極具文學美感的思念語錄。
        【核心美學限制與情緒轉折指令】：
        1. 語句必須完美、流暢地將參展者輸入的記憶細節融合進去，不得顯得突兀或語法不通.
        2. 重要：請敏銳分析使用者的字句。如果偵測到沉重、後悔、悲傷、寫到「過往時間無法挽回」、「遺憾」、「痛」等走不出的負面情緒，請在文案後半段巧妙地進行溫柔的意境轉折，改以溫暖、療癒、陪伴、或是賦予前行力量、釋懷的鼓勵方式結尾。
        3. 必須以第一人稱或致敬的宏觀視角書寫（例如：以「「致 ${name}：...」」或「「親愛的 ${name}：...」」為開頭，文字頭尾請加上引號「」）。
        4. 請直接輸出這段文案本身，絕對不要包含任何多餘的引言、解釋 or 「好的，這是為您生成的文案」等字眼。
    `;[cite: 21]

    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt })
    });[cite: 21]

    if (!response.ok) {
        const errData = await response.json();[cite: 21]
        throw new Error(errData.error || '後端伺服器錯誤');[cite: 21]
    }

    const data = await response.json();[cite: 21]
    return data.text;[cite: 21]
}

/**
 * @function fetchWallMessages
 * @description 從 Supabase 初始化載入最新 36 筆思念歷史，並使用「完美橫向列優先排序演算法」，
 *              將原本縱向排列的 1D 數據重組排列，實現在不影響 CSS 滾動寬度擴充前提下，100% 達成由左至右、由上而下的橫向序列。[cite: 21]
 */
async function fetchWallMessages() {
    if (!supabaseClient) return;[cite: 21]
    try {
        const { data: list, error } = await supabaseClient
            .from('remembrance-db')
            .select('*')
            .order('created_at', { ascending: false })[cite: 21]
            .limit(36);[cite: 21]

        if (error) throw error;[cite: 21]

        const wallGrid = document.getElementById('wall-grid');[cite: 21]
        if (!list || list.length === 0) {
            wallGrid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px; width: 100%;">牆上目前空無一物，留下第一份思念吧。</div>`;[cite: 21]
            return;
        }

        // 🎯 核心演算法：對齊 grid-auto-flow: column 呈現「由左至右」閱讀流
        const rows = 3;
        const cols = Math.ceil(list.length / rows);
        const sortedList = new Array(list.length);

        let itemIndex = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const targetIndex = c * rows + r; 
                if (itemIndex < list.length && targetIndex < list.length) {
                    sortedList[targetIndex] = list[itemIndex];
                    itemIndex++;
                }
            }
        }

        wallGrid.innerHTML = '';
        
        sortedList.forEach((targetItem) => {
            if (!targetItem) return;

            const match = targetItem.text.match(/^\[(.*?)\] (.*?) \((.*?)\)$/);[cite: 21]
            let category = '留白處';[cite: 21]
            let quote = targetItem.text;[cite: 21]
            let nickname = '思念者';[cite: 21]

            if (match) { 
                category = match[1];[cite: 21]
                quote = match[2];[cite: 21]
                nickname = match[3];[cite: 21]
            }

            const dateStr = new Date(targetItem.created_at).toLocaleDateString('zh-TW').replace(/\//g, '.');[cite: 21]
            const safeQuoteBase64 = btoa(unescape(encodeURIComponent(quote)));[cite: 21]

            const cardEl = document.createElement('div');[cite: 21]
            cardEl.className = 'wall-card';[cite: 21]
            cardEl.style.cursor = 'pointer';[cite: 21]
            cardEl.setAttribute('data-category', category);[cite: 21]
            cardEl.setAttribute('data-quote', safeQuoteBase64);[cite: 21]
            cardEl.setAttribute('data-nickname', nickname);[cite: 21]
            
            cardEl.innerHTML = `
                <div class="wall-card-header">
                    <span>思念回憶錄 / ${category}</span>
                    <span style="color: var(--text-muted);">${dateStr}</span>
                </div>
                <div class="wall-card-body">${quote}</div>
                <div class="wall-card-footer">— 致 ${nickname}</div>
            `;

            cardEl.addEventListener('click', function() {
                window.clickWallCard(category, quote, nickname, false);[cite: 21]
            });

            wallGrid.appendChild(cardEl);[cite: 21]
        }); 
        
    } catch (err) {
        console.error('讀取留言牆失敗:', err);[cite: 21]
    }
}

/**
 * @function clickWallCard
 * @description 點擊留言牆卡片事件。開啟全螢幕重逢 Modal，載入回憶內容。
 *              若是點擊參展者當次剛生成的發光卡片，保持「放手執著」按鈕可用，並在開啟 Modal 的當下立刻卸除牆上卡片的光暈以回歸平靜。[cite: 21]
 * @param {string} category - 對象分類名稱[cite: 21]
 * @param {string} quote - 語錄文案[cite: 21]
 * @param {string} nickname - 稱呼簽名[cite: 21]
 * @param {boolean} isNewCard - 是否為剛生成的發光卡片[cite: 21]
 */
window.clickWallCard = function(category, quote, nickname, isNewCard) {
    document.getElementById('card-tag-display').innerText = `思念回憶錄 / ${category}`;[cite: 21]
    document.getElementById('card-text-display').innerText = quote;[cite: 21]
    document.getElementById('card-sign-display').innerText = `— 致 ${nickname}`;[cite: 21]
    
    const releaseBtn = document.getElementById('release-btn');[cite: 21]
    
    if (releaseBtn) {
        if (isNewCard) {
            releaseBtn.disabled = false;[cite: 21]
            releaseBtn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> 釋懷，放手執著`;[cite: 21]
            hasExperiencedRelease = false;[cite: 21]
        } else {
            releaseBtn.disabled = true;[cite: 21]
            releaseBtn.innerHTML = `<i class="fa-solid fa-check"></i> 已化為祝福之光`;[cite: 21]
        }
    }

    // 🎯 點擊發光卡片的瞬間，立刻將背景牆上卡片的光暈、金色外框消除
    if (isNewCard) {
        const myNewCardOnWall = document.querySelector('.wall-card.my-new-card');[cite: 21]
        if (myNewCardOnWall) {
            myNewCardOnWall.classList.remove('my-new-card', 'card-fly-in');[cite: 21]
            
            const safeQuoteBase64 = myNewCardOnWall.getAttribute('data-quote');[cite: 21]
            const safeQuote = decodeURIComponent(escape(atob(safeQuoteBase64)));[cite: 21]
            
            const clonedCard = myNewCardOnWall.cloneNode(true);[cite: 21]
            myNewCardOnWall.parentNode.replaceChild(clonedCard, myNewCardOnWall);[cite: 21]
            clonedCard.addEventListener('click', function() {
                window.clickWallCard(category, safeQuote, nickname, false);[cite: 21]
            });
        }
    }
    
    const outputSection = document.getElementById('output-section');[cite: 21]
    outputSection.style.display = 'flex';[cite: 21]
    
    gsap.fromTo("#printable-card", 
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }[cite: 21]
    );
};

/**
 * @function closeReunionModal
 * @description 關閉全螢幕重逢儀式 Modal 視窗（套用縮小、漸變淡出動畫）。[cite: 21]
 */
window.closeReunionModal = function() {
    const outputSection = document.getElementById('output-section');[cite: 21]
    
    gsap.to("#printable-card", {
        scale: 0.8,
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: () => {
            outputSection.style.display = 'none';[cite: 21]
        }
    });
};

/**
 * @function slideWall
 * @description 點擊思念牆左右懸浮邊緣大箭頭時，執行平滑橫向捲動。[cite: 21]
 * @param {string} direction - 捲動方向（'left' 或 'right'）[cite: 21]
 */
window.slideWall = function(direction) {
    const container = document.getElementById('slider-container');[cite: 21]
    const scrollAmount = 304; // 單張卡片加上邊距的精確尺寸[cite: 21]
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });[cite: 21]
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });[cite: 21]
    }
};

/**
 * @function initDragScroll
 * @description 啟用滑鼠按住拖曳（Drag-to-Scroll）留言牆效果。實現如觸控螢幕般的自然橫向拖拽感。[cite: 21]
 */
function initDragScroll() {
    const slider = document.getElementById('slider-container');[cite: 21]
    let isDown = false; let startX; let scrollLeft;[cite: 21]
    slider.addEventListener('mousedown', (e) => {
        isDown = true; startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft;[cite: 21]
    });
    slider.addEventListener('mouseleave', () => { isDown = false; });[cite: 21]
    slider.addEventListener('mouseup', () => { isDown = false; });[cite: 21]
    slider.addEventListener('mousemove', (e) => {
        if(!isDown) return;
        e.preventDefault();[cite: 21]
        const x = e.pageX - slider.offsetLeft;[cite: 21]
        const walk = (x - startX) * 1.5;[cite: 21]
        slider.scrollLeft = scrollLeft - walk;[cite: 21]
    });
}

/**
 * @function downloadCard
 * @description 使用 html2canvas 將精緻的清水模卡片進行高解析度渲染導出，
 *              並自動轉換為 PNG 圖片，觸發瀏覽器下載儲育。[cite: 21]
 */
window.downloadCard = function() {
    const cardNode = document.getElementById('printable-card');[cite: 21]
    html2canvas(cardNode, {
        scale: 3, // 高解析 3 倍縮放
        backgroundColor: null,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');[cite: 21]
        link.download = `思念回憶卡-${document.getElementById('nickname').value || '洸限'}.png`;[cite: 21]
        link.href = canvas.toDataURL('image/png');[cite: 21]
        link.click();[cite: 21]
    }).catch(err => {
        console.error('卡片生成失敗:', err);[cite: 21]
        alert('卡片導出失敗，請再試一次。');[cite: 21]
    });
};

/**
 * @function releaseCardAndFly
 * @description 放手致意儀式核心。
 *              1. 鎖定按鈕防止重複點擊。
 *              2. 執行卡片 3D 顫動與模糊淡出。
 *              3. 基於物理座標在螢幕上建立 120 顆金色星砂微粒，往右上角消逝飄散。
 *              4. 展開第四階段完結頁。
 *              5. 暫時關閉 CSS Scroll-Snap 磁鐵滾動干擾，一氣呵成滑至最底部啟動詩意打字機。[cite: 21]
 */
window.releaseCardAndFly = function() {
    const card = document.getElementById('printable-card');[cite: 21]
    const releaseBtn = document.getElementById('release-btn');[cite: 21]
    const outputSection = document.getElementById('output-section');[cite: 21]
    
    if (!card || hasExperiencedRelease) return;[cite: 21]
    
    hasExperiencedRelease = true;[cite: 21]
    localStorage.setItem('hasExperiencedRelease', 'true');[cite: 21]
    releaseBtn.disabled = true;[cite: 21]
    releaseBtn.innerHTML = `🍃 正在化為祝福之光...`;[cite: 21]

    const rect = card.getBoundingClientRect();[cite: 21]

    // 1. 卡片顫抖動態[cite: 21]
    const shakeTl = gsap.timeline();[cite: 21]
    shakeTl.to(card, { x: "+=6", y: "-=3", rotation: 1, duration: 0.12, repeat: 10, yoyo: true })[cite: 21]
           .to(card, { x: 0, y: 0, rotation: 0, duration: 0.15 });[cite: 21]

    // 2. 建立金色與白色的碎屑粒子飄散[cite: 21]
    const particleCount = 120;[cite: 21]
    const colors = ['#c5a880', '#B59E74', '#FAF8F5', '#ffffff'];[cite: 21]

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');[cite: 21]
        particle.className = 'particle-debris';[cite: 21]
        
        const size = Math.random() * 8 + 3;[cite: 21]
        particle.style.width = `${size}px`;[cite: 21]
        particle.style.height = `${size}px`;[cite: 21]
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];[cite: 21]
        
        const startX = rect.left + Math.random() * rect.width;[cite: 21]
        const startY = rect.top + Math.random() * rect.height;[cite: 21]
        particle.style.left = `${startX}px`;[cite: 21]
        particle.style.top = `${startY}px`;[cite: 21]
        
        document.body.appendChild(particle);[cite: 21]

        const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.6;[cite: 21]
        const velocity = Math.random() * 350 + 150;[cite: 21]
        const targetX = startX + Math.cos(angle) * velocity;[cite: 21]
        const targetY = startY + Math.sin(angle) * velocity - 100;[cite: 21]

        gsap.to(particle, {
            x: targetX - startX,
            y: targetY - startY,
            scale: 0,
            opacity: 0,
            rotation: Math.random() * 720,
            duration: Math.random() * 2.0 + 2.0, 
            ease: "power2.out",
            onComplete: () => {
                particle.remove();[cite: 21]
            }
        });
    }

    // 3. 卡片 3D 翻轉模糊消逝[cite: 21]
    gsap.to(card, {
        scale: 0.3,
        rotationY: 90, 
        rotationX: 30,
        filter: "blur(15px)",
        opacity: 0,
        duration: 3.5, 
        ease: "power2.inOut",
        onComplete: () => {
            outputSection.style.display = 'none';[cite: 21]
            gsap.set(card, { scale: 1, rotationY: 0, rotationX: 0, filter: "none", opacity: 1 });[cite: 21]
            
            releaseBtn.disabled = true;[cite: 21]
            releaseBtn.innerHTML = `<i class="fa-solid fa-check"></i> 已化為祝福之光`;[cite: 21]

            // 4. 平滑展開落幕完結頁面[cite: 21]
            const outroSection = document.getElementById('outro-section');[cite: 21]
            const anchor = document.getElementById('outro-align-anchor');[cite: 21]
            
            if (outroSection && anchor) {
                document.documentElement.style.scrollSnapType = 'none'; // 暫時關閉 Snap[cite: 21]
                
                outroSection.style.transition = 'none'; // 破除 CSS 高度過渡時差
                outroSection.classList.add('active');[cite: 21]
                outroSection.style.height = '100vh';[cite: 21]
                outroSection.style.opacity = '1';[cite: 21]
                
                setTimeout(() => {
                    const container = document.getElementById('slider-container');[cite: 21]
                    if (container) {
                        container.scrollLeft = 0; 
                    }

                    // 100% 精準下沉滾動至底部隱形錨點
                    anchor.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'end' 
                    });
                    
                    setTimeout(() => {
                        startTypewriterEffect(); // 啟動文字打字機
                        outroSection.style.transition = ''; 
                        document.documentElement.style.scrollSnapType = 'y mandatory'; // 恢復 Snap
                    }, 1500);
                }, 50); 
            }
        }
    });
};

/**
 * @function startTypewriterEffect
 * @description 落幕文字打字機效果。以最舒適的詩意節奏（主標120ms/字，副標100ms/字），
 *              自動適應跨平台（電腦版單行排版、手機版安全折行），並在最後加上長久停留的「—」字。
 */
function startTypewriterEffect() {
    const textEl = document.getElementById('typewriter-text');
    const subEl = document.getElementById('typewriter-sub');
    
    const mainText = "「 那些不曾被遺忘的，都將在看不見的地方，溫柔地共振。」";[cite: 21]
    const subText = "洸限 — 願你帶著光，溫暖前行 — ";[cite: 21]
    
    if (!textEl || !subEl) return;[cite: 21]
    
    textEl.innerHTML = "";[cite: 21]
    subEl.innerHTML = "";[cite: 21]
    
    let mainIndex = 0;[cite: 21]
    const mainTimer = setInterval(() => {
        if (mainIndex < mainText.length) {
            textEl.innerHTML += mainText.charAt(mainIndex);[cite: 21]
            mainIndex++;[cite: 21]
        } else {
            clearInterval(mainTimer);[cite: 21]
            
            setTimeout(() => {
                let subIndex = 0;[cite: 21]
                const subTimer = setInterval(() => {
                    if (subIndex < subText.length) {
                        subEl.innerHTML += subText.charAt(subIndex);[cite: 21]
                        subIndex++;[cite: 21]
                    } else {
                        clearInterval(subTimer);[cite: 21]
                    }
                }, 100); 
            }, 800);[cite: 21]
        }
    }, 120);[cite: 21]
}
