// js/canvas.js --- 洸限 背景光束與金色粒子特效（語法修復與擴散過渡版）---

const canvas = document.getElementById('mandalaCanvas');
const ctx = canvas.getContext('2d');

let cx = document.documentElement.clientWidth / 2;
let cy = document.documentElement.clientHeight / 2;

function resizeCanvas() {
    const viewWidth = document.documentElement.clientWidth;
    const viewHeight = document.documentElement.clientHeight;

    canvas.width = viewWidth;
    canvas.height = viewHeight;
    
    cx = viewWidth / 2;
    cy = viewHeight / 2;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// GSAP 動態控制參數
let animationParams = {
    beamDownProgress: 0,      // 階段一：垂直降落進度
    horizonSpreadProgress: 0, // 階段二：地平線橫向與延伸進度
    particleGlowProgress: 0   // 階段三：金色粒子出現
};

// ============================================================================
// 光學束流與金色粒子系統
// ============================================================================

const beamLines = [];
const beamCount = 55; 

for (let i = 0; i < beamCount; i++) {
    const offset = (Math.random() - 0.5) * 600;
    
    const isGold = Math.random() > 0.25;
    const r = isGold ? Math.floor(200 + Math.random() * 40) : 240;
    const g = isGold ? Math.floor(130 + Math.random() * 50) : 220;
    const b = isGold ? Math.floor(40 + Math.random() * 40) : 180;

    beamLines.push({
        offset: offset,
        width: Math.random() * 3.5 + 1.2,
        color: `${r}, ${g}, ${b}`,
        alpha: Math.random() * 0.25 + 0.12,
        blurAmount: Math.floor(Math.random() * 10 + 4)
    });
}

// 金色隨機飄散粒子
const goldParticles = [];
const particleCount = 80;

for (let i = 0; i < particleCount; i++) {
    goldParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2.5 + 0.8,
        alpha: Math.random() * 0.6 + 0.2,
        speedY: (Math.random() - 0.5) * 0.8,
        speedX: (Math.random() - 0.5) * 0.5,
        pulse: Math.random() * Math.PI
    });
}

/**
 * 繪製背景光束 (中央主光束加粗擴散 + 轉折處滑順弧度，下半段直線放射)
 */
