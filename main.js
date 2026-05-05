// روابط الخادم المركزي
const HTTP_SERVER_URL = "https://ncore-mmo-server.onrender.com"; // رابط سيرفر Render الخاص بك
const WS_SERVER_URL = "wss://ncore-mmo-server.onrender.com";

let gameRoom = null;
let otherPlayers = {};

function gameLoop() {
    // 1. تحديث منطق اللعبة
    const states = updatePlayerLogic();
    
    // 2. إرسال الإحداثيات للخادم إذا تحرك اللاعب
    if (gameRoom && (player.x !== states.oldX || player.y !== states.oldY || player.isMoving !== states.oldMoving || player.facingRight !== states.oldFacing)) {
        gameRoom.send("move", { 
            x: player.x, 
            y: player.y, 
            facingRight: player.facingRight, 
            isMoving: player.isMoving 
        });
    }

    // 3. الرسم على Canvas
    drawWorldBackground();
    drawStations();
    
    // رسم اللاعبين الآخرين
    Object.values(otherPlayers).forEach(p => {
        drawPlayer(p, false);
    });
    
    // رسم اللاعب المحلي (فوق البقية)
    drawPlayer(player, true);

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
