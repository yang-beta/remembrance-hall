// js/canvas.js --- 洸限 背景曼陀羅與 GSAP 進場動畫核心 ---

const canvas = document.getElementById('mandalaCanvas');
const ctx = canvas.getContext('2d');

// 🎯 幾何中心點座標設定 (使用 clientWidth/Height 確保排除滾動條干擾)[cite: 20]
let cx = document.documentElement.clientWidth / 2;[cite: 20]
let cy = document.documentElement.clientHeight / 2;[cite: 20]

/**
 * @function resizeCanvas
 * @description 監聽視窗縮放事件，動態調整 Canvas 畫布尺寸，並重新計算網頁絕對幾何中心點。
 *              不論在手機版 Safari 工具列升降，或電腦版縮放，皆能確保背景光源與粒子 100% 精準置中。[cite: 20]
 */
function resizeCanvas() {
    const viewWidth = document.documentElement.clientWidth;[cite: 20]
    const viewHeight = document.documentElement.clientHeight;[cite: 20]

    canvas.width = viewWidth;[cite: 20]
    canvas.height = viewHeight;[cite: 20]
    
    cx = viewWidth / 2;[cite: 20]
    cy = viewHeight / 2;[cite: 20]
}
resizeCanvas();[cite: 20]
window.addEventListener('resize', resizeCanvas);[cite: 20]

// 🎨 動態補間參數 (供 GSAP 動畫控制其屬性數值)[cite: 20]
let animationParams = {
    coreGlow: 0,             // 核心發光亮度 (0 到 1)[cite: 20]
    particleConvergence: 0,  // 粒子向中心聚合程度 (0 到 1)[cite: 20]
    mandalaProgress: 0,      // 曼陀羅線條繪製進度 (0 到 1)[cite: 20]
    mandalaRotation: 0       // 曼陀羅旋轉角度[cite: 20]
};

// 🌌 初始化粒子流動陣列[cite: 20]
const particles = [];[cite: 20]
const particleCount = 60;[cite: 20]

for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;[cite: 20]
    const distance = Math.random() * Math.max(canvas.width, canvas.height) * 0.6 + 100;[cite: 20]
    particles.push({
        baseX: Math.cos(angle) * distance, // 原始 X 偏離位置[cite: 20]
        baseY: Math.sin(angle) * distance, // 原始 Y 偏離位置[cite: 20]
        x: 0,
        y: 0,
        size: Math.random() * 1.5 + 0.5,   // 粒子微粒直徑[cite: 20]
        alpha: Math.random() * 0.5 + 0.2,  // 微光透明度[cite: 20]
        speed: Math.random() * 0.02 + 0.005 // 聚合與漂移速度[cite: 20]
    });
}

/**
 * @function drawMandalaLayer
 * @description 在畫布中央繪製高度對稱、如繁星軌跡般的極坐標數學曼陀羅幾何圖形。
 * @param {number} centerX - 畫布中心點 X[cite: 20]
 * @param {number} centerY - 畫布中心點 Y[cite: 20]
 * @param {number} radius - 曼陀羅極限發散半徑[cite: 20]
 * @param {number} progress - 目前繪製進度 (0 為未繪製，1 為完整閉合)[cite: 20]
 * @param {string} color - 線條發光色彩 (包含透明度)[cite: 20]
 */
function drawMandalaLayer(centerX, centerY, radius, progress, color) {
    if (progress <= 0) return;[cite: 20]
    
    ctx.beginPath();[cite: 20]
    ctx.strokeStyle = color;[cite: 20]
    ctx.lineWidth = 0.6;[cite: 20]

    const totalPoints = 360 * progress;[cite: 20]
    for (let i = 0; i <= totalPoints; i++) {
        const theta = (i * Math.PI) / 180;[cite: 20]
        const k = 6; // 瓣數參數[cite: 20]
        const r = radius * Math.sin(k * theta + animationParams.mandalaRotation);[cite: 20]
        
        const x = centerX + r * Math.cos(theta);[cite: 20]
        const y = centerY + r * Math.sin(theta);[cite: 20]
        
        if (i === 0) ctx.moveTo(x, y);[cite: 20]
        else ctx.lineTo(x, y);[cite: 20]
    }
}

