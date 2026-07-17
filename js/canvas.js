// js/canvas.js --- 洸限 背景曼陀羅與 GSAP 進場動畫核心 ---

/**
 * ============================================================================
 * 🌌 洸限 (Absence Resonance) - 背景曼陀羅與 GSAP 進場動畫核心
 * ────────────────────────────────────────────────────────────────────────────
 * 【核心用途】
 *  本檔案主導展覽首頁的「宇宙粒子聚合」與「極緩慢旋轉幾何軌跡」之視覺場景。
 *  透過 HTML5 Canvas 高效能渲染與 GSAP (GreenSock Animation Platform) 的時間線控制，
 *  在網頁最底層建立起深邃、內斂且動態的宇宙空間，並提供順暢的進場與「略過動畫」快轉機制。
 * 
 * 【物理與視覺渲染流程】
 *  1. 網頁開啟時，計算排除滾動條後的精確幾何中心點 (cx, cy)[cite: 29]。
 *  2. 亂數生成 60 顆處於極遠處邊界的微光粒子[cite: 29]。
 *  3. 調用 GSAP 時間線，分階段控制核心漸層發光度、粒子聚合比例與字體淡入[cite: 29]。
 *  4. 使用 requestAnimationFrame 建立高頻重新繪製循環（Render Loop），
 *     藉由半透明填充疊加（rgba 拖尾），使粒子運動產生優雅的「流光逝影」殘影感[cite: 29]。
 * ============================================================================
 */

const canvas = document.getElementById('mandalaCanvas');
const ctx = canvas.getContext('2d');

// 🎯 跨平台終極修正：使用 clientWidth/Height 100% 精確避開滾動條與手機工具列干擾
// 💡 捨棄 window.innerWidth 避免在 Windows 系統或行動裝置彈出工具列時產生幾何中心偏置
let cx = document.documentElement.clientWidth / 2;
let cy = document.documentElement.clientHeight / 2;

/**
 * @function resizeCanvas
 * @description 監聽視窗尺寸改變（如手機橫豎屏切換、視窗縮放），動態調整畫布大小。
 * 【運作邏輯】
 *  1. 取得最新純淨視窗寬高（排除邊界滾動條與手機網址列抖動阻礙）[cite: 29]。
 *  2. 將畫布像素寬高同步設定為該數值，防止 Canvas 畫布因預設拉伸而模糊[cite: 29]。
 *  3. 重新校準絕對幾何中心點 (cx, cy)，確保背後的發光點與幾何圖形始終居中[cite: 29]。
 */
function resizeCanvas() {
    // 💡 100% 精確取得排除滾動條後的純淨視窗寬高
    const viewWidth = document.documentElement.clientWidth;
    const viewHeight = document.documentElement.clientHeight;

    canvas.width = viewWidth;
    canvas.height = viewHeight;
    
    // 💡 精確更新幾何中心點，不論在 Windows、Mac 還是 iOS，光源與粒子 100% 絕對居中
    cx = viewWidth / 2;
    cy = viewHeight / 2;
}
resizeCanvas(); // 初始化畫布尺寸[cite: 29]
window.addEventListener('resize', resizeCanvas); // 註冊縮放事件監聽[cite: 29]

/**
 * @namespace animationParams
 * @description 補間動畫核心參數。供外部 GSAP 動畫庫進行數值調配，並在 render() 主循環中實時解算渲染。
 * @property {number} coreGlow - 幾何中心發光點的漸層亮度與不透明度 (0 ~ 1)[cite: 29]
 * @property {number} particleConvergence - 粒子向幾何中心聚合的百分比 (0 代表完全分散在四周，1 代表完全聚合至中心)[cite: 29]
 * @property {number} mandalaProgress - 曼陀羅極坐標線條的繪製進度 (0 ~ 1)[cite: 29]
 * @property {number} mandalaRotation - 曼陀羅線條的當前旋轉角度（弧度值，隨時間無限遞增）[cite: 29]
 */
let animationParams = {
    coreGlow: 0,         
    particleConvergence: 0, 
    mandalaProgress: 0,  
    mandalaRotation: 0   
};

// 🌌 初始化背景星塵微粒陣列[cite: 29]
const particles = [];
const particleCount = 60; // 粒子總數[cite: 29]

/**
 * 【粒子空間物理分佈公式】
 *  1. 隨機生成一個 0 至 2π (360度) 弧度的旋轉角 angle[cite: 29]。
 *  2. 計算亂數初始距離 distance。以畫布最大對角線半徑的 0.6 倍為基礎，
 *     加上 100px 的基礎邊界，確保粒子最初100%誕生在視窗邊緣之外（營造由外而內的深邃聚合感）[cite: 29]。
 *  3. 利用極坐標轉換公式，將角度與半徑轉換為 baseX 與 baseY 儲存，作為聚合物理軌跡的參考起點[cite: 29]：
 *     - baseX = cos(angle) * distance[cite: 29]
 *     - baseY = sin(angle) * distance[cite: 29]
 *  4. 設定隨機粒子微粒尺寸、隨機基礎透明度，以及微幅隨機運動速度[cite: 29]。
 */
