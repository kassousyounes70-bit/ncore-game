// ألوان جهاز الآركيد
const setupColors = {
    1: '#000000', 2: '#212121', 3: '#424242', 4: '#9E9E9E', 5: '#01579B', 6: '#00B0FF', 
    8: '#F44336', 10: '#5D4037', 12: '#E0E0E0', 13: '#00E676', 14: '#757575'
};

// هيكل بكسلات الآركيد (الحجم الكبير)
const bigSetupSprite = [
    [0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0],
    [0,0,0,0,0,0,1,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,1,0,0,0,0,0,0],
    [0,0,0,0,0,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,0,0,0,0,0],
    [0,0,0,0,1,3,1,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,1,3,1,0,0,0,0],
    [0,0,0,1,3,1,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,1,3,1,0,0,0],
    [0,0,0,1,3,1,5,5,5,6,6,6,6,6,6,6,6,6,6,6,6,5,5,5,1,3,1,0,0,0],
    [0,0,0,1,3,1,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,1,3,1,0,0,0],
    [0,0,0,1,3,1,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,1,3,1,8,1,0],
    [0,0,0,1,3,1,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,1,3,1,2,1,0],
    [0,0,0,1,3,1,5,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,5,1,3,1,2,1,0],
    [0,0,0,1,3,1,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,5,1,3,1,1,0,0],
    [0,0,0,0,1,3,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,3,1,0,0,0,0],
    [0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,0,0,0,0,0],
    [0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,10,1],
    [1,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,2,2,2,2,2,2,1],
    [1,2,2,2,2,2,2,1,12,12,12,12,12,12,12,12,12,12,12,12,1,2,2,2,2,2,2,1],
    [1,2,2,2,2,2,2,1,12,13,12,12,12,12,12,12,12,12,12,12,1,1,1,2,2,2,2,1],
    [1,2,2,2,2,2,2,1,1,1,1,1,1,1,1,1,1,1,1,1,1,14,1,2,2,2,2,1],
    [1,10,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,1,10,1]
];

// دالة رسم الرسوميات بالبكسل مع إمكانية الانعكاس
function drawSprite(matrix, colorPalette, startX, startY, scale, screenFlicker = false, flip = false) {
    for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
            const colorCode = matrix[row][col];
            if (colorCode !== 0) {
                if (screenFlicker && colorCode === 6) {
                    ctx.globalAlpha = 0.85 + Math.random() * 0.15;
                    ctx.shadowColor = '#00B0FF';
                    ctx.shadowBlur = 10;
                } else {
                    ctx.globalAlpha = 1.0;
                    ctx.shadowBlur = 0;
                }
                ctx.fillStyle = colorPalette[colorCode];
                
                let drawX = startX + (col * scale);
                if (flip) drawX = startX + ((matrix[0].length - 1 - col) * scale);
                
                ctx.fillRect(drawX, startY + (row * scale), scale, scale);
                ctx.globalAlpha = 1.0;
                ctx.shadowBlur = 0;
            }
        }
    }
}

// مصفوفة محطات اللعب
const gameStations = [];

// إنشاء قطاع صالة الألعاب (30 جهاز - ترتيب كلاسيكي)
function buildArcadeSector() {
    const startX = 500;
    const startY = 500;
    const rows = 5;
    const cols = 6; // 5 * 6 = 30 جهاز
    const spacingX = 400; // المسافة الأفقية بين الأجهزة
    const spacingY = 300; // المسافة العمودية بين صفوف الأجهزة

    for(let r = 0; r < rows; r++) {
        for(let c = 0; c < cols; c++) {
            // ترتيب الظهر للظهر (Back-to-back) المميز لصالات التسعينات
            let flip = (r % 2 !== 0);
            let yOffset = flip ? -50 : 0; 
            
            let ax = startX + (c * spacingX);
            let ay = startY + (r * spacingY) + yOffset;
            
            const scale = 5;
            const w = 31 * scale; // عرض المصفوفة
            const h = 21 * scale; // طول المصفوفة

            gameStations.push({ x: ax, y: ay, type: 'arcade', flip: flip, scale: scale, w: w, h: h });
            addCollider(ax, ay, w, h);
        }
    }
}
buildArcadeSector();

// دالة محاكاة حركة تفصيلية لباك-مان داخل شاشة الآركيد (بدون استهلاك الموارد)
function drawAnimatedScreen(x, y, width, height) {
    const time = Date.now() / 1000; 
    
    // خلفية الشاشة (أسود)
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, width, height);

    // رسم متاهة مصغرة (إطار)
    ctx.strokeStyle = '#1919A6';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 5, y + 5, width - 10, height - 10);
    ctx.beginPath();
    ctx.moveTo(x + width/2 - 10, y + 5); ctx.lineTo(x + width/2 - 10, y + height/2);
    ctx.stroke();

    // دورة الحركة (3 ثواني للعبور)
    const cycle = time % 3; 
    let px = x + 10 + (cycle / 3) * (width - 20);
    let py = y + height - 15;

    // موقع الشبح يتبع باك مان
    let gx = px - 25;

    // رسم باك-مان يفتح ويغلق فمه
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    let mouthOpen = Math.abs(Math.sin(time * 15)) * 0.3;
    ctx.arc(px, py, 6, mouthOpen * Math.PI, (2 - mouthOpen) * Math.PI);
    ctx.lineTo(px, py);
    ctx.fill();

    // رسم الشبح 
    if (gx > x + 5) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(gx - 5, py - 5, 10, 10);
        // عيون الشبح
        ctx.fillStyle = '#FFF';
        ctx.fillRect(gx - 3, py - 2, 2, 2);
        ctx.fillRect(gx + 1, py - 2, 2, 2);
    }
    
    // حبيبات الأكل
    ctx.fillStyle = '#FFF';
    for(let i = px + 15; i < x + width - 10; i += 15) {
        ctx.fillRect(i, py - 1, 2, 2);
    }
}

// رسم جميع الأجهزة على الخريطة
function drawStations() {
    gameStations.forEach(station => {
        const sx = station.x - camera.x;
        const sy = station.y - camera.y;
        
        // Culling: عدم رسم الأجهزة خارج نطاق الرؤية لتوفير الأداء
        if (sx < -station.w || sx > canvasWidth + 50 || sy < -station.h || sy > canvasHeight + 50) return;

        if (station.type === 'arcade') {
            drawSprite(bigSetupSprite, setupColors, sx, sy, station.scale, true, station.flip);
            
            // تحديد إحداثيات الشاشة بناءً على حجم المصفوفة
            let screenW = 14 * station.scale;
            let screenH = 6 * station.scale;
            let screenX = sx + (8 * station.scale);
            let screenY = sy + (4 * station.scale);
            
            if (station.flip) {
                screenX = sx + station.w - (8 * station.scale) - screenW;
            }

            drawAnimatedScreen(screenX, screenY, screenW, screenH);
        }
    });
}