/**
 * @function render
 * @description 核心渲染主迴圈 (動畫影格刷新)。負責繪製半透明背景（形成流光拖尾效果）、
 *              漸層核心光源、微光粒子漂移收縮以及背景曼陀羅層疊。[cite: 20]
 */
function render() {
    ctx.fillStyle = 'rgba(26, 26, 26, 0.08)'; // 建立高雅拖尾效果[cite: 20]
    ctx.fillRect(0, 0, canvas.width, canvas.height);[cite: 20]

    // 1. 渲染核心漸層發光[cite: 20]
    if (animationParams.coreGlow > 0) {
        let gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);[cite: 20]
        gradient.addColorStop(0, `rgba(255, 255, 255, ${animationParams.coreGlow})`);[cite: 20]
        gradient.addColorStop(0.2, `rgba(197, 168, 128, ${animationParams.coreGlow * 0.4})`);[cite: 20]
        gradient.addColorStop(1, 'rgba(26, 26, 26, 0)');[cite: 20]
        ctx.fillStyle = gradient;[cite: 20]
        ctx.beginPath();[cite: 20]
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);[cite: 20]
        ctx.fill();[cite: 20]
    }

    // 2. 渲染粒子聚合物理運動[cite: 20]
    particles.forEach(p => {
        const targetX = cx + p.baseX * (1 - animationParams.particleConvergence);[cite: 20]
        const targetY = cy + p.baseY * (1 - animationParams.particleConvergence);[cite: 20]
        
        p.x += (targetX - p.x) * p.speed;[cite: 20]
        p.y += (targetY - p.y) * p.speed;[cite: 20]

        ctx.fillStyle = `rgba(200, 200, 200, ${p.alpha})`;[cite: 20]
        ctx.beginPath();[cite: 20]
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);[cite: 20]
        ctx.fill();[cite: 20]
    });

    // 3. 渲染極緩曼陀羅複線[cite: 20]
    drawMandalaLayer(cx, cy, Math.min(cx, cy) * 0.4, animationParams.mandalaProgress, 'rgba(200, 200, 200, 0.25)');[cite: 20]
    drawMandalaLayer(cx, cy, Math.min(cx, cy) * 0.6, animationParams.mandalaProgress * 0.9, 'rgba(197, 168, 128, 0.18)');[cite: 20]

    requestAnimationFrame(render);[cite: 20]
}

render();[cite: 20]

// ==========================================
// GSAP 時序控制 (進場首頁優雅動態)[cite: 20]
// ==========================================
const tl = gsap.timeline();[cite: 20]

tl.to(animationParams, { coreGlow: 0.5, duration: 2, ease: "power1.inOut" });[cite: 20]
tl.to(animationParams, { particleConvergence: 1, coreGlow: 0.8, duration: 1.5, ease: "power2.in" }, "-=0.5");[cite: 20]
tl.to(".brand-title", { opacity: 1, letterSpacing: "1.2rem", duration: 1.5, ease: "power1.out" }, "-=0.2");[cite: 20]
tl.to(animationParams, { mandalaProgress: 1, duration: 2, ease: "power2.out" }, "-=0.5");[cite: 20]
tl.to(".main-question", { opacity: 1, y: -10, duration: 1.5, ease: "power1.out" }, "-=0.5");[cite: 20]
tl.to(".scroll-hint", { opacity: 1, duration: 1 });[cite: 20]

// 永續慢旋轉：讓背景幾何線條永不靜止，營造沉靜宇宙感[cite: 20]
gsap.to(animationParams, { 
    mandalaRotation: Math.PI * 2, 
    duration: 120, 
    repeat: -1, 
    ease: "none" 
});[cite: 20]

/**
 * @function scrollToContent
 * @description 綁定於首頁「Skip略過按鈕」及「向下滾動箭頭」。
 *              點擊時瞬間將進場動畫時間線拉至終點，並流暢、無阻礙地平滑滾動至留言板填寫區。[cite: 20]
 */
window.scrollToContent = function() {
    tl.progress(1);[cite: 20]
    document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });[cite: 20]
    gsap.to(".skip-anim-btn", { opacity: 0, pointerEvents: "none", duration: 0.5 });[cite: 20]
};