for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * Math.max(canvas.width, canvas.height) * 0.6 + 100;
    particles.push({
        baseX: Math.cos(angle) * distance,
        baseY: Math.sin(angle) * distance,
        x: 0,
        y: 0,
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
        speed: Math.random() * 0.02 + 0.005
    });
}

/**
 * @function drawMandalaLayer
 * @description 於畫布幾何中心 (centerX, centerY) 繪製基於極坐標玫瑰曲線演算法的對稱曼陀羅軌跡線。
 * @param {number} centerX - 幾何中心點 X 座標[cite: 29]
 * @param {number} centerY - 幾何中心點 Y 座標[cite: 29]
 * @param {number} radius - 玫瑰瓣線的最大極限發散半徑[cite: 29]
 * @param {number} progress - 當前線條繪製進度百分比 (0 ~ 1)[cite: 29]
 * @param {string} color - Canvas 筆觸發光線條色彩樣式 (帶有透明度)[cite: 29]
 * 
 * 【數學公式解析】
 *  - 極坐標玫瑰瓣線（Rose Curve）公式為：$r = a \cdot \sin(k \cdot \theta)$[cite: 20, 29]
 *  - 在此處中：
 *    - `k = 6` 決定幾何圖形擁有偶數的瓣數（對稱玫瑰花形）[cite: 20, 29]。
 *    - 加入 `animationParams.mandalaRotation` 作為相位偏移，實現線條隨時間優雅旋轉[cite: 20, 29]。
 *    - 轉換回直角坐標：
 *      - $x = centerX + r \cdot \cos(\theta)$[cite: 20, 29]
 *      - $y = centerY + r \cdot \sin(\theta)$[cite: 20, 29]
 *  - 進度控制：將總角度限定在 360 度乘上繪製進度 progress。當 progress 逐步成長時，玫瑰瓣線將如花朵般緩緩在深空勾勒綻放[cite: 20, 29]。
 */