function drawLightBeams() {
    const horizonY = canvas.height * 0.65; // 地平線 2/3 處
    const turnRadius = 35;                 // 轉折處的圓滑弧度半徑
    const beamProgress = animationParams.beamDownProgress;
    const spreadProgress = animationParams.horizonSpreadProgress;

    if (beamProgress <= 0) return;

    // 計算當前垂直下降進度
    const currentY = horizonY * beamProgress;

    // 1. 繪製中央高亮核心光束 (多邊形梯形路徑：自然弧線轉折 + 底部放射擴散)
    ctx.save();
    ctx.shadowColor = 'rgba(215, 160, 80, 0.25)';
    ctx.shadowBlur = 120; // 柔光擴散度
    
    const centerGlow = ctx.createLinearGradient(cx, 0, cx, canvas.height);
    centerGlow.addColorStop(0, 'rgba(255, 250, 230, 0.25)');
    centerGlow.addColorStop(0.65, 'rgba(235, 190, 110, 0.35)');
    centerGlow.addColorStop(1, 'rgba(180, 120, 50, 0.2)');
    
    ctx.fillStyle = centerGlow;
    
    // 設定中央光束的關鍵維度 (預設寬度 80px: -40 到 +40)
    const beamHalfWidth = 40;     // 上半段半寬 (總寬 80px)
    const spreadFactor = 2.2;      // 下方擴散倍率：底部會寬達 80px * 2.2 = 176px
    
    // 幾何頂點計算
    const leftTopX = cx - beamHalfWidth;
    const rightTopX = cx + beamHalfWidth;
    
    ctx.beginPath();
    
    if (spreadProgress <= 0) {
        // 階段一：向下延伸 (保持垂直 80px 寬矩形)
        ctx.rect(leftTopX, 0, beamHalfWidth * 2, currentY);
    } else {
        // 階段二：過渡到地平線轉折，並一氣呵成繪製左右兩側向外擴散路徑
        const leftEndX = cx - (beamHalfWidth * spreadFactor) * spreadProgress;
        const rightEndX = cx + (beamHalfWidth * spreadFactor) * spreadProgress;
        const currentEndY = horizonY + (canvas.height - horizonY) * spreadProgress;
    
        // --- A. 左側邊界 ---
        ctx.moveTo(leftTopX, 0);
        ctx.lineTo(leftTopX, horizonY - turnRadius);
        
        ctx.quadraticCurveTo(
            leftTopX, horizonY,
            leftTopX + (leftEndX - leftTopX) * 0.15, horizonY + (currentEndY - horizonY) * 0.15
        );
        ctx.lineTo(leftEndX, currentEndY);
    
        // --- B. 底部邊界 ---
        ctx.lineTo(rightEndX, currentEndY);
    
        // --- C. 右側邊界 ---
        ctx.lineTo(rightTopX + (rightEndX - rightTopX) * 0.15, horizonY + (currentEndY - horizonY) * 0.15);
        
        ctx.quadraticCurveTo(
            rightTopX, horizonY,
            rightTopX, horizonY - turnRadius
        );
        ctx.lineTo(rightTopX, 0);
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. 繪製兩側束狀光條
    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; 

    beamLines.forEach(line => {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineWidth = line.width;
        ctx.strokeStyle = `rgba(${line.color}, ${line.alpha})`;

        const startX = cx + line.offset;
        
        ctx.moveTo(startX, 0);

        if (spreadProgress <= 0) {
            // 階段一：僅垂直向下延伸
            ctx.lineTo(startX, currentY);
        } else {
            // 階段二：轉折後以直線斜角延伸向底部兩側
            const endX = cx + line.offset * 2.2; 
            const finalEndY = horizonY + (canvas.height - horizonY);
            
            const turnStartY = horizonY - turnRadius;
            
            const currentEndX = startX + (endX - startX) * spreadProgress;
            const currentEndY = horizonY + (finalEndY - horizonY) * spreadProgress;

            // 1. 垂直往下畫到轉折點上方
            ctx.lineTo(startX, turnStartY);

            // 2. 轉折處：用控制點繪製圓滑過渡弧線
            ctx.quadraticCurveTo(
                startX, horizonY, 
                startX + (currentEndX - startX) * 0.15, horizonY + (currentEndY - horizonY) * 0.15
            );

            // 3. 轉折過後：斜直線延伸至最底下
            ctx.lineTo(currentEndX, currentEndY);
        }

        ctx.stroke();
    });

    ctx.restore();
}

/**
 * 繪製金色隨機粒子
 */
function drawGoldParticles() {
    if (animationParams.particleGlowProgress <= 0) return;

    goldParticles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.02;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const currentAlpha = Math.sin(p.pulse) * 0.2 + p.alpha;

        ctx.save();
        ctx.fillStyle = `rgba(235, 195, 100, ${Math.max(0, currentAlpha * animationParams.particleGlowProgress)})`;
        ctx.shadowColor = 'rgba(215, 160, 60, 0.6)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// 動畫渲染主迴圈
function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'rgba(26, 26, 26, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawLightBeams();
    drawGoldParticles();

    requestAnimationFrame(render);
}

render();

// GSAP 時序控制
const tl = gsap.timeline();

tl.to(animationParams, { 
    beamDownProgress: 1, 
    duration: 1.6, 
    ease: "power2.inOut" 
});

tl.to(animationParams, { 
    horizonSpreadProgress: 1, 
    duration: 1.4, 
    ease: "power2.out" 
}, "-=0.2");

tl.to(".brand-title", { 
    opacity: 1, 
    letterSpacing: "1.2rem", 
    duration: 1.4, 
    ease: "power1.out" 
}, "-=1.0");

tl.to(animationParams, { 
    particleGlowProgress: 1, 
    duration: 1.2, 
    ease: "power1.out" 
}, "-=0.4");

tl.to(".main-question", { 
    opacity: 1, 
    y: -10, 
    duration: 1.2, 
    ease: "power1.out" 
}, "-=0.8");

tl.to(".scroll-hint", { 
    opacity: 1, 
    duration: 1 
});

window.scrollToContent = function() {
    tl.progress(1);
    document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
    gsap.to(".skip-anim-btn", { opacity: 0, pointerEvents: "none", duration: 0.5 });
};
