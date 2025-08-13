'use strict';

		// ------------------------------------------------------------------------------------- //
		// 		./ClassObjectss/quicksettingobjects.js											 //
		// 																						 //
		// 		Code ecrit par Christophe Theodore												 //
		// 		Licence : GPL-2.0, logiciel libre, vous pouvez le copier et l'utiliser librement //
		// 		Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell				 //
		// 		Merci à la communauté pour les bouts de codes pèché ici et la.					 //
		//-------------------------------------------------------------------------------------- //


//	_______________
//	import from 'gi
import Gio 								from 'gi://Gio';
import GObject 							from 'gi://GObject';
import St 								from 'gi://St';

//	____________________________
//	import from org/gnome/shell/
import {Extension, gettext as _} 		from 'resource:///org/gnome/shell/extensions/extension.js';
import * as QuickSettings 				from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as Main 						from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu 					from 'resource:///org/gnome/shell/ui/popupMenu.js';


//	_____________________
//	class ScreenPadSlider
export const ScreenPadSlider = GObject.registerClass(
class ScreenPadSlider extends QuickSettings.QuickSlider {

//	___________
	_init(extensionObjects) {
		super._init({
			iconName: 'input-tablet-symbolic',
			iconLabel: _('Icon Accessible Name'),
		});

		// Declaration des objects
		this._extensionObjects			= extensionObjects;

		this.giconOff 					= Gio.icon_new_for_string(this._extensionObjects.path + '/Media/input-tablet-symbolic-off.svg');
		this.giconFull 					= Gio.icon_new_for_string(this._extensionObjects.path + '/Media/input-tablet-symbolic-full.svg');
		this.giconOn 					= Gio.icon_new_for_string(this._extensionObjects.path + '/Media/input-tablet-symbolic-on.svg');

		// Watch for changes and set an accessible name for the slider
		// Watch for changes est traité dans extension
		this.slider.accessible_name 	= _('ScreenPad-Slider');

		//	____________________________________________
		//	Make the icon clickable (e.g. Screen On/Off)
		//	Le toggle switch s'en occupe
		this.iconReactive 				= false;

		//	_____________________________________
		//	Binding the slider to a GSettings key
		//	J'ésite, GSetting n'a pas vraiment à interférer avec la luminosité...
	}
});


//	_____________________
//	class ScreenPadToggle
export const ScreenPadToggle = GObject.registerClass(
class ScreenPadToggle extends QuickSettings.QuickToggle {

//	_______
	_init() {
		super._init({
			title: _('Linked'),
			subtitle: _('ScreenPad linked'),
			iconName: 'selection-mode-symbolic',
			toggleMode: true,
		});
	}
});


//	_________________________
//	class ScreenPadToggleMenu
export const ScreenPadToggleMenu = GObject.registerClass(
class ScreenPadToggleMenu extends QuickSettings.QuickMenuToggle {

//	_______________________
	_init(extensionObjects) {
		super._init({
			title: _('ScreenPad'),
			subtitle: _('ScreenPad Status'),
			iconName: 'input-tablet-symbolic',
			toggleMode: true,
		});

		this.headerIcon 				= this.giconOff;

		//	______________________
		// Declaration des objects
		this._extensionObjects			= extensionObjects;
		this.menuItemsTable 			= 	[ 
												['Linked', 	this.menuItemLinked,	_("ScreenPad Lie")], 
												['Free', 	this.menuItemFree,		_("ScreenPad Libre")], 
												['Full', 	this.menuItemFull,		_("Full")], 
												['Off', 	this.menuItemOff,		_("ScreenPad éteint")]
											];

		// Add a header with an icon, title and optional subtitle. This is
		// recommended for consistency with other quick settings menus.
		//this.menu.setHeader(this.giconOff, _('ScreenPad Options'));

		// 	__________________
		// 	Création des items
		this.menuItemsTable.forEach(_forEachmenuItem => 
											_forEachmenuItem[1] = this.menu.addAction(_forEachmenuItem[2], 
													() => this._extensionObjects._settings.set_string('screenpad-mode', _forEachmenuItem[0]))
									);

		// 	_________________________________
		// 	mise à jour de l'ornement checked
		this.updateOrnamentMenuItems();

// ⁉️ Confirmer
		// Ensure the settings are unavailable when the screen is locked
		//		settingsItem.visible = Main.sessionMode.allowSettings;
		//		this.menu._settingsActions[extensionObject.uuid] = settingsItem;
	}

	async updateOrnamentMenuItems() {

		// setOrnament(PopupMenu.Ornament.CHECK) dans menuItemsTable;
		this.menuItemsTable.forEach(_forEachmenuItem => 	
											{
												if (_forEachmenuItem[0] == this._extensionObjects._settings.get_string('screenpad-mode'))
													_forEachmenuItem[1].setOrnament(PopupMenu.Ornament.CHECK);
												else _forEachmenuItem[1].setOrnament(PopupMenu.Ornament.NONE);
											}
									);
	}

});
