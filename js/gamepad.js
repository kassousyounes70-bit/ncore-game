'use strict';
/**
 * نظام لوحة التحكم الذكية (Smart Gamepad UI)
 * تم دعمه الآن بعصا تحكم تناظرية (Joystick) يمكن برمجتها للأسهم أو WASD.
 */
const GamepadUI = (() => {
  let zone, editBtn, saveBtn, resetBtn;
  let isEditMode = false;
  let activeGameId = null;
  
  // عناصر عصا التحكم الجديدة الخاصة باللعب
  let joyBase, joyThumb;
  let isJoyActive = false;
  let joyConfigKeys = { up: '', down: '', left: '', right: '' };
  let currentJoyPressed = { up: false, down: false, left: false, right: false };
  
  // متغيرات السحب (Drag)
  let dragTarget = null;
  let startX, startY, initialLeft, initialTop;
  let pressedKeys = new Set();

  function init() {
    zone = Utils.$('gamepad-zone');
    editBtn = Utils.$('edit-layout-btn');
    saveBtn = Utils.$('save-layout-btn');
    resetBtn = Utils.$('reset-layout-btn');
    
    // العناصر الخاصة بعصا اللعب التناظرية (سيتم إضافتها في HTML الجولة القادمة)
    joyBase = Utils.$('gamepad-joystick-base');
    joyThumb = Utils.$('gamepad-joystick-thumb');

    if (!zone) return;

    editBtn.addEventListener('click', toggleEditMode);
    saveBtn.addEventListener('click', saveLayout);
    resetBtn.addEventListener('click', resetLayout);

    // 1. إعداد الأزرار العادية (Action Buttons)
    const btns = document.querySelectorAll('.virtual-btn');
    btns.forEach(btn => {
      // أحداث اللعب
      btn.addEventListener('touchstart', (e) => { if(!isEditMode){ e.preventDefault(); pressKey(btn, 'keydown'); }});
      btn.addEventListener('touchend', (e) => { if(!isEditMode){ e.preventDefault(); pressKey(btn, 'keyup'); }});
      btn.addEventListener('mousedown', (e) => { if(!isEditMode){ e.preventDefault(); pressKey(btn, 'keydown'); }});
      
      // أحداث السحب (التعديل)
      btn.addEventListener('touchstart', dragStart, {passive: false});
      btn.addEventListener('mousedown', dragStart);
    });

    // 2. إعداد عصا التحكم التناظرية (Gamepad Joystick)
    if (joyBase) {
        // أحداث اللعب للعصا
        joyBase.addEventListener('touchstart', handleJoyStart, {passive: false});
        joyBase.addEventListener('touchmove', handleJoyMove, {passive: false});
        joyBase.addEventListener('touchend', handleJoyEnd);
        joyBase.addEventListener('touchcancel', handleJoyEnd);
        joyBase.addEventListener('mousedown', handleJoyStart);
        
        // أحداث السحب للعصا في وضع التعديل
        joyBase.addEventListener('touchstart', dragStart, {passive: false});
        joyBase.addEventListener('mousedown', dragStart);
    }

    // رفع اللمس العام
    window.addEventListener('mouseup', () => { if(!isEditMode){ releaseAllKeys(); handleJoyEnd(); }});
    window.addEventListener('touchend', () => { if(!isEditMode){ releaseAllKeys(); handleJoyEnd(); }});

    // السحب العام (التعديل)
    window.addEventListener('touchmove', dragMove, {passive: false});
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('touchend', dragEnd);
    window.addEventListener('mouseup', dragEnd);
  }

  /* ================= منطق العصا التناظرية ================= */
  function handleJoyStart(e) {
      if(isEditMode) return;
      e.preventDefault();
      isJoyActive = true;
      updateJoyDirection(e);
  }

  function handleJoyMove(e) {
      if(!isJoyActive || isEditMode) return;
      e.preventDefault();
      updateJoyDirection(e);
  }

  function handleJoyEnd(e) {
      if(isEditMode || !isJoyActive) return;
      isJoyActive = false;
      if (joyThumb) joyThumb.style.transform = `translate(-50%, -50%)`;
      // تحرير كل الاتجاهات
      applyJoyKeys(0, 0, true);
  }

  function updateJoyDirection(e) {
      if (!joyBase || !joyThumb) return;
      const rect = joyBase.getBoundingClientRect();
      const radius = rect.width / 2;
      const cx = rect.left + radius;
      const cy = rect.top + radius;
      
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      const angle = Math.atan2(dy, dx);
      const renderDist = Math.min(dist, radius);
      
      joyThumb.style.transform = `translate(calc(-50% + ${Math.cos(angle)*renderDist}px), calc(-50% + ${Math.sin(angle)*renderDist}px))`;
      
      // التخفيف (Threshold) لعدم تسجيل اللمسات الخفيفة جداً
      const threshold = radius * 0.3;
      applyJoyKeys(dx, dy, dist < threshold);
  }

  function applyJoyKeys(dx, dy, releaseAll) {
      const newStates = { up: false, down: false, left: false, right: false };
      
      if (!releaseAll) {
          if (dy < -20) newStates.up = true;
          if (dy > 20) newStates.down = true;
          if (dx < -20) newStates.left = true;
          if (dx > 20) newStates.right = true;
      }
      
      ['up', 'down', 'left', 'right'].forEach(dir => {
          if (newStates[dir] !== currentJoyPressed[dir]) {
              const keyToPress = joyConfigKeys[dir];
              if (newStates[dir]) triggerEvent(keyToPress, 'keydown');
              else triggerEvent(keyToPress, 'keyup');
              currentJoyPressed[dir] = newStates[dir];
          }
      });
  }

  /* ================= إظهار الواجهة حسب اللعبة ================= */
  function showForGame(devId) {
    activeGameId = devId;
    if (typeof GameControls === 'undefined' || !GameControls[devId]) return;
    
    const config = GameControls[devId];
    
    // إخفاء كل العناصر أولاً
    document.querySelectorAll('.virtual-btn').forEach(b => b.classList.add('hidden'));
    if (joyBase) joyBase.classList.add('hidden');

    const visibleElements = [];

    // 1. تفعيل عصا التحكم (الأسهم أو الحروف)
    if (config.joystick && joyBase) {
        joyBase.classList.remove('hidden');
        visibleElements.push(joyBase);
        
        if (config.joystick === 'wasd') {
            joyConfigKeys = { up: 'w', down: 's', left: 'a', right: 'd' };
        } else {
            joyConfigKeys = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
        }
    }

    // 2. تفعيل أزرار الأكشن المطلوبة
    if (config.buttons) {
        config.buttons.forEach(key => {
            const btn = document.querySelector(`.virtual-btn[data-key="${key}"]`);
            if (btn) {
                btn.classList.remove('hidden');
                visibleElements.push(btn);
            }
        });
    }

    if (visibleElements.length > 0) {
      Utils.show(zone);
      loadLayout(visibleElements);
    }
  }

  function hide() {
    Utils.hide(zone);
    if (isEditMode) toggleEditMode();
    activeGameId = null;
    releaseAllKeys();
    handleJoyEnd(); // إيقاف العصا
  }

  function toggleEditMode() {
    isEditMode = !isEditMode;
    if (isEditMode) {
      zone.classList.add('edit-mode');
      Utils.hide(editBtn); Utils.show(saveBtn); Utils.show(resetBtn);
    } else {
      zone.classList.remove('edit-mode');
      Utils.show(editBtn); Utils.hide(saveBtn); Utils.hide(resetBtn);
    }
  }

  /* ================= منطق السحب (Drag & Drop) ================= */
  function dragStart(e) {
    if (!isEditMode) return;
    const target = e.target.closest('.virtual-btn') || e.target.closest('.gamepad-joystick-draggable');
    if (target) {
      e.preventDefault();
      dragTarget = target;
      dragTarget.classList.add('dragging');
      
      const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
      const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
      
      startX = clientX;
      startY = clientY;
      
      if(dragTarget.style.position !== 'absolute') dragTarget.style.position = 'absolute';
      initialLeft = dragTarget.offsetLeft;
      initialTop = dragTarget.offsetTop;
    }
  }

  function dragMove(e) {
    if (!isEditMode || !dragTarget) return;
    e.preventDefault();
    const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
    
    const dx = clientX - startX;
    const dy = clientY - startY;
    
    dragTarget.style.left = `${initialLeft + dx}px`;
    dragTarget.style.top = `${initialTop + dy}px`;
  }

  function dragEnd() {
    if (dragTarget) {
      dragTarget.classList.remove('dragging');
      dragTarget = null;
    }
  }

  /* ================= الحفظ والترتيب الذكي ================= */
  function saveLayout() {
    if (!activeGameId) return;
    const layout = {};
    
    // حفظ الأزرار
    document.querySelectorAll('.virtual-btn:not(.hidden)').forEach(btn => {
      layout[btn.dataset.key] = { left: btn.style.left, top: btn.style.top };
    });
    
    // حفظ عصا التحكم
    if (joyBase && !joyBase.classList.contains('hidden')) {
      layout['joystick'] = { left: joyBase.style.left, top: joyBase.style.top };
    }
    
    localStorage.setItem(`gamepad_layout_${activeGameId}`, JSON.stringify(layout));
    toggleEditMode();
  }

  function loadLayout(visibleElements) {
    const saved = localStorage.getItem(`gamepad_layout_${activeGameId}`);
    if (saved) {
      const layout = JSON.parse(saved);
      visibleElements.forEach(el => {
        const key = el.dataset.key || (el.id === 'gamepad-joystick-base' ? 'joystick' : null);
        if (key && layout[key]) {
          el.style.position = 'absolute';
          el.style.left = layout[key].left;
          el.style.top = layout[key].top;
        }
      });
    } else {
      applySmartLayout(visibleElements);
    }
  }

  function resetLayout() {
    if (activeGameId) {
      localStorage.removeItem(`gamepad_layout_${activeGameId}`);
      const visibleElements = [];
      document.querySelectorAll('.virtual-btn:not(.hidden)').forEach(e => visibleElements.push(e));
      if(joyBase && !joyBase.classList.contains('hidden')) visibleElements.push(joyBase);
      applySmartLayout(visibleElements);
    }
  }

  function applySmartLayout(elements) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    
    // نقطة ارتكاز اليسار للعصا واليمين للأزرار
    const baseLeftX = 80; 
    const baseLeftY = h - 140;
    const baseRightX = w - 80;
    const baseRightY = h - 80;

    let actionIndex = 0;

    elements.forEach(el => {
      el.style.position = 'absolute';
      
      if (el.id === 'gamepad-joystick-base') {
        // وضع العصا التناظرية في اليسار
        el.style.left = baseLeftX + 'px';
        el.style.top = baseLeftY + 'px';
      } else {
        // ترتيب الأزرار في اليمين بشكل متموج
        const offsetX = actionIndex * 65;
        const offsetY = (actionIndex % 2 !== 0) ? 35 : 0;
        el.style.left = (baseRightX - offsetX) + 'px';
        el.style.top = (baseRightY - offsetY) + 'px';
        actionIndex++;
      }
    });
  }

  /* ================= محاكاة إرسال الإشارات للإطار ================= */
  function pressKey(btn, type) {
    btn.classList.toggle('active-press', type === 'keydown');
    const key = btn.dataset.key;
    if (type === 'keydown') pressedKeys.add(btn);
    else pressedKeys.delete(btn);
    triggerEvent(key, type);
  }

  function releaseAllKeys() {
    pressedKeys.forEach(btn => {
      btn.classList.remove('active-press');
      triggerEvent(btn.dataset.key, 'keyup');
    });
    pressedKeys.clear();
  }

  function triggerEvent(key, type) {
    if (!key) return;
    const keyCode = getKeyCode(key);
    const eventData = { key: key, code: key, keyCode: keyCode, bubbles: true, cancelable: true };
    const iframe = document.getElementById('device-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.dispatchEvent(new KeyboardEvent(type, eventData));
        iframe.contentWindow.postMessage({ type: type, key: key, code: key, keyCode: keyCode }, '*');
      } catch(e) {}
    }
  }

  function getKeyCode(key) {
    const map = { 'ArrowUp':38, 'ArrowDown':40, 'ArrowLeft':37, 'ArrowRight':39, 'Enter':13, ' ':32, 'Escape':27, 'Shift':16,
                  'w':87, 'a':65, 's':83, 'd':68 }; // دعم حروف WASD
    return map[key] || (key.length === 1 ? key.toUpperCase().charCodeAt(0) : 0);
  }

  window.addEventListener('DOMContentLoaded', init);

  return { showForGame, hide };
})();
