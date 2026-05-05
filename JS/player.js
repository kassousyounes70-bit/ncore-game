const colors = { 1: '#000000', 2: '#FFE082', 3: '#FFFFFF', 4: '#D32F2F', 5: '#1976D2', 6: '#5D4037' };

const playerFrame1 = [
    [0,0,0,1,1,1,1,1,0,0,0],
    [0,0,1,4,4,4,4,4,1,1,0],
    [0,0,1,2,2,2,2,2,2,1,0],
    [0,1,2,1,2,2,1,2,2,1,0],
    [0,1,2,2,2,2,2,2,2,1,0],
    [0,0,1,4,4,4,4,4,1,0,0],
    [0,1,3,1,5,5,5,1,3,1,0],
    [1,3,3,1,5,5,5,1,3,3,1],
    [0,1,1,5,5,5,5,5,1,1,0],
    [0,0,1,5,1,1,1,5,1,0,0],
    [0,1,6,6,1,0,1,6,6,1,0]
];
const playerFrame2 = [
    [0,0,0,0,0,0,0,0,0,0,0],
    [0,0,0,1,1,1,1,1,0,0,0],
    [0,0,1,4,4,4,4,4,1,1,0],
    [0,0,1,2,2,2,2,2,2,1,0],
    [0,1,2,1,2,2,1,2,2,1,0],
    [0,1,2,2,2,2,2,2,2,1,0],
    [0,0,1,4,4,4,4,4,1,0,0],
    [1,3,1,1,5,5,5,1,1,3,1],
    [1,3,3,1,5,5,5,1,3,3,1],
    [0,1,1,5,5,5,5,5,1,1,0],
    [0,1,6,6,1,1,6,6,1,0,0]
];

const player = {
    x: 2500, // نقطة البداية
    y: 2500,
    vx: 0, vy: 0,
    speed: 8,
    facingRight: false,
    isMoving: false,
    frameTick: 0,
    currentFrame: playerFrame1
};

// نظام عصا التحكم (Joystick)
let joyActive = false, joyBaseX = 0, joyBaseY = 0;
const joyMaxDist = 50;
const joyZone = document.getElementById('joystick-zone');
const joyStick = document.getElementById('joystick-stick');

joyZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    joyActive = true;
    const touch = e.changedTouches[0];
    const rect = joyZone.getBoundingClientRect();
    joyBaseX = rect.left + rect.width / 2;
    joyBaseY = rect.top + rect.height / 2;
    updateJoystick(touch.clientX, touch.clientY);
});

joyZone.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!joyActive) return;
    updateJoystick(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
});

function endJoystick(e) {
    e.preventDefault();
    joyActive = false;
    player.vx = 0; player.vy = 0;
    joyStick.style.transform = 'translate(0px,0px)';
}

joyZone.addEventListener('touchend', endJoystick);
joyZone.addEventListener('touchcancel', endJoystick);

function updateJoystick(cx, cy) {
    let dx = cx - joyBaseX, dy = cy - joyBaseY;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > joyMaxDist) {
        dx = (dx / dist) * joyMaxDist;
        dy = (dy / dist) * joyMaxDist;
        dist = joyMaxDist;
    }
    joyStick.style.transform = `translate(${dx}px,${dy}px)`;
    const nspeed = (dist / joyMaxDist) * player.speed;
    player.vx = (dx / dist) * nspeed;
    player.vy = (dy / dist) * nspeed;
}

function checkCollision(x, y) {
    const pW = player.currentFrame[0].length * PIXEL_SIZE;
    const pH = player.currentFrame.length * PIXEL_SIZE;
    const playerRect = { x, y, w: pW, h: pH };
    for (let c of colliders) {
        if (rectCollides(playerRect, c)) return true;
    }
    return false;
}

function updatePlayerLogic() {
    let oldX = player.x, oldY = player.y;
    let oldMoving = player.isMoving, oldFacing = player.facingRight;

    player.isMoving = (Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1);
    if (player.isMoving) {
        let newX = player.x + player.vx;
        let newY = player.y + player.vy;

        if (player.vx > 0) player.facingRight = true;
        if (player.vx < 0) player.facingRight = false;

        if (!checkCollision(newX, player.y)) player.x = newX;
        if (!checkCollision(player.x, newY)) player.y = newY;

        player.frameTick++;
        if (player.frameTick > 6) {
            player.currentFrame = (player.currentFrame === playerFrame1) ? playerFrame2 : playerFrame1;
            player.frameTick = 0;
        }
    } else {
        player.currentFrame = playerFrame1;
        player.frameTick = 0;
    }

    // تحديث الكاميرا لتتبع اللاعب
    const targetCamX = player.x - canvasWidth / 2;
    const targetCamY = player.y - canvasHeight / 2;
    camera.x += (targetCamX - camera.x) * 0.1;
    camera.y += (targetCamY - camera.y) * 0.1;
    camera.x = Math.max(0, Math.min(WORLD_WIDTH - canvasWidth, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_HEIGHT - canvasHeight, camera.y));

    // تحديث موقع اللاعب في الواجهة إذا دخل قطاع الآركيد (كمثال)
    const uiLocation = document.getElementById('location-text');
    if(player.x < 4000 && player.y < 3000) {
        uiLocation.innerText = "الموقع: قطاع الآركيد الكلاسيكي";
    } else {
        uiLocation.innerText = "الموقع: قيد التطوير...";
    }

    return { oldX, oldY, oldMoving, oldFacing };
}

function _drawCharacterMatrix(matrix, colorPalette, startX, startY, scale) {
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            const colorCode = matrix[row][col];
            if (colorCode !== 0) {
                ctx.fillStyle = colorPalette[colorCode];
                ctx.fillRect(startX + (col * scale), startY + (row * scale), scale, scale);
            }
        }
    }
}

function drawPlayer(p, isLocal) {
    let frame = playerFrame1;
    if (p.isMoving && Math.floor(Date.now() / 150) % 2 === 0) frame = playerFrame2;
    if (isLocal) frame = player.currentFrame;

    const pWidth = frame[0].length * PIXEL_SIZE;
    ctx.save();
    if (!p.facingRight) {
        ctx.translate((p.x - camera.x) + pWidth, p.y - camera.y);
        ctx.scale(-1, 1);
        _drawCharacterMatrix(frame, colors, 0, 0, PIXEL_SIZE);
    } else {
        _drawCharacterMatrix(frame, colors, p.x - camera.x, p.y - camera.y, PIXEL_SIZE);
    }
    ctx.restore();
}
