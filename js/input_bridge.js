'use strict';
/**
 * Nosta Input Bridge (المجسر البرمجي الشامل للأندرويد)
 * يقوم بتحويل الإشارات من التطبيق إلى KeyboardEvents حقيقية تدعم كل الأزرار.
 */
const InputBridge = (() => {
    
    // خريطة مفاتيح الكيبورد الشاملة
    const KEY_MAP = {
        // الاتجاهات
        'UP': 'ArrowUp', 'DOWN': 'ArrowDown', 'LEFT': 'ArrowLeft', 'RIGHT': 'ArrowRight',
        
        // الأزرار الخاصة
        'ENTER': 'Enter', 'SPACE': ' ', 'ESCAPE': 'Escape', 'SHIFT': 'Shift',
        'CONTROL': 'Control', 'ALT': 'Alt', 'TAB': 'Tab', 'BACKSPACE': 'Backspace',
        
        // الأرقام
        '0': 'Digit0', '1': 'Digit1', '2': 'Digit2', '3': 'Digit3', '4': 'Digit4',
        '5': 'Digit5', '6': 'Digit6', '7': 'Digit7', '8': 'Digit8', '9': 'Digit9'
    };

    // إضافة حروف اللغة الإنجليزية تلقائياً من A إلى Z
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach(char => {
        KEY_MAP[char] = 'Key' + char;
    });

    /**
     * الدالة التي يناديها تطبيق الأندرويد
     * @param {string} keyName - اسم الزر (مثل 'A', 'ENTER', 'UP')
     * @param {string} type - نوع الحدث ('keydown' أو 'keyup')
     */
    function trigger(keyName, type = 'keydown') {
        const upperKey = keyName.toUpperCase();
        const keyVal = KEY_MAP[upperKey] || keyName;
        
        // إعداد بيانات الحدث
        const eventData = {
            key: upperKey === 'SPACE' ? ' ' : (upperKey.length === 1 ? keyName.toLowerCase() : keyVal),
            code: keyVal,
            bubbles: true,
            cancelable: true,
            view: window,
            keyCode: _getKeyCode(upperKey)
        };

        const event = new KeyboardEvent(type, eventData);

        // 1. إرسال الحدث للنافذة الرئيسية
        window.dispatchEvent(event);

        // 2. إرسال الحدث للعنصر النشط (مثل الـ Iframe)
        const iframe = document.getElementById('device-iframe');
        if (iframe && iframe.contentWindow) {
            // محاولة إرسال الحدث مباشرة داخل الإطار
            try {
                iframe.contentWindow.dispatchEvent(new KeyboardEvent(type, eventData));
                // إرسال رسالة postMessage كنسخة احتياطية للأطر عبر المواقع
                iframe.contentWindow.postMessage({
                    source: 'NOSTA_BRIDGE',
                    type: type,
                    key: eventData.key,
                    code: eventData.code
                }, '*');
            } catch(e) {
                // في حالة قيود الـ CORS، نكتفي بالـ postMessage
                iframe.contentWindow.postMessage({
                    source: 'NOSTA_BRIDGE',
                    type: type,
                    key: eventData.key,
                    code: eventData.code
                }, '*');
            }
        }
    }

    // دالة مساعدة للحصول على KeyCode القديم لزيادة التوافق مع الألعاب القديمة
    function _getKeyCode(k) {
        const codes = {
            'UP':38, 'DOWN':40, 'LEFT':37, 'RIGHT':39, 'ENTER':13, 'SPACE':32, 'ESCAPE':27, 'SHIFT':16
        };
        if(codes[k]) return codes[k];
        if(k.length === 1) return k.charCodeAt(0);
        return 0;
    }

    return { trigger };
})();

// جعل الجسر متاحاً لتطبيق الأندرويد
window.NostaBridge = InputBridge;
