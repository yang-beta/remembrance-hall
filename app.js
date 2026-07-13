// --- 核心邏輯與資料庫處理 ---
let currentTarget = 'relative';

// 🌟 請在此處填入你新專案的真實金鑰 (確保結尾沒有斜線與多餘路徑)
const SUPABASE_URL = "https://cwlxcsdqoigkutbeemvf.supabase.co"; 
const SUPABASE_ANON_KEY = "sb_publishable_L52BGOl7tE2hBgLnqxnGoA_u6RQ3yrd";

// 初始化 Supabase
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 語句模板庫
const templates = {
    relative: [
        "「致 ${name}：記憶中那份 ${memory}，如同深夜裡不熄的暖光，溫柔指引著我前行的道路。縱使光陰流逝，這份思念從不曾褪色。」",
        "「親愛的 ${name}：謝謝你留給我的 ${memory}。每當在日常裡悄然泛起這份溫暖，我便知道，你一直不曾真正離去。」"
    ],
    friend: [
        "「致 ${name}：那段伴隨着 ${memory} 的歲月，是我生命中最澄澈的章節。謝謝你出現在我的青春裡，溫暖了漫長時光。」",
        "「給老友 ${name}：每當想起 ${memory}，風裡彷彿就有我們曾並肩笑過的聲音。即使長路漫漫，這份情誼依然在歲月裡刻骨銘心。」"
    ],
    pet: [
        "「致 ${name}：耳畔彷彿還能聽見 ${memory} 的動靜。謝謝你用短短的一生，毫無保留地教會了我什麼是最純粹的守護與愛。」",
        "「小天使 ${name}：你留下的 ${memory} 溫暖了整個家。現在的你，一定也在彩虹橋的另一端，無憂無慮地奔跑著吧。」"
    ]
};

// 頁面加載完成自動執行
document.addEventListener('DOMContentLoaded', () => {
    fetchWallMessages();
    initDragScroll(); // 啟用滑鼠拖曳滑動功能
    
    const today = new Date();
    document.getElementById('card-date-display').innerText = today.toLocaleDateString('zh-TW').replace(/\//g, '.');
});

// 選擇對象切換
function setTarget(target, element) {
    currentTarget = target;
    document.querySelectorAll('.target-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
}

// 生成卡片主邏輯
async function generateRemembrance() {
    const nickname = document.getElementById('nickname').value.trim();
    const memory = document.getElementById('memory').value.trim();

    if (!nickname || !memory) {
        alert('請填入稱呼與記憶細節，讓思念具體落地。');
        return;
    }

    const groupTemplates = templates[currentTarget];
    const randomTemplate = groupTemplates[Math.floor(Math.random() * groupTemplates.length)];
    const finalQuote = randomTemplate
        .replace('${name}', nickname)
        .replace('${memory}', memory);

    let targetChinese = currentTarget === 'relative' ? '親人' : currentTarget === 'friend' ? '朋友' : '寵物';
    let iconClass = currentTarget === 'relative' ? 'fa-hands-holding-child' : currentTarget === 'friend' ? 'fa-user-group' : 'fa-paw';

    document.getElementById('card-tag-display').innerText = `思念致意錄 / ${targetChinese}`;
    document.getElementById('card-icon-display').innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    document.getElementById('card-text-display').innerText = finalQuote;
    document.getElementById('card-sign-display').innerText = `— 致 ${nickname}`;
    
    const today = new Date();
    document.getElementById('card-date-display').innerText = today.toLocaleDateString('zh-TW').replace(/\//g, '.');

    document.getElementById('output-section').style.display = 'flex';

    if (supabaseClient) {
        await saveToSupabase(targetChinese, finalQuote, nickname);
    }
}

// 資料庫寫入
async function saveToSupabase(category, quote, nickname) {
    try {
        const fullText = `[${category}] ${quote} (${nickname})`;
        const { error } = await supabaseClient
            .from('remembrance-db')
            .insert([{ text: fullText }]);

        if (error) throw error;
        fetchWallMessages(); 
    } catch (err) {
        console.error('儲存留言失敗:', err);
    }
}

// 資料庫抓取最新 12 筆
async function fetchWallMessages() {
    if (!supabaseClient) return;

    try {
        const { data: list, error } = await supabaseClient
            .from('remembrance-db')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(12);

        if (error) throw error;

        const wallGrid = document.getElementById('wall-grid');
        if (list.length === 0) {
            wallGrid.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px; width: 100%;">牆上目前空無一物，留下第一份思念吧。</div>`;
            return;
        }

        wallGrid.innerHTML = '';
        list.forEach(item => {
            const match = item.text.match(/^\[(.*?)\] (.*?) \((.*?)\)$/);
            let category = '留白處';
            let quote = item.text;
            let nickname = '思念者';

            if (match) {
                category = match[1];
                quote = match[2];
                nickname = match[3];
            }

            const dateStr = new Date(item.created_at).toLocaleDateString('zh-TW').replace(/\//g, '.');

            wallGrid.innerHTML += `
                <div class="wall-card">
                    <div class="wall-card-header">
                        <span>思念致意錄 / ${category}</span>
                        <span style="color: var(--text-muted);">${dateStr}</span>
                    </div>
                    <div class="wall-card-body">
                        ${quote}
                    </div>
                    <div class="wall-card-footer">
                        — 致 ${nickname}
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error('讀取留言牆失敗:', err);
    }
}

// 箭頭滑動
function slideWall(direction) {
    const container = document.getElementById('slider-container');
    const scrollAmount = 304; 
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
}

// 滑鼠拖曳滑動
function initDragScroll() {
    const slider = document.getElementById('slider-container');
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - slider.offsetLeft;
        scrollLeft = slider.scrollLeft;
    });
    slider.addEventListener('mouseleave', () => {
        isDown = false;
    });
    slider.addEventListener('mouseup', () => {
        isDown = false;
    });
    slider.addEventListener('mousemove', (e) => {
        if(!isDown) return;
        e.preventDefault();
        const x = e.pageX - slider.offsetLeft;
        const walk = (x - startX) * 1.5; 
        slider.scrollLeft = scrollLeft - walk;
    });
}

// 卡片匯出下載
function downloadCard() {
    const cardNode = document.getElementById('printable-card');
    html2canvas(cardNode, {
        scale: 3, 
        backgroundColor: null,
        useCORS: true
    }).then(canvas => {
        const link = document.createElement('a');
        link.download = `思念致意卡-${document.getElementById('nickname').value}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        console.error('卡片生成失敗:', err);
        alert('卡片導出失敗，請再試一次。');
    });
}
