const canvas = document.getElementById('worldCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let canvasWidth = window.innerWidth;
let canvasHeight = window.innerHeight;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
}
window.addEventListener('resize', resize);
resize();

// توسيع العالم ليتسع لـ 5 قطاعات
const WORLD_WIDTH = 15000;
const WORLD_HEIGHT = 10000;
const PIXEL_SIZE = 5;

// إحداثيات الكاميرا
const camera = { x: 0, y: 0 };

// مصفوفة التصادمات (الجدران والأجهزة)
const colliders = [];

function addCollider(x, y, w, h) {
    colliders.push({ x, y, w, h });
}

function rectCollides(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// حدود العالم الأساسية
addCollider(0, 0, 1, WORLD_HEIGHT); // يسار
addCollider(0, 0, WORLD_WIDTH, 1); // أعلى
addCollider(0, WORLD_HEIGHT, WORLD_WIDTH, 1); // أسفل
addCollider(WORLD_WIDTH, 0, 1, WORLD_HEIGHT); // يمين

function drawWorldBackground() {
    ctx.fillStyle = '#0b0c10';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // رسم الشبكة الأرضية فقط في نطاق الكاميرا لتوفير الموارد
    const startCol = Math.floor(camera.x / 60);
    const endCol = startCol + (canvasWidth / 60) + 1;
    const startRow = Math.floor(camera.y / 60);
    const endRow = startRow + (canvasHeight / 60) + 1;

    for (let i = startCol; i < endCol; i++) {
        for (let j = startRow; j < endRow; j++) {
            ctx.fillStyle = ((i + j) % 2 === 0) ? '#1f1b2e' : '#161324';
            ctx.fillRect((i * 60) - camera.x, (j * 60) - camera.y, 60, 60);
        }
    }
}