function drawMandalaLayer(centerX, centerY, radius, progress, color) {
    if (progress <= 0) return;
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;

    const totalPoints = 360 * progress; 
    for (let i = 0; i <= totalPoints; i++) {
        const theta = (i * Math.PI) / 180;
        const k = 6; 
        const r = radius * Math.sin(k * theta + animationParams.mandalaRotation);
        
        const x = centerX + r * Math.cos(theta);
        const y = centerY + r * Math.sin(theta);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    // 🎯 核心修正：將 ctx.stroke() 註解掉。
    // 隱藏曼陀羅花，未來以展覽主視覺橫幅海報（Banner Poster）為主[cite: 29]
    // ctx.stroke();
}

/**
 * @function render
 * @description 畫布的渲染核心主循環 (Render Loop)。每秒執行約 60 次畫面刷新。
 * 【運作流程詳解】
 *  1. **拖尾流光殘影處理：**
 *     不使用傳統的 clearRect 完全清空畫布，而是使用極度不透明（僅 8% 覆蓋）的深炭灰填充整幅畫布[cite: 29]：
 *     `ctx.fillStyle = 'rgba(26, 26, 26, 0.08)'`[cite: 29]。
 *     這會使前一影格繪製的粒子和光源在多次疊加填充後慢慢淡出，在畫面上形成具有流暢感、感性的拖尾流光效果[cite: 20, 29]。
 *  2. **繪製幾何中心漸層發光（Core Glow）：**
 *     若 `coreGlow > 0`，則在 (cx, cy) 中心建立一個半徑為 60px 的放射狀漸層（RadialGradient）[cite: 29]。
 *     從中心的純白光暈逐漸過渡到邊緣的展覽冷金，最後完全融入背景中，塑造出空無之中的共振光源[cite: 20, 29]。
 *  3. **計算粒子聚合運動：**
 *     遍歷 particles 陣列，根據 `animationParams.particleConvergence` 的聚合進度百分比，
 *     動態計算粒子當前應該趨近中心點 (cx, cy) 的目標坐標 targetX 與 targetY[cite: 29]：
 *     `targetX = cx + p.baseX * (1 - animationParams.particleConvergence)`[cite: 29]。
 *     利用漸進差值補間演算法，讓粒子往各自的目標點漂移[cite: 29]：
 *     `p.x += (targetX - p.x) * p.speed`[cite: 29]。
 *     這能形成一种極為柔和、平穩的「吸附式」向心運動，隨後在畫布上渲染出細微圓形粒子[cite: 29]。
 *  4. **背景曼陀羅層疊：**
 *     在底層繪製內圈 0.4 倍半徑與外圈 0.6 倍半徑的兩層極弱感性玫瑰曲線，作為隱形背景氛圍[cite: 29]。
 *  5. **遞迴影格渲染：**
 *     呼叫 `requestAnimationFrame(render)`，引導瀏覽器安排下一影格重新渲染，保證顯示效能最大化與動態流暢[cite: 29]。
 */
function render() {
    ctx.fillStyle = 'rgba(26, 26, 26, 0.08)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (animationParams.coreGlow > 0) {
        let gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${animationParams.coreGlow})`);
        gradient.addColorStop(0.2, `rgba(197, 168, 128, ${animationParams.coreGlow * 0.4})`); 
        gradient.addColorStop(1, 'rgba(26, 26, 26, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.fill();
    }

    particles.forEach(p => {
        const targetX = cx + p.baseX * (1 - animationParams.particleConvergence);
        const targetY = cy + p.baseY * (1 - animationParams.particleConvergence);
        
        p.x += (targetX - p.x) * p.speed;
        p.y += (targetY - p.y) * p.speed;

        ctx.fillStyle = `rgba(200, 200, 200, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    drawMandalaLayer(cx, cy, Math.min(cx, cy) * 0.4, animationParams.mandalaProgress, 'rgba(200, 200, 200, 0.25)');
    drawMandalaLayer(cx, cy, Math.min(cx, cy) * 0.6, animationParams.mandalaProgress * 0.9, 'rgba(197, 168, 128, 0.18)');

    requestAnimationFrame(render);
}

render(); // 啟動背景渲染主循環[cite: 29]

// ==========================================
// GSAP 時序控制 (進場動畫 - 支援快轉與略過)[cite: 29]
// ==========================================
/**
 * 【GSAP Timeline 補間時序與美學流動說明】
 *  - 0.0s ~ 2.0s: 中心冷金光點核心漸漸由暗調亮至 0.5 發光度[cite: 29]。
 *  - 1.5s ~ 3.0s: (-=0.5s) 星塵粒子瘋狂收縮聚合至中心，發光度在交匯點爆發拉高至 0.8[cite: 20, 29]。
 *  - 2.8s ~ 4.3s: (-=0.2s) 首頁巨幅標題「洸限」以 power1.out 優雅淡入，字距逐漸朝左右兩側大器舒展開來（letterSpacing 擴展）[cite: 20, 29]。
 *  - 3.8s ~ 5.8s: (-=0.5s) 背景極緩慢的曼陀羅極坐標玫瑰幾何線條繪製進度（progress）衝到滿，完成深空輪廓[cite: 20, 29]。
 *  - 5.3s ~ 6.8s: (-=0.5s) 進場主提問「如果還有一次機會...」沿 Y 軸向上緩緩位移並淡入[cite: 20, 29]。
 *  - 6.8s ~ 7.8s: 底部提示向下滾動的指引箭頭淡入，揭開主展覽序幕[cite: 29]。
 */
const tl = gsap.timeline();

tl.to(animationParams, { coreGlow: 0.5, duration: 2, ease: "power1.inOut" });
tl.to(animationParams, { particleConvergence: 1, coreGlow: 0.8, duration: 1.5, ease: "power2.in" }, "-=0.5");
tl.to(".brand-title", { opacity: 1, letterSpacing: "1.2rem", duration: 1.5, ease: "power1.out" }, "-=0.2");
tl.to(animationParams, { mandalaProgress: 1, duration: 2, ease: "power2.out" }, "-=0.5");
tl.to(".main-question", { opacity: 1, y: -10, duration: 1.5, ease: "power1.out" }, "-=0.5");
tl.to(".scroll-hint", { opacity: 1, duration: 1 });

// 永續狀態：曼陀羅與粒子星空中，保持極度緩慢且永無止盡地在背景旋轉（每 120 秒完成一整圈 2π 弧度）[cite: 29]
const rotationTween = gsap.to(animationParams, { 
    mandalaRotation: Math.PI * 2, 
    duration: 120, 
    repeat: -1, 
    ease: "none" 
});

/**
 * @function scrollToContent
 * @description 綁定於首頁「略過進場動畫」按鈕與底部引導箭頭。
 * 【運作流程解析】
 *  1. `tl.progress(1)`: 核心關鍵！將上述所有進場補間動畫的進度瞬間「強行拉至 100% 完結狀態」[cite: 29]。
 *     這能瞬間完成文字淡入、粒子聚合與幾何線條繪製，彻底解除動畫與滾動指針重疊時可能的渲染衝突[cite: 29]。
 *  2. 使用 smooth 補間、靠頂（start）對齊的方式，平滑且無阻礙地將瀏覽器視窗滾動至實體留言板輸入區 (`main-content`)[cite: 29]。
 *  3. 使用 GSAP 的 `opacity: 0` 和 `pointerEvents: "none"`，在 0.5 秒內優雅隱藏並鎖死「略過動畫按鈕」，完成任務[cite: 29]。
 */
window.scrollToContent = function() {
    tl.progress(1);
    document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
    gsap.to(".skip-anim-btn", { opacity: 0, pointerEvents: "none", duration: 0.5 });
};
