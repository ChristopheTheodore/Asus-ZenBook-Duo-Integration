'use strict';

//-----------------------------------------------------------------------------
//    ./extensions.js

//    This extension is not affiliated, funded,or in any way associated with Asus.
//    Code ecrit par Christophe Theodore
//    Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell

//    Licence : GPL-2.0, 
//        logiciel libre, vous pouvez le copier et l'utiliser librement

//    Merci à la communauté pour son aide précieuse..

//    Inspiré par une extension écrite par jibsaramnim and lunaneff
//    https://github.com/lunaneff/gnome-shell-extension-zenbook-duo
//    Le code à été entièrement revu et modifié
//    je remercie les auteurs.
//-----------------------------------------------------------------------------


// import
import Gio from 'gi://Gio';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import { SysClassPaths, GSettingsPaths } from './Config/config.js';

import * as screenpadObjects from './ClassObjects/screenpadobjects.js'
import * as systemFileUtility from './ClassObjects/functions.js';


//     let firstRun passera à false après avoir testé les outils externe.
//     Je ne veux pas refaire le test a chaque enable(), une fois au démarrage.
let firstRun = true;


// Class Principale
export default class ZenBookDuoIntegration extends Extension {

    enable() {

        // Le setting
        this._settings = this.getSettings(GSettingsPaths.SETTINGS);
        this._backgroundSetting = new Gio.Settings( {schema_id: GSettingsPaths.BACKGROUND } );

        // Declaration des Variables
        let brightnessFilesStatus = systemFileUtility.checkSysClassFileAccess(SysClassPaths.BRIGHTNESS);
        let blPowerFilesStatus = systemFileUtility.checkSysClassFileAccess(SysClassPaths.BL_POWER);
        let mainSliderStatus = true;
        let extensionStatus = "NA";

        // Declaration des objects
        this._screenpadControl = null;

        // Declaration des connexions
        this._screenpadActivatedId = null;

        // et pour se simplifier la vie
        this.mainSlider = Main.panel.statusArea.quickSettings._brightness.quickSettingsItems[0];

        //    Test RW des /sys/class files
        //    Vérifions cela, mais qu'une seule fois, au premier démarrage ! 
        if (firstRun) {

            // on test main.panel.statusArea...
            try {
                if (!Main.panel.statusArea.quickSettings._brightness?.quickSettingsItems?.[0]?.slider) {
                    mainSliderStatus = false;
                }
            } catch (e) {
                mainSliderStatus = false;
            }

            //    NA->Not Applicable, 00->inexistant, RO->readOnly, RW->readWrite 
            if (mainSliderStatus) {
                if (brightnessFilesStatus !== "RW") extensionStatus = brightnessFilesStatus;
                else if (blPowerFilesStatus !=="RW") extensionStatus = blPowerFilesStatus;
                    else extensionStatus = "RW";
            } else extensionStatus = "NA";
            this._settings.set_string('sys-class-led-status', extensionStatus);

            // On informe l'utilisateur si NOK, si OK, on initialise l'extension
            switch (extensionStatus) {

                case "NA":
                    // Main.panel.statusArea.quickSettings._brightness.quickSettingsItems.[0].slider n est pas accessible
                    this._settings.set_boolean('screenpad-extension-activated', false);
                    this._showNotification (
                        _("ZenBook Extension deactivation"),
                        _("The main control panel is not accessible."),
                        "critical"
                    );

                break;

                case "00":
                    // /sys/class/backlight/asus_screenpad/brightness n'est pas present
                    this._settings.set_boolean('screenpad-extension-activated', false);
                    this._showNotification (
                        _("ZenBook Extension deactivation"),
                         _("A file") 
                         + " /sys/class/backlight/asus_screenpad/* " 
                         + _("was not detected. A kernel newer than 6.5 is required."),
                        "critical"
                    );

                break;

                case "RO":
                    // /sys/class/backlight/asus_screenpad/brightness est en lecture seule
                    this._settings.set_boolean('screenpad-extension-activated', false);
                    this._showNotification (
                        _("ZenBook Extension deactivation"),
                        _("A file") 
                        + " /sys/class/backlight/asus_screenpad/* " 
                        + _("is read-only. See the preferences to configure") + " /etc/udev/rules.d/99-asus.rules.",
                        "critical"
                    );

                break;

            }

            firstRun = false;

        }

        //    Activation des class objects et des connexions 
        //    si sys-class-led est RW et screenpad-extension-activated true

        // class _screenpadControl
        if( this._settings.get_boolean('screenpad-extension-activated') && this._settings.get_string('sys-class-led-status') === "RW" ) {

            // Création de la class _screenpadControl
            //    enable du ScreenpadControl dans le callback du _initScreenpadSetting 
            this._screenpadControl = new screenpadObjects.screenpadControl(this);

            // _initScreenpadSetting
            this._initScreenpadSetting(SysClassPaths.BRIGHTNESS,SysClassPaths.BL_POWER);

            // Connexion du screenpad-extension-activated
            this._screenpadActivatedId = this._settings.connect ('changed::screenpad-extension-activated', () => {
                if( this._settings.get_boolean('screenpad-extension-activated') && this._settings.get_string('sys-class-led-status') === "RW") {
                    // Activation de la class _screenpadControl et _initScreenpadSetting
                    this._screenpadControl = new screenpadObjects.screenpadControl(this);
                    this._initScreenpadSetting(SysClassPaths.BRIGHTNESS,SysClassPaths.BL_POWER);
                } else {
                    // destruction des objects
                    this._screenpadControl?.disableScreenpadControl();
                    this._screenpadControl = null;
                }
            } );
        }

        // Petit coup de balai avant de partir
        brightnessFilesStatus = null;
        blPowerFilesStatus = null;
        mainSliderStatus = null;
        extensionStatus = null;

    }

