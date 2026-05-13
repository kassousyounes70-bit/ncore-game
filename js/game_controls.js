'use strict';
/*
 * ملف إعدادات أزرار الألعاب (Game Controls Config)
 * يدعم الآن اختيار نوع عصا التحكم (الأسهم أو WASD) بالإضافة للأزرار.
 */
const GameControls = {
    // الحاسوب رقم 29
    12: {
        joystick: 'arrows', // يمكن أن تكون 'arrows' للأسهم أو 'wasd' للحروف
        buttons: ['z', 'x', 'Enter'] // الأزرار الإضافية
    },
    
    // مثال للعبة أخرى تعمل بـ WASD:
    // 15: {
    //     joystick: 'wasd',
    //     buttons: [' ', 'Shift', 'r']
    // }
};
