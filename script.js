const canvas = document.getElementById('mandalaCanvas');
const ctx = canvas.getContext('2d');

// 讓畫布尺寸比照目前常見的螢幕大小 (RWD)
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 動態控制參數（供 GSAP 補間動畫使用）
let animationParams = {
    coreGlow: 0,         // 階段 1&2: 中心光核亮度
    particleConvergence: 0, // 階段 2: 粒子向心聚集度 (0為散開，1為聚合)
    mandalaProgress: 0,  // 階段 4: 曼陀羅線條繪製進度 (0到1)
    mandalaRotation: 0   // 階段 5: 圓滿後的緩慢旋轉
};

// 產生初始背景沙粒
const particles = [];
const particleCount = 60; // 奢華極簡，不宜過多

for (let i = 0; i < particleCount; i++) {
    // 隨機分佈在四周
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

// 繪製單道曼陀羅幾何線條的數學函數 (Rose Curve 變形)
function drawMandalaLayer(centerX, centerY, radius, progress, color) {
    if (progress <= 0) return;
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6; // 極細線條

    const totalPoints = 360 * progress; // 根據進度決定畫多少度
    for (let i = 0; i <= totalPoints; i++) {
        const theta = (i * Math.PI) / 180;
        
        // 數學曼陀羅核心公式：疊加多重正弦波形成神聖幾何
        const k = 6; // 瓣數
        const r = radius * Math.sin(k * theta + animationParams.mandalaRotation);
        
        const x = centerX + r * Math.cos(theta);
        const y = centerY + r * Math.sin(theta);
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

// 主渲染迴圈 (每秒60影格)
function render() {
    // 清空畫布，並帶有一點點殘影，製造流沙拖曳感
    ctx.fillStyle = 'rgba(26, 26, 26, 0.08)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    // 1. 繪製中心光核 (核心凝聚效果)
    if (animationParams.coreGlow > 0) {
        let gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
        gradient.addColorStop(0, `rgba(255, 255, 255, ${animationParams.coreGlow})`);
        gradient.addColorStop(0.2, `rgba(197, 168, 128, ${animationParams.coreGlow * 0.4})`); // 冷金
        gradient.addColorStop(1, 'rgba(26, 26, 26, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.fill();
    }

    // 2. 繪製向心粒子沙流
    particles.forEach(p => {
        // 計算當前收斂位置
        const targetX = cx + p.baseX * (1 - animationParams.particleConvergence);
        const targetY = cy + p.baseY * (1 - animationParams.particleConvergence);
        
        // 緩動公式讓粒子產生螺旋軌道
        p.x += (targetX - p.x) * p.speed;
        p.y += (targetY - p.y) * p.speed;

        ctx.fillStyle = `rgba(200, 200, 200, ${p.alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });

    // 3. 繪製極簡奢華曼陀羅 (層層疊加線條)
    // 第一層：銀色內圈
    drawMandalaLayer(cx, cy, Math.min(cx, cy) * 0.4, animationParams.mandalaProgress, 'rgba(200, 200, 200, 0.25)');
    // 第二層：冷金外圈 (稍微交錯)
    drawMandalaLayer(cx, cy, Math.min(cx, cy) * 0.6, animationParams.mandalaProgress * 0.9, 'rgba(197, 168, 128, 0.18)');

    requestAnimationFrame(render);
}

// 啟動渲染
render();

// ==========================================
// GSAP 時序控制 (8秒進場動畫精心設計)
// ==========================================
const tl = gsap.timeline();

// 階段 1：光之初 (0:00 - 0:02) -> 中心光點微弱浮現
tl.to(animationParams, {
    coreGlow: 0.5,
    duration: 2,
    ease: "power1.inOut"
});

// 階段 2：收斂與凝聚 (0:02 - 0:03.5) -> 沙粒吸向中心，光核擴大
tl.to(animationParams, {
    particleConvergence: 1,
    coreGlow: 0.8,
    duration: 1.5,
    ease: "power2.in"
}, "-=0.5");

// 階段 3：顯影 (0:03.5 - 0:05) -> 「洸限」字體優雅淡入
tl.to(".brand-title", {
    opacity: 1,
    letterSpacing: "1.2rem", // 字距微微張開的奢華感
    duration: 1.5,
    ease: "power1.out"
}, "-=0.2");

// 階段 4：重構與綻放 (0:05 - 0:07) -> 金銀幾何線條層層精確展開
tl.to(animationParams, {
    mandalaProgress: 1,
    duration: 2,
    ease: "power2.out"
}, "-=0.5");

// 階段 5：圓滿 (0:07+) -> 核心提問文字打字機淡入、開放網頁捲動
tl.to(".main-question", {
    opacity: 1,
    y: -10,
    duration: 1.5,
    ease: "power1.out"
}, "-=0.5");

// 顯示提示箭頭並恢復頁面滾動
tl.to(".scroll-hint", {
    opacity: 1,
    duration: 1,
    onComplete: () => {
        document.body.style.overflow = "auto"; // 允許使用者往下瀏覽
    }
});

// 圓滿後的永續狀態：曼陀羅保持極緩慢地旋轉（生命循環隱喻）
gsap.to(animationParams, {
    mandalaRotation: Math.PI * 2,
    duration: 120, // 兩分鐘轉一圈，極度內斂
    repeat: -1,
    ease: "none"
});
