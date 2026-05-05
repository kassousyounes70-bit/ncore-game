// روابط الخادم المركزي
const HTTP_SERVER_URL = "https://ncore-mmo-server.onrender.com"; 
const WS_SERVER_URL = "wss://ncore-mmo-server.onrender.com";

let gameRoom = null;
let otherPlayers = {};

// --- نظام وضع المطور (Dev Mode) ---
let devMode = false;
let selectedStation = null;
let carriedStation = null;

// بناء واجهة المعايرة ونافذة التصدير ديناميكياً
function setupDevToolsUI() {
    if (!document.getElementById('calib-ui')) {
        const ui = document.createElement('div');
        ui.id = 'calib-ui';
        ui.style.cssText = 'position:absolute; top:80px; left:20px; background:rgba(11, 12, 16, 0.9); color:#66fcf1; padding:15px; border:2px solid #66fcf1; border-radius:10px; display:none; z-index:1000; direction:ltr; font-family:monospace; box-shadow: 0 0 15px #66fcf1;';
        ui.innerHTML = `
            <h3 style="margin-top:0; text-align:center; color:#fff;">Arcade Calibrator</h3>
            <label>X Offset: <input type="range" id="calib-x" min="-50" max="150" value="15"></label> <span id="val-x">15</span><br>
            <label>Y Offset: <input type="range" id="calib-y" min="-50" max="150" value="20"></label> <span id="val-y">20</span><br>
            <label>Width: &nbsp;&nbsp;<input type="range" id="calib-w" min="10" max="150" value="50"></label> <span id="val-w">50</span><br>
            <label>Height: &nbsp;<input type="range" id="calib-h" min="10" max="150" value="40"></label> <span id="val-h">40</span><br>
            <div style="margin-top:15px; display:flex; gap:10px; justify-content:center;">
                <button id="carry-btn" style="background:#00B0FF; color:#fff; border:none; padding:8px 12px; cursor:pointer; font-weight:bold; border-radius:5px;" onclick="toggleCarry()">حمل الجهاز</button>
                <button style="background:#F44336; color:#fff; border:none; padding:8px 12px; cursor:pointer; font-weight:bold; border-radius:5px;" onclick="closeCalibration()">إغلاق</button>
            </div>
        `;
        document.body.appendChild(ui);

        ['x', 'y', 'w', 'h'].forEach(param => {
            const slider = document.getElementById(`calib-${param}`);
            const valDisplay = document.getElementById(`val-${param}`);
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                valDisplay.innerText = val;
                if (!selectedStation) return;
                if (param === 'x') selectedStation.screenOffsetX = val;
                if (param === 'y') selectedStation.screenOffsetY = val;
                if (param === 'w') selectedStation.screenW = val;
                if (param === 'h') selectedStation.screenH = val;
            });
        });
    }

    if (!document.getElementById('export-modal')) {
        const modal = document.createElement('div');
        modal.id = 'export-modal';
        modal.style.cssText = 'position:fixed; top:50%; left:50%; transform:translate(-50%, -50%); background:#0b0c10; border:2px solid #66fcf1; padding:20px; z-index:20000; color:#fff; width:85%; max-width:600px; max-height:80%; overflow-y:auto; display:none; border-radius:10px; box-shadow: 0 0 30px #66fcf1; text-align:right;';
        modal.innerHTML = `
            <h2 style="color:#66fcf1; margin-top:0;">كود الإحداثيات والمعايرة</h2>
            <p style="font-size:12px; color:#c5c6c7;">انسخ هذا الكود واستبدله في ملف arcade.js:</p>
            <textarea id="export-text" style="width:100%; height:200px; background:#000; color:#0f0; direction:ltr; font-family:monospace; padding:10px; box-sizing:border-box; border:1px solid #444;"></textarea>
            <div style="margin-top:15px; display:flex; gap:10px; justify-content:center;">
                <button style="background:#4CAF50; color:#fff; border:none; padding:10px 20px; cursor:pointer; font-weight:bold; border-radius:5px; font-size:16px;" onclick="copyExport()">نسخ الكود</button>
                <button style="background:#F44336; color:#fff; border:none; padding:10px 20px; cursor:pointer; font-weight:bold; border-radius:5px; font-size:16px;" onclick="document.getElementById('export-modal').style.display='none'">إغلاق</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

window.copyExport = function() {
    const text = document.getElementById('export-text');
    text.select();
    document.execCommand('copy');
    alert('تم النسخ بنجاح!');
};

window.toggleDevMode = function() {
    devMode = !devMode;
    const btn = document.getElementById('dev-mode-btn');
    const exportBtn = document.getElementById('export-btn');
    
    setupDevToolsUI();

    if (devMode) {
        if (btn) { btn.innerText = "إغلاق وضع المطور"; btn.style.backgroundColor = "#F44336"; }
        if (exportBtn) exportBtn.style.display = "block";
    } else {
        if (btn) { btn.innerText = "تفعيل وضع المطور"; btn.style.backgroundColor = "#0b0c10"; }
        if (exportBtn) exportBtn.style.display = "none";
        closeCalibration();
        if (carriedStation) toggleCarry();
    }
};

window.toggleCarry = function() {
    const btn = document.getElementById('carry-btn');
    if (!carriedStation && selectedStation) {
        carriedStation = selectedStation;
        if(btn) btn.innerText = "إفلات وتثبيت الجهاز";
    } else if (carriedStation) {
        carriedStation = null;
        if(btn) btn.innerText = "حمل الجهاز";
        rebuildColliders(); // تحديث التصادم بعد وضع الجهاز
    }
};

function openCalibration(station) {
    const ui = document.getElementById('calib-ui');
    if (!ui) return;
    ui.style.display = 'block';
    
    // جلب القيم الحالية أو وضع قيم افتراضية مبدئية
    const sx = station.screenOffsetX ?? 15;
    const sy = station.screenOffsetY ?? 20;
    const sw = station.screenW ?? 50;
    const sh = station.screenH ?? 40;

    document.getElementById('calib-x').value = sx; document.getElementById('val-x').innerText = sx;
    document.getElementById('calib-y').value = sy; document.getElementById('val-y').innerText = sy;
    document.getElementById('calib-w').value = sw; document.getElementById('val-w').innerText = sw;
    document.getElementById('calib-h').value = sh; document.getElementById('val-h').innerText = sh;

    station.screenOffsetX = sx;
    station.screenOffsetY = sy;
    station.screenW = sw;
    station.screenH = sh;
}

window.closeCalibration = function() {
    const ui = document.getElementById('calib-ui');
    if (ui) ui.style.display = 'none';
    selectedStation = null;
};

window.exportLayout = function() {
    let output = "// قم باستبدال الدالة buildArcadeSector في ملف arcade.js بهذا الكود:\n";
    output += "function buildArcadeSector() {\n";
    output += "    gameStations.length = 0;\n";
    gameStations.forEach(s => {
        let sOx = s.screenOffsetX ?? 15;
        let sOy = s.screenOffsetY ?? 20;
        let sW = s.screenW ?? 50;
        let sH = s.screenH ?? 40;
        output += `    gameStations.push({ x: ${Math.round(s.x)}, y: ${Math.round(s.y)}, type: '${s.type}', arcadeId: ${s.arcadeId || 1}, flip: ${s.flip}, w: ${s.w}, h: ${s.h}, screenOffsetX: ${sOx}, screenOffsetY: ${sOy}, screenW: ${sW}, screenH: ${sH} });\n`;
        output += `    addCollider(${Math.round(s.x)}, ${Math.round(s.y)}, ${s.w}, ${s.h});\n`;
    });
    output += "}\nbuildArcadeSector();";
    
    const modal = document.getElementById('export-modal');
    const text = document.getElementById('export-text');
    if(modal && text) {
        text.value = output;
        modal.style.display = 'block';
    }
};

// التفاعل مع الأجهزة (نقر/لمس)
canvas.addEventListener('pointerdown', (e) => {
    if (!devMode) return;
    // منع التفاعل مع الكانفاس إذا نقرنا بالخطأ على واجهة الـ UI
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;

    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) + camera.x;
    const clickY = (e.clientY - rect.top) + camera.y;

    let found = false;
    for (let i = gameStations.length - 1; i >= 0; i--) {
        let s = gameStations[i];
        if (clickX >= s.x && clickX <= s.x + s.w && clickY >= s.y && clickY <= s.y + s.h) {
            selectedStation = s;
            openCalibration(s);
            found = true;
            break;
        }
    }
    
    if (!found && !carriedStation) {
        closeCalibration();
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
    
    // إذا كان اللاعب يحمل جهازاً، يتبع الجهاز الشخصية (فوق رأسها)
    if (carriedStation) {
        carriedStation.x = player.x - (carriedStation.w / 2) + 20; 
        carriedStation.y = player.y - carriedStation.h - 10;
    }

    if (gameRoom && (player.x !== states.oldX || player.y !== states.oldY || player.isMoving !== states.oldMoving || player.facingRight !== states.oldFacing)) {
        gameRoom.send("move", { 
            x: player.x, 
            y: player.y, 
            facingRight: player.facingRight, 
            isMoving: player.isMoving 
        });
    }

    drawWorldBackground();
    drawStations();
    
    Object.values(otherPlayers).forEach(p => { drawPlayer(p, false); });
    drawPlayer(player, true);
    
    // إحاطة الجهاز المختار بإطار أصفر لامع لتمييزه
    if (devMode && selectedStation) {
        ctx.save();
        ctx.strokeStyle = '#FFeb3b';
        ctx.lineWidth = 3;
        ctx.strokeRect(selectedStation.x - camera.x, selectedStation.y - camera.y, selectedStation.w, selectedStation.h);
        ctx.restore();
    }

    drawMiniMap();

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

// بدء دورة الحياة
connectToServer();
