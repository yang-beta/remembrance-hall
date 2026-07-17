// js/app.js --- 洸限 前端核心互動邏輯 (精準插頁與點擊解衝突版) ---

const SUPABASE_URL = "https://cwlxcsdqoigkutbeemvf.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_L52BGOl7tE2hBgLnqxnGoA_u6RQ3yrd";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    fetchWallMessages(); // 初始化載入歷史訊息
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

// ⚡ 體驗狀態鎖：紀錄使用者是否體驗過放手
let hasExperiencedRelease = false;

// ⚡ 核心：生成思念儀式卡片
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

// 向 Vercel 後端 API 發送請求
async function generateAIQuote(targetType, name, userMemory) {
    let targetLabel = targetType === 'relative' ? '親人' : targetType === 'friend' ? '朋友' : '寵物';
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

// 首次加載讀取資料庫 (橫向閱讀排序版)
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

// 🎯 階段三：重逢 - 開啟全螢幕 Modal
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
            
            const clonedCard = myNewCardOnWall.cloneNode(true);
            myNewCardOnWall.parentNode.replaceChild(clonedCard, myNewCardOnWall);
            clonedCard.addEventListener('click', function() {
                window.clickWallCard(category, safeQuote, nickname, false);
            });
        }
    }
    
    const outputSection = document.getElementById('output-section');
    outputSection.style.display = 'flex';
    
    gsap.fromTo("#printable-card", 
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.6, ease: "power2.out" }
    );
};

// 🎯 階段三：重逢 - 關閉全螢幕 Modal
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

// 橫向與拖曳滑動
window.slideWall = function(direction) {
    const container = document.getElementById('slider-container');
    const scrollAmount = 304; 
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
};

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

// 下載卡片
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

// ==========================================
// 🎯 階段四：放手執著 ── 金色星河飛散
// ==========================================
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

// 溫柔的打字機效果 (從 HTML 的空元素中一字一字打入)
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

// 核心修正：首頁進場略過按鈕的全域對齊邏輯
window.scrollToContent = function() {
    if (window.tl) window.tl.progress(1);
    document.getElementById('main-content').scrollIntoView({ behavior: 'smooth', block: 'start' });
    gsap.to(".skip-anim-btn", { opacity: 0, pointerEvents: "none", duration: 0.5 });
};
