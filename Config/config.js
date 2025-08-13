'use strict';

// ------------------------------------------------------------------------------------- //
// 		./Config/config.js																 //
// 																						 //
// 		Code ecrit par Christophe Theodore et DeepSeek									 //
// 		Licence : GPL-2.0, logiciel libre, vous pouvez le copier et l'utiliser librement //
// 		Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell				 //
// 		Merci à la communauté pour les bouts de codes pèché ici et la.					 //
//-------------------------------------------------------------------------------------- //

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