    disable() {

        // Destructions des connexions
        if (this._screenpadActivatedId) {
            this._settings.disconnect(this._screenpadActivatedId);
            this._screenpadActivatedId = null;
        }

        // Destruction des objects 
        this._screenpadControl?.disableScreenpadControl();
        this._screenpadControl = null;

        // et le reste
        this._settings = null;
        this._backgroundSetting = null;
        this.mainSlider = null;
        this._notifSource?.destroy();
        this._notifSource = null;
    }


    //    Initialisation de la valeur du screen pad brightness
    _initScreenpadSetting(SysClassBrightnessFile,SysClassBLPowerFile) {

        // Récupération de SysClassBrightnessFile de facon asynchrone
        systemFileUtility.getSysClassFileValue(SysClassBrightnessFile, (_sysClassScreenPadBrightnessValue) => {

            // Puis récupération de bl_powerFile de facon asynchrone
            systemFileUtility.getSysClassFileValue(SysClassBLPowerFile, (_sysClassScreenPadBLPowerValue) => {

                // Initialisation des variables
                // Valeur: Slider 0 à 1, seting 0 à 100 (%), sys/class/backlight 0 à 235
                // BLPower 1 = off, BLPower 0 = on
                let mainBrightnessValue = Math.round(this.mainSlider.slider.value*100);
                let sysClassScreenPadBrightnessValue = parseInt(_sysClassScreenPadBrightnessValue);
                let sysClassScreenPadBLPowerValue = parseInt(_sysClassScreenPadBLPowerValue);
                let screenpadMode = this._settings.get_string('screenpad-mode');
                let screenpadAutoAdjustValue = this._settings.get_boolean('screenpad-auto-adjust');
                let functionResult = "ko";
                let newScreenPadBrightnessValue = -1;

                // le screen pad est certainement allumé, dans le cas contraire, case "Off" l'éteindra!
                this._settings.set_boolean('screenpad-status', true);

                // En Fonction de screenpad-mode
                switch (screenpadMode) {

                    case "Linked":
                        newScreenPadBrightnessValue = mainBrightnessValue;
                    break;

                    case "Free":
                        newScreenPadBrightnessValue = sysClassScreenPadBrightnessValue

                    break;

                    case "Off":
                        // Cas 1 : l'écran est il vraiment Off ?
                        if (sysClassScreenPadBLPowerValue === 1) {
                        this._settings.set_boolean('screenpad-status', false);
                        newScreenPadBrightnessValue = 0;

                            // La fonction autoAjustement est elle true?
                            if(screenpadAutoAdjustValue) {
                                // Auto allumage de l'écran, mise en mode Free
                                functionResult = systemFileUtility.setSysClassFileValue(SysClassBLPowerFile,"0");
                                if (functionResult === "ok") {
                                    this._settings.set_boolean('screenpad-status', true);
                                    newScreenPadBrightnessValue = mainBrightnessValue;
                                    sysClassScreenPadBLPowerValue = 0;
                                    this._settings.set_string('screenpad-mode', "Free");
                                }
                                // Mise a jour de la décoration background
                                if (this._settings.get_boolean('background-activated'))
                                    systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "On");

                            }
                        // Cas 2 : l'écran n'était pas Off
                        } else {
                            // L'ecran n'était pas éteint, mise a jour de l'extension Certainement un redémarrage systeme
                            newScreenPadBrightnessValue = sysClassScreenPadBrightnessValue
                            this._settings.set_string('screenpad-mode', "Free");
                            // Mise a jour de la décoration background
                            if (this._settings.get_boolean('background-activated'))
                                systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "On");
                        }

                    break;

                    case "Full":
                        // Cas 1 : l'écran est il vraiment Full ?
                        if (sysClassScreenPadBrightnessValue > 234) {
                        newScreenPadBrightnessValue = 100;
                            // La fonction autoAjustement est elle true?
                            if(screenpadAutoAdjustValue) {
                                // Auto ajustement de l'écran, mise en mode Free
                                newScreenPadBrightnessValue = mainBrightnessValue;
                                this._settings.set_string('screenpad-mode', "Free");
                            }
                        // Cas 2 : l'écran n'était pas Full
                        } else {
                            // L'ecran n'était pas Full, mise a jou de l'extension
                            newScreenPadBrightnessValue = sysClassScreenPadBrightnessValue
                            this._settings.set_string('screenpad-mode', "Free");
                        }

                    break;

                }

                // Mise a jour de screenpad-brightness et écriture dans le /sys/.../brightness
                this._settings.set_int('screenpad-brightness', newScreenPadBrightnessValue);
                functionResult = systemFileUtility.setSysClassFileValue(SysClassBrightnessFile, Math.round(newScreenPadBrightnessValue*235/100));

                // puis, sauvegarde de l'état actuelle sauf si off
                if ( this._settings.get_string('screenpad-mode') != "Off")
                    this._settings.set_strv ('screenpad-last-mode',
                        [this._settings.get_string('screenpad-mode'),this._settings.get_int('screenpad-brightness').toString() ]
                );

                // Petit coup de balai avant de partir
                screenpadAutoAdjustValue = null;
                sysClassScreenPadBrightnessValue = null;
                mainBrightnessValue = null;
                newScreenPadBrightnessValue = null;
                screenpadMode = null;
                functionResult = null;

                this._screenpadControl.enableScreenpadControl();
            });
        });
   }


    // Merci a Voluble Extension pour l'inspiration
    // Fonction _showNotification
    _showNotification(title, message, urgency = "normal") {

        const systemSource = MessageTray.getSystemSource();
        if (systemSource) {
            const notification = new MessageTray.Notification({
                source: systemSource,
                title: title,
                body: message,
                gicon: Gio.Icon.new_for_string("dialog-information-symbolic"),
            });

            if(urgency === "critical") notification.urgency = MessageTray.Urgency.CRITICAL;
            else notification.urgency = MessageTray.Urgency.NORMAL;

            notification.addAction(_("Preferences"), () => {
                this.openPreferences();
            });

            systemSource.addNotification(notification);
        } else {
            Main.notify(title, message);
        }

    }

}