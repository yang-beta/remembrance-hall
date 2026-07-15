// js/canvas.js --- 洸限 背景曼陀羅與 GSAP 進場動畫核心 ---

const canvas = document.getElementById('mandalaCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let animationParams = {
    coreGlow: 0,         
    particleConvergence: 0, 
    mandalaProgress: 0,  
    mandalaRotation: 0   
};

const particles = [];
const particleCount = 60; 

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
    ctx.stroke();
}

function render() {
    ctx.fillStyle = 'rgba(26, 26, 26, 0.08)'; 
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

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

render();

// ==========================================
// GSAP 時序控制 (進場動畫 - 支援快轉與略過)
// ==========================================
const tl = gsap.timeline();

tl.to(animationParams, { coreGlow: 0.5, duration: 2, ease: "power1.inOut" });
tl.to(animationParams, { particleConvergence: 1, coreGlow: 0.8, duration: 1.5, ease: "power2.in" }, "-=0.5");
tl.to(".brand-title", { opacity: 1, letterSpacing: "1.2rem", duration: 1.5, ease: "power1.out" }, "-=0.2");
tl.to(animationParams, { mandalaProgress: 1, duration: 2, ease: "power2.out" }, "-=0.5");
tl.to(".main-question", { opacity: 1, y: -10, duration: 1.5, ease: "power1.out" }, "-=0.5");
tl.to(".scroll-hint", { opacity: 1, duration: 1 });

// 永續狀態：曼陀羅保持極緩慢地旋轉
const rotationTween = gsap.to(animationParams, { 
    mandalaRotation: Math.PI * 2, 
    duration: 120, 
    repeat: -1, 
    ease: "none" 
});

// 🎯 核心新增：定義略過動畫的全域函式
window.scrollToContent = function() {
    // 1. 瞬間將 GSAP 主時間軸快轉到 100%（完成狀態）
    tl.progress(1);
    
    // 2. 平滑滾動到下方的情緒留言板區塊
    document.getElementById('main-content').scrollIntoView({ behavior: 'smooth' });
    
    // 3. 滾動完成後，順手將「Skip 略過按鈕」淡出隱藏，維持畫面乾淨
    gsap.to(".skip-anim-btn", { opacity: 0, pointerEvents: "none", duration: 0.5 });
};
