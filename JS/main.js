// روابط الخادم المركزي
const HTTP_SERVER_URL = "https://ncore-mmo-server.onrender.com"; 
const WS_SERVER_URL = "wss://ncore-mmo-server.onrender.com";

let gameRoom = null;
let otherPlayers = {};

// --- نظام وضع المطور (Dev Mode) ---
let devMode = false;
let selectedStation = null;
let devScale = 1;

window.toggleDevMode = function() {
    devMode = !devMode;
    const btn = document.getElementById('dev-mode-btn');
    const exportBtn = document.getElementById('export-btn');
    
    if (devMode) {
        if (btn) btn.innerText = "إغلاق وضع المطور";
        if (btn) btn.style.backgroundColor = "#F44336";
        if (exportBtn) exportBtn.style.display = "block";
        
        // حساب نسبة التصغير لاحتواء العالم بأكمله داخل شاشة الهاتف
        const scaleX = canvasWidth / WORLD_WIDTH;
        const scaleY = canvasHeight / WORLD_HEIGHT;
        devScale = Math.min(scaleX, scaleY); 
    } else {
        if (btn) btn.innerText = "تفعيل وضع المطور";
        if (btn) btn.style.backgroundColor = "#0b0c10";
        if (exportBtn) exportBtn.style.display = "none";
        devScale = 1;
    }
};

window.exportLayout = function() {
    let output = "// قم باستبدال الدالة buildArcadeSector في ملف arcade.js بهذا الكود:\n";
    output += "function buildArcadeSector() {\n";
    output += "    gameStations.length = 0;\n";
    gameStations.forEach(s => {
        output += `    gameStations.push({ x: ${Math.round(s.x)}, y: ${Math.round(s.y)}, type: '${s.type}', flip: ${s.flip}, scale: ${s.scale}, w: ${s.w}, h: ${s.h} });\n`;
        output += `    addCollider(${Math.round(s.x)}, ${Math.round(s.y)}, ${s.w}, ${s.h});\n`;
    });
    output += "}\nbuildArcadeSector();";
    
    // طباعة الكود وتنبيه المستخدم
    console.log(output);
    alert("تم تصدير الإحداثيات بنجاح! سيتم إضافة نافذة لنسخها في ملف HTML قريباً.");
};

// التحكم عبر اللمس المخصص للهواتف في وضع المطور
canvas.addEventListener('touchstart', (e) => {
    if (!devMode) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    
    // تحويل إحداثيات اللمس بناءً على نسبة التصغير (Zoom)
    const touchX = (touch.clientX - rect.left) / devScale;
    const touchY = (touch.clientY - rect.top) / devScale;

    for (let i = gameStations.length - 1; i >= 0; i--) {
        let s = gameStations[i];
        if (touchX >= s.x && touchX <= s.x + s.w && touchY >= s.y && touchY <= s.y + s.h) {
            selectedStation = s;
            break;
        }
    }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    if (!devMode || !selectedStation) return;
    e.preventDefault(); // منع تمرير الشاشة
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    
    const moveX = (touch.clientX - rect.left) / devScale;
    const moveY = (touch.clientY - rect.top) / devScale;

    selectedStation.x = moveX - (selectedStation.w / 2);
    selectedStation.y = moveY - (selectedStation.h / 2);
}, { passive: false });

canvas.addEventListener('touchend', () => {
    if (selectedStation) {
        rebuildColliders(); 
        selectedStation = null;
    }
});

function rebuildColliders() {
    colliders.length = 0;
    addCollider(0, 0, 1, WORLD_HEIGHT); 
    addCollider(0, 0, WORLD_WIDTH, 1); 
    addCollider(0, WORLD_HEIGHT, WORLD_WIDTH, 1); 
    addCollider(WORLD_WIDTH, 0, 1, WORLD_HEIGHT);
    gameStations.forEach(s => { addCollider(s.x, s.y, s.w, s.h); });
}

