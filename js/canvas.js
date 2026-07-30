// js/canvas.js --- 洸限 背景光束與金色粒子特效（直線放射擴散優化版）---

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
 * 繪製背景光束 (去掉中間主光束 + 轉折處滑順，下半段直線放射)
 */
function drawLightBeams() {
    const horizonY = canvas.height * 0.65; // 地平線 2/3 處
    const turnRadius = 35;                 // 轉折處的圓滑弧度半徑
    const beamProgress = animationParams.beamDownProgress;
    const spreadProgress = animationParams.horizonSpreadProgress;

    if (beamProgress <= 0) return;

    // 計算垂直下降進度
    const currentY = horizonY * beamProgress;

    // 1. 繪製中央高亮核心光軸 (鎖定沉穩暖光)
    ctx.save();

    // 🎯 a. 增加模糊擴散：將 shadowBlur 從 50 大幅提升至 120，讓光暈向外溫柔鋪開
    ctx.shadowColor = 'rgba(215, 160, 80, 0.25)';
    ctx.shadowBlur = 120; 

    // 🎯 b. 降低亮度：調降漸層色中 alpha (最後一個數值)，將原本的 0.7~0.8 降至 0.2~0.35
    const centerGlow = ctx.createLinearGradient(cx, 0, cx, canvas.height);
    centerGlow.addColorStop(0, 'rgba(255, 250, 230, 0.25)');   // 頂部淡雅高光
    centerGlow.addColorStop(0.65, 'rgba(235, 190, 110, 0.35)'); // 中段溫暖金色
    centerGlow.addColorStop(1, 'rgba(180, 120, 50, 0.2)');      // 底部深邃沉穩

    ctx.fillStyle = centerGlow;

    ctx.beginPath();
    // 🎯 c. 加寬寬度：原本寬度為 16px (cx - 8 到 16)，加寬 2.5 倍改為 40px (cx - 20 到 40)
    // 如果希望更寬（3 倍），可以把 40 改為 48，`-20` 改為 `-24`
    ctx.rect(cx - 30, 0, 80, currentY);

    if (spreadProgress > 0) {
        const spreadH = (canvas.height - horizonY) * spreadProgress;
        ctx.rect(cx - 30, horizonY, 80, spreadH);
    }

    ctx.fill();
    ctx.restore();

    // 繪製束狀光條
    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; 

    beamLines.forEach(line => {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineWidth = line.width;
        ctx.strokeStyle = `rgba(${line.color}, ${line.alpha})`;

        const startX = cx + line.offset;
        
        // 起點：畫面頂部
        ctx.moveTo(startX, 0);

        if (spreadProgress <= 0) {
            // 階段一：僅垂直向下延伸
            ctx.lineTo(startX, currentY);
        } else {
            // 階段二：過渡到地平線轉折後，以【直線斜角】延伸向底部兩側
            
            // 計算地平線下的斜線終點位置 (直線放射效果)
            const endX = cx + line.offset * 2.2; 
            const finalEndY = horizonY + (canvas.height - horizonY);
            
            // 轉折點計算
            const turnStartY = horizonY - turnRadius;
            const turnEndY = horizonY + turnRadius;
            
            // 動態長度插值 (隨著動畫進度延伸)
            const currentEndX = startX + (endX - startX) * spreadProgress;
            const currentEndY = horizonY + (finalEndY - horizonY) * spreadProgress;

            // 1. 垂直往下畫到轉折點上方
            ctx.lineTo(startX, turnStartY);

            // 2. 🎯 [需求 2] 轉折處：用控制點繪製極其圓滑過渡的小弧線
            ctx.quadraticCurveTo(
                startX, horizonY, 
                startX + (currentEndX - startX) * 0.15, horizonY + (currentEndY - horizonY) * 0.15
            );

            // 3. 🎯 [需求 2] 轉折過後：直接用 LineTo 畫成完美強力的「斜直線」延伸到最底下！
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
