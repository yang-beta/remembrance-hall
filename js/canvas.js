// js/canvas.js --- 洸限 背景光束與金色粒子特效（原曼陀羅保留註解版）---

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

// GSAP 動態控制參數：分為三階段進場
let animationParams = {
    // 階段一：垂直降落光束進度 (0 -> 1)
    beamDownProgress: 0,
    
    // 階段二：地平線橫向與向前擴散延伸進度 (0 -> 1)
    horizonSpreadProgress: 0,
    
    // 階段三：金色粒子飛散與光束整體亮度 (0 -> 1)
    particleGlowProgress: 0,
    
    // ==========================================
    // 📌 [舊版保留] 原曼陀羅與核心光暈參數 (以註解保留供後續參考)
    // ==========================================
    /*
    coreGlow: 0,         
    particleConvergence: 0, 
    mandalaProgress: 0,  
    mandalaRotation: 0   
    */
};

// ============================================================================
// 🎯【全新視覺效果】三階段光學束流與金色粒子系統
// ============================================================================

// 生成光線束條資料（束流由多條寬窄不一、顏色漸變的金紅光條組成）
const beamLines = [];
const beamCount = 45; // 光束線條數量

for (let i = 0; i < beamCount; i++) {
    // 偏離中央白光主軸的偏移量 (形成左右對稱延伸的束流)
    const offset = (Math.random() - 0.5) * 600;
    beamLines.push({
        offset: offset,
        width: Math.random() * 8 + 2, // 寬度
        // 顏色漸變：金黃、琥珀、暗紅與高亮白
        color: Math.random() > 0.3 
            ? `rgba(${220 + Math.floor(Math.random()*35)}, ${140 + Math.floor(Math.random()*50)}, ${50 + Math.floor(Math.random()*40)}, `
            : `rgba(255, 245, 220, `,
        alpha: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.02 + 0.005
    });
}

// 金色隨機飄散粒子
const goldParticles = [];
const particleCount = 100;

for (let i = 0; i < particleCount; i++) {
    goldParticles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 3.5 + 1.0,
        alpha: Math.random() * 0.8 + 0.2,
        speedY: (Math.random() - 0.5) * 1.2, // 微幅上下漂浮
        speedX: (Math.random() - 0.5) * 0.8, // 微幅左右漂浮
        pulse: Math.random() * Math.PI
    });
}

/**
 * 繪製背景主視覺光束 (垂直 -> 地平線彎折擴散)
 */
function drawLightBeams() {
    const horizonY = canvas.height * 0.65; // 約畫面 2/3 處作為地平線彎折點
    const beamProgress = animationParams.beamDownProgress;
    const spreadProgress = animationParams.horizonSpreadProgress;

    if (beamProgress <= 0) return;

    // 1. 繪製中央最亮的高能白光穿透線 (貫穿上下)
    const centerGlow = ctx.createLinearGradient(cx, 0, cx, canvas.height);
    centerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    centerGlow.addColorStop(0.65, 'rgba(255, 250, 230, 1)');
    centerGlow.addColorStop(1, 'rgba(255, 220, 150, 0.8)');

    ctx.save();
    ctx.shadowColor = '#ffe0a0';
    ctx.shadowBlur = 30;
    ctx.fillStyle = centerGlow;
    
    // 中央主垂直光柱
    const currentBeamHeight = horizonY * beamProgress;
    ctx.fillRect(cx - 15, 0, 30, currentBeamHeight);

    // 中央地平線延伸光柱
    if (spreadProgress > 0) {
        const spreadHeight = (canvas.height - horizonY) * spreadProgress;
        ctx.fillRect(cx - 15, horizonY, 30, spreadHeight);
    }
    ctx.restore();

    // 2. 繪製兩側的束狀光條 (直立向下 ➜ 地平線向外延伸彎折)
    beamLines.forEach(line => {
        ctx.beginPath();
        ctx.strokeStyle = line.color + (line.alpha * animationParams.particleGlowProgress) + ')';
        ctx.lineWidth = line.width;

        // 階段一：垂直光束降落 (由 0 降至 地平線 2/3 處)
        const currentY = horizonY * beamProgress;
        ctx.moveTo(cx + line.offset, 0);
        ctx.lineTo(cx + line.offset, currentY);

        // 階段二：地平線向外延展彎折 (由 地平線 2/3 處 延伸向螢幕底部與兩側)
        if (spreadProgress > 0) {
            // 透視開散效果：越靠近底部，X 軸偏移越顯著
            const endX = cx + line.offset * 1.8;
            const endY = horizonY + (canvas.height - horizonY) * spreadProgress;
            
            // 使用貝茲曲線營造順暢的彎折流動感
            ctx.quadraticCurveTo(
                cx + line.offset * 1.1, horizonY + 40,
                endX, endY
            );
        }

        ctx.stroke();
    });
}

/**
 * 繪製隨機掉落與飛散的金色粒子
 */
function drawGoldParticles() {
    if (animationParams.particleGlowProgress <= 0) return;

    goldParticles.forEach(p => {
        // 粒子飄動與呼吸感
        p.x += p.speedX;
        p.y += p.speedY;
        p.pulse += 0.03;

        // 邊界循環
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const currentAlpha = Math.sin(p.pulse) * 0.3 + p.alpha;

        ctx.save();
        ctx.fillStyle = `rgba(255, 215, 0, ${Math.max(0, currentAlpha * animationParams.particleGlowProgress)})`;
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// ==========================================
// 📌 [舊版保留] 舊曼陀羅繪製函式 (註解備查)
// ==========================================
/*
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
}
*/

// 動畫渲染主迴圈
function render() {
    // 使用暗深灰色背景（與 main.css 的 #1a1a1a 搭配，保留軌跡餘暈）
    ctx.fillStyle = 'rgba(26, 26, 26, 0.25)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 1. 繪製主視覺光束
    drawLightBeams();

    // 2. 繪製隨機金色飛散粒子
    drawGoldParticles();

    // ==========================================
    // 📌 [舊版保留] 原曼陀羅渲染調用
    // ==========================================
    /*
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

    drawMandalaLayer(cx, cy, Math.min(cx, cy) * 0.4, animationParams.mandalaProgress, 'rgba(200, 200, 200, 0.25)');
    drawMandalaLayer(cx, cy, Math.min(cx, cy) * 0.6, animationParams.mandalaProgress * 0.9, 'rgba(197, 168, 128, 0.18)');
    */

    requestAnimationFrame(render);
}

render();

// ==========================================
// GSAP 時序控制 (三階段進場動畫)
// ==========================================
const tl = gsap.timeline();

// 階段一：光線由上至下降落至畫面三分之二處 (約 1.8 秒)
tl.to(animationParams, { 
    beamDownProgress: 1, 
    duration: 1.8, 
    ease: "power2.inOut" 
});

// 階段二：光線自三分之二處地平線向外延伸擴散，同時呈現文字 (約 1.5 秒)
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

// 階段三：金色粒子與流動光束開始全面發光飛散 (約 1.2 秒)
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

// ==========================================
// 📌 [舊版保留] 原曼陀羅旋轉 Tween (註解備查)
// ==========================================
/*
const rotationTween = gsap.to(animationParams, { 
    mandalaRotation: Math.PI * 2, 
    duration: 120, 
    repeat: -1, 
    ease: "none" 
});
*/

// 略過動畫的全域函式
window.scrollToContent = function() {
    tl.progress(1);
    document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
    gsap.to(".skip-anim-btn", { opacity: 0, pointerEvents: "none", duration: 0.5 });
};
