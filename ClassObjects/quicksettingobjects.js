'use strict';

//-----------------------------------------------------------------------------
//    ./ClassObjectss/quicksettingobjects.js

//    This extension is not affiliated, funded,or in any way associated with Asus.
//    Code ecrit par Christophe Theodore
//    Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell

//    Licence : GPL-2.0, 
//        logiciel libre, vous pouvez le copier et l'utiliser librement

//    Merci à la communauté pour son aide précieuse..
//-----------------------------------------------------------------------------


//    import
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';


// class ScreenPadSlider
export const ScreenPadSlider = GObject.registerClass(
class ScreenPadSlider extends QuickSettings.QuickSlider {

    _init(extensionObjects) {
        super._init({
            iconName: 'input-tablet-symbolic',
            iconLabel: _("Icon Accessible Name"),
        });

        // Declaration des objects
        this._extensionObjects = extensionObjects;

        // Declaration des icons
        this.giconOff = Gio.icon_new_for_string(this._extensionObjects.path + '/Media/input-tablet-symbolic-off.svg');
        this.giconFull = Gio.icon_new_for_string(this._extensionObjects.path + '/Media/input-tablet-symbolic-full.svg');
        this.giconOn = Gio.icon_new_for_string(this._extensionObjects.path + '/Media/input-tablet-symbolic-on.svg');

        // Nomination du slider
        this.slider.accessible_name = _("ScreenPad-Slider");

        this.iconReactive = false;
    }
});


// _____________________
// class ScreenPadToggle
export const ScreenPadToggle = GObject.registerClass(
class ScreenPadToggle extends QuickSettings.QuickToggle {

 _init() {
        super._init({
            title: _("Linked"),
            subtitle: _("ScreenPad linked"),
            iconName: 'selection-mode-symbolic',
            toggleMode: true,
        });
    }
});


// class ScreenPadToggleMenu
export const ScreenPadToggleMenu = GObject.registerClass(
class ScreenPadToggleMenu extends QuickSettings.QuickMenuToggle {

    _init(extensionObjects) {
        super._init({
            title: _("ScreenPad"),
            subtitle: _("ScreenPad Status"),
            iconName: 'input-tablet-symbolic',
            toggleMode: true,
        });

        this.headerIcon = this.giconOff;

        // Declaration des objects
        this._extensionObjects = extensionObjects;
        this.menuItemsTable = [
            ['Linked', this.menuItemLinked, _("ScreenPad Linked")],
            ['Free', this.menuItemFree, _("ScreenPad Free")],
            ['Full', this.menuItemFull, _("ScreenPad Full")],
            ['Off', this.menuItemOff, _("ScreenPad Off")]
        ];

        // Création des items
        this.menuItemsTable.forEach(_forEachmenuItem => 
            _forEachmenuItem[1] = this.menu.addAction(_forEachmenuItem[2], () => 
                this._extensionObjects._settings.set_string('screenpad-mode', _forEachmenuItem[0]))
        );

        // mise à jour de l'ornement checked
        this.updateOrnamentMenuItems();
    }

    async updateOrnamentMenuItems() {

        this.menuItemsTable.forEach(_forEachmenuItem => {
            if (_forEachmenuItem[0] == this._extensionObjects._settings.get_string('screenpad-mode'))
                _forEachmenuItem[1].setOrnament(PopupMenu.Ornament.CHECK);
            else _forEachmenuItem[1].setOrnament(PopupMenu.Ornament.NONE);
        } );
    }

});