function drawMiniMap() {
    if(devMode) return; // إخفاء الخريطة المصغرة أثناء التصغير الكامل
    const mapW = 150; 
    const mapH = Math.round(mapW * (WORLD_HEIGHT / WORLD_WIDTH)); 
    const padX = 20; 
    const padY = 20; 
    
    const scaleX = mapW / WORLD_WIDTH;
    const scaleY = mapH / WORLD_HEIGHT;

    ctx.save();
    ctx.fillStyle = 'rgba(11, 12, 16, 0.8)';
    ctx.fillRect(padX, padY, mapW, mapH);
    ctx.strokeStyle = '#66fcf1';
    ctx.lineWidth = 2;
    ctx.strokeRect(padX, padY, mapW, mapH);

    ctx.fillStyle = 'rgba(0, 176, 255, 0.2)'; 
    ctx.fillRect(padX + (500 * scaleX), padY + (500 * scaleY), 2500 * scaleX, 1500 * scaleY);

    ctx.fillStyle = '#00B0FF';
    gameStations.forEach(s => {
        ctx.fillRect(padX + s.x * scaleX, padY + s.y * scaleY, 2, 2);
    });

    ctx.fillStyle = '#FFFFFF';
    Object.values(otherPlayers).forEach(p => {
        ctx.beginPath();
        ctx.arc(padX + p.x * scaleX, padY + p.y * scaleY, 1.5, 0, 2 * Math.PI);
        ctx.fill();
    });

    ctx.fillStyle = (Math.floor(Date.now() / 200) % 2 === 0) ? '#FF0000' : '#FF5252';
    ctx.beginPath();
    ctx.arc(padX + player.x * scaleX, padY + player.y * scaleY, 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
}

function gameLoop() {
    const states = updatePlayerLogic();
    
    if (gameRoom && (player.x !== states.oldX || player.y !== states.oldY || player.isMoving !== states.oldMoving || player.facingRight !== states.oldFacing)) {
        gameRoom.send("move", { 
            x: player.x, 
            y: player.y, 
            facingRight: player.facingRight, 
            isMoving: player.isMoving 
        });
    }

    if (devMode) {
        ctx.save();
        ctx.scale(devScale, devScale);
        
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        
        ctx.strokeStyle = '#66fcf1';
        ctx.lineWidth = 10;
        ctx.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        gameStations.forEach(station => {
            ctx.fillStyle = selectedStation === station ? '#FFFFFF' : '#00B0FF';
            ctx.fillRect(station.x, station.y, station.w, station.h);
        });
        
        ctx.restore();
    } else {
        drawWorldBackground();
        drawStations();
        Object.values(otherPlayers).forEach(p => { drawPlayer(p, false); });
        drawPlayer(player, true);
        drawMiniMap();
    }

    requestAnimationFrame(gameLoop);
}

async function connectToServer() {
    const loadingText = document.getElementById('loading-text');
    const loadingTitle = document.getElementById('loading-title');
    let retries = 5;
    
    while (retries > 0) {
        try {
            loadingText.innerText = `جاري إيقاظ الخادم المركزي... (محاولة ${6 - retries} من 5)`;
            const res = await fetch(HTTP_SERVER_URL + "/wakeup");
            if (!res.ok) throw new Error("استجابة غير صالحة: " + res.status);
            
            loadingText.innerText = "تم الاتصال! جاري مزامنة بيانات العالم...";
            const ColyseusClient = Colyseus.Client || (Colyseus.default && Colyseus.default.Client);
            const client = new ColyseusClient(WS_SERVER_URL);
            
            gameRoom = await client.joinOrCreate("world");
            
            gameRoom.onStateChange((state) => {
                const updatedPlayers = {};
                state.players.forEach((p, sid) => {
                    if (sid !== gameRoom.sessionId) {
                        updatedPlayers[sid] = {
                            x: p.x ?? 2500,
                            y: p.y ?? 2500,
                            facingRight: p.facingRight || false,
                            isMoving: p.isMoving || false
                        };
                    }
                });
                otherPlayers = updatedPlayers;
            });
            
            document.getElementById('loading-screen').style.display = 'none';
            gameLoop();
            return;
        } catch (error) {
            retries--;
            if (retries === 0) {
                loadingTitle.innerText = "فشل الاتصال بالخادم!";
                loadingText.innerText = `تفاصيل الخطأ: ${error.message}`;
                document.querySelector('.spinner').style.display = 'none';
            } else {
                loadingText.innerText = `الخادم لا يزال في وضع الاستعداد... سيتم إعادة المحاولة.`;
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }
}

connectToServer();
