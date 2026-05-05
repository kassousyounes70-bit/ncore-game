// ألوان جهاز الآركيد
const setupColors = {
    1: '#000000', 2: '#212121', 3: '#424242', 4: '#9E9E9E', 5: '#01579B', 6: '#00B0FF', 
    8: '#F44336', 10: '#5D4037', 12: '#E0E0E0', 13: '#00E676', 14: '#757575'
};

// هيكل بكسلات الآركيد العمودي الكلاسيكي (بدون كونسول سفلي)
const bigSetupSprite = [
    [0,0,0,1,1,1,1,1,1,1,1,1,1,0,0,0],
    [0,0,1,8,8,8,8,8,8,8,8,8,8,1,0,0], // الجزء العلوي المضيء (Marquee)
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0],
    [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0], // إطار الشاشة
    [0,0,1,2,5,5,5,5,5,5,5,5,2,1,0,0], // الشاشة (زرقاء)
    [0,0,1,2,5,5,6,6,6,6,5,5,2,1,0,0],
    [0,0,1,2,5,6,6,6,6,6,6,5,2,1,0,0],
    [0,0,1,2,5,6,6,6,6,6,6,5,2,1,0,0],
    [0,0,1,2,5,6,6,6,6,6,6,5,2,1,0,0],
    [0,0,1,2,5,5,6,6,6,6,5,5,2,1,0,0],
    [0,0,1,2,5,5,5,5,5,5,5,5,2,1,0,0], 
    [0,0,1,2,2,2,2,2,2,2,2,2,2,1,0,0], // إطار الشاشة السفلي
    [0,1,8,8,8,8,8,8,8,8,8,8,8,8,1,0], // ميلان لوحة التحكم
    [1,8,8,1,3,1,8,8,1,3,1,8,8,8,8,1], // أزرار وعصا التحكم
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], // حافة لوحة التحكم
    [0,0,1,8,8,8,8,8,8,8,8,8,8,1,0,0], // الهيكل السفلي
    [0,0,1,8,8,8,8,8,8,8,8,8,8,1,0,0],
    [0,0,1,8,8,1,1,8,1,1,8,8,8,1,0,0], // فتحات العملات (Coin Slots)
    [0,0,1,8,8,1,8,8,1,8,8,8,8,1,0,0],
    [0,0,1,8,8,1,1,8,1,1,8,8,8,1,0,0],
    [0,0,1,8,8,8,8,8,8,8,8,8,8,1,0,0], // بقية الهيكل
    [0,0,1,8,8,8,8,8,8,8,8,8,8,1,0,0],
    [0,0,1,8,8,8,8,8,8,8,8,8,8,1,0,0],
    [0,0,1,8,8,8,8,8,8,8,8,8,8,1,0,0],
    [0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0]  // القاعدة
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
    const cols = 6; 
    const spacingX = 200; // تقليص المسافة لأن الجهاز أصبح أنحف عمودياً
    const spacingY = 300; 

    for(let r = 0; r < rows; r++) {
        for(let c = 0; c < cols; c++) {
            let flip = (r % 2 !== 0);
            let yOffset = flip ? -50 : 0; 
            
            let ax = startX + (c * spacingX);
            let ay = startY + (r * spacingY) + yOffset;
            
            const scale = 5;
            // الأبعاد الجديدة: العرض 16 بكسل، الطول 25 بكسل
            const w = 16 * scale; 
            const h = 25 * scale; 

            gameStations.push({ x: ax, y: ay, type: 'arcade', flip: flip, scale: scale, w: w, h: h });
            addCollider(ax, ay, w, h);
        }
    }
}
buildArcadeSector();

// دالة محاكاة حركة تفصيلية لباك-مان (تم تصغيرها لتناسب الشاشة العمودية)
function drawAnimatedScreen(x, y, width, height) {
    const time = Date.now() / 1000; 
    
    // خلفية الشاشة (أسود)
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, width, height);

    // رسم متاهة مصغرة (إطار)
    ctx.strokeStyle = '#1919A6';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);
    ctx.beginPath();
    ctx.moveTo(x + width/2, y + 2); ctx.lineTo(x + width/2, y + height/2);
    ctx.stroke();

    // دورة الحركة 
    const cycle = time % 3; 
    let px = x + 8 + (cycle / 3) * (width - 16);
    let py = y + height - 8;

    let gx = px - 15;

    // رسم باك-مان
    ctx.fillStyle = '#FFFF00';
    ctx.beginPath();
    let mouthOpen = Math.abs(Math.sin(time * 15)) * 0.3;
    ctx.arc(px, py, 4, mouthOpen * Math.PI, (2 - mouthOpen) * Math.PI);
    ctx.lineTo(px, py);
    ctx.fill();

    // رسم الشبح 
    if (gx > x + 4) {
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(gx - 4, py - 4, 8, 8);
        ctx.fillStyle = '#FFF';
        ctx.fillRect(gx - 2, py - 2, 2, 2);
        ctx.fillRect(gx + 1, py - 2, 2, 2);
    }
    
    // حبيبات الأكل
    ctx.fillStyle = '#FFF';
    for(let i = px + 10; i < x + width - 4; i += 10) {
        ctx.fillRect(i, py - 1, 2, 2);
    }
}

// رسم جميع الأجهزة على الخريطة
function drawStations() {
    gameStations.forEach(station => {
        const sx = station.x - camera.x;
        const sy = station.y - camera.y;
        
        if (sx < -station.w || sx > canvasWidth + 50 || sy < -station.h || sy > canvasHeight + 50) return;

        if (station.type === 'arcade') {
            drawSprite(bigSetupSprite, setupColors, sx, sy, station.scale, true, station.flip);
            
            // تحديد إحداثيات الشاشة العمودية الجديدة
            let screenW = 8 * station.scale;
            let screenH = 7 * station.scale;
            // الشاشة تبدأ من العمود الرابع أفقياً والصف الرابع عمودياً
            let screenX = sx + (4 * station.scale);
            let screenY = sy + (4 * station.scale);
            
            // بما أن التصميم متماثل (Symmetrical)، الانعكاس لن يغير نقطة بداية الشاشة
            drawAnimatedScreen(screenX, screenY, screenW, screenH);
        }
    });
}
