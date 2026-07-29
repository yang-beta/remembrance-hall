// js/canvas.js --- 洸限 背景光束與金色粒子特效（柔光羽化與隨機透明度優化版）---

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
    particleGlowProgress: 0   // 階段三：金色粒子與總體發光強度
    
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
// 🎯【全新柔光優化】三階段光學束流與金色粒子系統
// ============================================================================

// 生成光線束條資料（加入獨立隨機透明度與微幅脈動相位）
const beamLines = [];
const beamCount = 65; // 適度增加數量讓羽化疊加更豐富

for (let i = 0; i < beamCount; i++) {
    const offset = (Math.random() - 0.5) * 650;
    
    // 基礎顏色：微調為暖金、香檳金、琥珀色與冷白
    const r = Math.floor(210 + Math.random() * 45);
    const g = Math.floor(130 + Math.random() * 70);
    const b = Math.floor(40 + Math.random() * 50);

    beamLines.push({
        offset: offset,
        width: Math.random() * 6 + 1.5,                  // 線條寬度
        baseColor: `${r}, ${g}, ${b}`,                  // RGB 基底
        baseAlpha: Math.random() * 0.45 + 0.15,         // 🎯 隨機基礎透明度（低飽和，靠疊加出質感）
        blurAmount: Math.floor(Math.random() * 30 + 20), // 🎯 隨機柔光羽化程度
        pulsePhase: Math.random() * Math.PI * 2,        // 動態脈動相位
        pulseSpeed: Math.random() * 0.015 + 0.005       // 輕微呼吸速度
    });
}

// 金色隨機飄散粒子
const goldParticles = [];
const particleCount = 110;

for (let i = 0; i < particleCount; i++) {
    goldParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3.0 + 0.8,
        alpha: Math.random() * 0.7 + 0.2,
        speedY: (Math.random() - 0.5) * 1.0,
        speedX: (Math.random() - 0.5) * 0.6,
        pulse: Math.random() * Math.PI
    });
}

/**
 * 繪製背景主視覺光束 (具備柔光羽化 + 隨機動態透明度)
 */
function drawLightBeams() {
    const horizonY = canvas.height * 0.65; // 地平線三分之二處
    const beamProgress = animationParams.beamDownProgress;
    const spreadProgress = animationParams.horizonSpreadProgress;

    if (beamProgress <= 0) return;

    // 1. 繪製中央高亮核心光軸 (加強高斯柔光陰影)
    ctx.save();
    ctx.shadowColor = 'rgba(255, 215, 130, 0.9)';
    ctx.shadowBlur = 90; // 🎯 強化核心大範圍柔光暈
    
    const centerGlow = ctx.createLinearGradient(cx, 0, cx, canvas.height);
    centerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    centerGlow.addColorStop(0.65, 'rgba(255, 240, 200, 0.95)');
    centerGlow.addColorStop(1, 'rgba(240, 180, 100, 0.7)');

    ctx.fillStyle = centerGlow;
    
    // 中央主垂直光柱
    const currentBeamHeight = horizonY * beamProgress;
    ctx.fillRect(cx - 12, 0, 24, currentBeamHeight);

    // 中央地平線延伸光柱
    if (spreadProgress > 0) {
        const spreadHeight = (canvas.height - horizonY) * spreadProgress;
        ctx.fillRect(cx - 12, horizonY, 24, spreadHeight);
    }
    ctx.restore();

    // 2. 啟用光學加算混合模式，使多層柔光疊加時自然亮化
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; // 🎯 關鍵：光線相交處呈現自然高亮過渡

    beamLines.forEach(line => {
        // 動態隨機呼吸透明度
        line.pulsePhase += line.pulseSpeed;
        const currentDynamicAlpha = line.baseAlpha + Math.sin(line.pulsePhase) * 0.08;
        const finalAlpha = Math.max(0.05, currentDynamicAlpha * animationParams.particleGlowProgress);

        ctx.beginPath();
        ctx.lineCap = 'round'; // 🎯 圓潤化端點，消除死板接縫
        ctx.lineJoin = 'round';
        ctx.lineWidth = line.width;
        
        // 🎯 每個光束線條獨立設定柔光陰影與顏色彩度
        ctx.shadowColor = `rgba(${line.baseColor}, ${finalAlpha * 0.8})`;
        ctx.shadowBlur = line.blurAmount; 
        ctx.strokeStyle = `rgba(${line.baseColor}, ${finalAlpha})`;

        // 階段一：垂直光束降落
        const currentY = horizonY * beamProgress;
        ctx.moveTo(cx + line.offset, 0);
        ctx.lineTo(cx + line.offset, currentY);

        // 階段二：地平線彎折擴散
        if (spreadProgress > 0) {
            const endX = cx + line.offset * 1.85;
            const endY = horizonY + (canvas.height - horizonY) * spreadProgress;
            
            ctx.quadraticCurveTo(
                cx + line.offset * 1.12, horizonY + 35,
                endX, endY
            );
        }

        ctx.stroke();
    });

    ctx.restore();
}

/**
 * 繪製隨機掉落與飛散的金色粒子
 */
function drawGoldParticles() {
    if (animationParams.particleGlowProgress <= 0) return;

    goldParticles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.03;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const currentAlpha = Math.sin(p.pulse) * 0.25 + p.alpha;

        ctx.save();
        ctx.fillStyle = `rgba(255, 215, 120, ${Math.max(0, currentAlpha * animationParams.particleGlowProgress)})`;
        ctx.shadowColor = 'rgba(255, 200, 80, 0.8)';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// 動畫渲染主迴圈
function render() {
    // 殘影塗佈：維持質感微醺尾韻
    ctx.fillStyle = 'rgba(26, 26, 26, 0.15)'; 
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
    duration: 1.8, 
    ease: "power2.inOut" 
});

tl.to(animationParams, { 
    horizonSpreadProgress: 1, 
    duration: 1.5, 
    ease: "power1.out" 
}, "-=0.3");

tl.to(".brand-title", { 
    opacity: 1, 
    letterSpacing: "1.2rem", 
    duration: 1.5, 
    ease: "power1.out" 
}, "-=1.0");

tl.to(animationParams, { 
    particleGlowProgress: 1, 
    duration: 1.2, 
    ease: "power2.out" 
}, "-=0.5");

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
