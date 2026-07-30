// js/canvas.js --- 洸限 背景光束與金色粒子特效（優雅沉穩光感 & 無鬼影修正版）---

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
    particleGlowProgress: 0   // 階段三：僅控制金色粒子的出現
    
    // ==========================================
    // 📌 [舊版保留] 原曼陀羅參數 (備查)
    // ==========================================
    /*
    coreGlow: 0,         
    particleConvergence: 0, 
    mandalaProgress: 0,  
    mandalaRotation: 0   
    */
};

// ============================================================================
// 🎯 光學束流與金色粒子系統（精確控制透明度與色調）
// ============================================================================

const beamLines = [];
const beamCount = 50; 

for (let i = 0; i < beamCount; i++) {
    const offset = (Math.random() - 0.5) * 600;
    
    // 調配沉穩奢華的金琥珀色調
    const isGold = Math.random() > 0.25;
    const r = isGold ? Math.floor(200 + Math.random() * 40) : 240;
    const g = isGold ? Math.floor(130 + Math.random() * 50) : 220;
    const b = isGold ? Math.floor(40 + Math.random() * 40) : 180;

    beamLines.push({
        offset: offset,
        width: Math.random() * 4 + 1.2,                // 控制較細的精緻線條
        color: `${r}, ${g}, ${b}`,
        alpha: Math.random() * 0.25 + 0.1,             // 🎯 降低基礎透明度，避免疊加後過暴
        blurAmount: Math.floor(Math.random() * 12 + 4) // 適度的柔光效果
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
 * 繪製背景主視覺光束 (解決轉折跳動與過暴問題)
 */
function drawLightBeams() {
    const horizonY = canvas.height * 0.65; // 地平線 2/3 處
    const beamProgress = animationParams.beamDownProgress;
    const spreadProgress = animationParams.horizonSpreadProgress;

    if (beamProgress <= 0) return;

    // 計算當前垂直下降的端點 Y 座標 (最高至 horizonY)
    const currentY = horizonY * beamProgress;

    // 1. 繪製中央高亮核心光軸 (鎖定沉穩暖光)
    ctx.save();
    ctx.shadowColor = 'rgba(215, 160, 80, 0.5)';
    ctx.shadowBlur = 30;
    
    const centerGlow = ctx.createLinearGradient(cx, 0, cx, canvas.height);
    centerGlow.addColorStop(0, 'rgba(255, 250, 230, 0.7)');
    centerGlow.addColorStop(0.65, 'rgba(235, 190, 110, 0.8)');
    centerGlow.addColorStop(1, 'rgba(180, 120, 50, 0.5)');

    ctx.fillStyle = centerGlow;
    
    // 中央主軸一氣呵成繪製
    ctx.beginPath();
    ctx.rect(cx - 8, 0, 16, currentY);
    if (spreadProgress > 0) {
        const spreadH = (canvas.height - horizonY) * spreadProgress;
        ctx.rect(cx - 8, horizonY, 16, spreadH);
    }
    ctx.fill();
    ctx.restore();

    // 2. 繪製束狀光條 (使用一筆劃連續貝茲曲線，徹底取消過暴疊加)
    ctx.save();
    // 🎯 核心修改 1：改用 source-over，防止動畫後期越疊越亮
    ctx.globalCompositeOperation = 'source-over'; 

    beamLines.forEach(line => {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineWidth = line.width;
        
        // 🎯 核心修改 2：恆定透明度，不再隨時間增亮
        ctx.strokeStyle = `rgba(${line.color}, ${line.alpha})`;

        // 起點：頂部
        ctx.moveTo(cx + line.offset, 0);

        if (spreadProgress <= 0) {
            // 階段一：僅垂直向下繪製，無跳動
            ctx.lineTo(cx + line.offset, currentY);
        } else {
            // 階段二：過渡至地平線並順暢延伸向兩側
            const startX = cx + line.offset;
            const endX = cx + line.offset * 1.9; 
            const currentEndY = horizonY + (canvas.height - horizonY) * spreadProgress;

            // 🎯 核心修改 3：雙控制點連續三次貝茲曲線，確保轉折處極度平滑
            ctx.lineTo(startX, horizonY - 10);
            ctx.bezierCurveTo(
                startX, horizonY + 40,                       // 第一控制點：維持垂直勢頭
                startX + (endX - startX) * 0.3, horizonY + 60, // 第二控制點：順暢鋪開
                startX + (endX - startX) * spreadProgress, currentEndY // 當前延伸終點
            );
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
    // 🎯 核心修改 4：徹底清空每幀畫布，完全消除殘影鬼影與底圖髒污
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 繪製極淺的背景底色維持深邃質感
    ctx.fillStyle = 'rgba(26, 26, 26, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawLightBeams();
    drawGoldParticles();

    requestAnimationFrame(render);
}

render();

// GSAP 時序控制 (順暢三階段)
const tl = gsap.timeline();

// 階段一：光束向下降落
tl.to(animationParams, { 
    beamDownProgress: 1, 
    duration: 1.6, 
    ease: "power2.inOut" 
});

// 階段二：地平線向外延伸 (與標題同步)
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

// 階段三：金色飄散粒子出現 (不再影響光束亮度)
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
