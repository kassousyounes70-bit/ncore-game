// مصفوفة محطات اللعب
const gameStations = [];

// تحميل صور أجهزة الآركيد الستة المفرغة (PNG)
const arcadeImages = {};
const totalArcadeTypes = 6;

for (let i = 1; i <= totalArcadeTypes; i++) {
    const img = new Image();
    img.src = `assets/Arcade_0${i}.png`; 
    arcadeImages[i] = img;
}

// أبعاد جهاز الآركيد
const ARCADE_WIDTH = 80;
const ARCADE_HEIGHT = 125;

// إنشاء قطاع صالة الألعاب (30 جهاز)
function buildArcadeSector() {
    const startX = 500;
    const startY = 500;
    const rows = 5;
    const cols = 6; 
    const spacingX = 200; 
    const spacingY = 300; 

    for(let r = 0; r < rows; r++) {
        for(let c = 0; c < cols; c++) {
            let flip = (r % 2 !== 0);
            let yOffset = flip ? -50 : 0; 
            
            let ax = startX + (c * spacingX);
            let ay = startY + (r * spacingY) + yOffset;
            
            // اختيار نوع عشوائي من 1 إلى 6 لكل جهاز
            let randomType = Math.floor(Math.random() * totalArcadeTypes) + 1;

            gameStations.push({ 
                x: ax, 
                y: ay, 
                type: 'arcade', 
                arcadeId: randomType, 
                flip: flip, 
                w: ARCADE_WIDTH, 
                h: ARCADE_HEIGHT,
                // قيم افتراضية للشاشة قابلة للتعديل من أداة المعايرة
                screenOffsetX: 15,
                screenOffsetY: 20,
                screenW: 50,
                screenH: 40
            });
            
            addCollider(ax, ay, ARCADE_WIDTH, ARCADE_HEIGHT);
        }
    }
}
buildArcadeSector();

// دالة محاكاة حركة تفصيلية لباك-مان (خلف الشاشة الشفافة)
function drawAnimatedScreen(x, y, width, height) {
    const time = Date.now() / 1000; 
    
    // خلفية الشاشة 
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, width, height);

    // رسم متاهة مصغرة 
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
        
        // Culling: عدم رسم الأجهزة خارج نطاق الرؤية لتوفير الأداء
        if (sx < -station.w || sx > canvasWidth + 50 || sy < -station.h || sy > canvasHeight + 50) return;

        if (station.type === 'arcade') {
            // قراءة قيم المعايرة التي يتم تعديلها من شرائط التمرير في وضع المطور
            let sOx = station.screenOffsetX ?? 15;
            let sOy = station.screenOffsetY ?? 20;
            let sW = station.screenW ?? 50;
            let sH = station.screenH ?? 40;
            
            // 1. رسم الرسوم المتحركة (باك-مان) *أولاً* في الخلف بالإحداثيات المخصصة
            drawAnimatedScreen(sx + sOx, sy + sOy, sW, sH);

            // 2. رسم صورة الجهاز (PNG الشفاف) *ثانياً* فوقها
            const img = arcadeImages[station.arcadeId];
            if (img && img.complete && img.naturalWidth !== 0) {
                ctx.drawImage(img, sx, sy, station.w, station.h);
            } else {
                ctx.fillStyle = 'rgba(80, 80, 80, 0.5)';
                ctx.fillRect(sx, sy, station.w, station.h);
            }
        }
    });
}
