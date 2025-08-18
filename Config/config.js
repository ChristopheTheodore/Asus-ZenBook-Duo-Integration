'use strict';

//-----------------------------------------------------------------------------
//    ./Config/config.js

//    Code ecrit par Christophe Theodore
//    Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell

//    Licence : GPL-2.0, 
//        logiciel libre, vous pouvez le copier et l'utiliser librement

//    Merci à la communauté pour son aide précieuse..

//-----------------------------------------------------------------------------

// ==================== Paramètres GSettings ====================
export const GSettingsPaths = {
    SETTINGS: 'org.gnome.shell.extensions.zen-book-duo-integration',
    BACKGROUND: 'org.gnome.desktop.background'
};

// ==================== Chemins Système ====================
export const SysClassPaths = {
    BRIGHTNESS: '/sys/class/backlight/asus_screenpad/brightness',
    BL_POWER: '/sys/class/backlight/asus_screenpad/bl_power',
};
