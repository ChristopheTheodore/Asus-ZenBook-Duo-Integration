'use strict';

//-----------------------------------------------------------------------------
//    ./extensions.js

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


// _______________
// import from 'gi
import Gio from 'gi://Gio';

// ____________________________
// import from org/gnome/shell/
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

// _______________________________
// import from config (constantes)
import { SysClassPaths, GSettingsPaths } from './Config/config.js';

// _______________________________________
// import from class (object et fonctions)
import * as screenpadObjects from './ClassObjects/screenpadobjects.js'
import * as systemFileUtility from './ClassObjects/functions.js';


//-----------------------------------------------------------------------------
//     let firstRun passera à false après avoir testé les outils externe.
//     Je ne veux pas refaire le test a chaque enable(), une fois au démarrage.
//-----------------------------------------------------------------------------
let firstRun = true;


// ________________
// Class Principale
export default class ZenBookDuoIntegration extends Extension {

//  ________
//  enable()
    enable() {

        // __________
        // Le setting
        this._settings = this.getSettings(GSettingsPaths.SETTINGS);
//        this._backgroundSetting = this.getSettings(GSettingsPaths.BACKGROUND);
        this._backgroundSetting = new Gio.Settings( {schema_id: GSettingsPaths.BACKGROUND } );

        // _________________________
        // Declaration des Variables
        let brightnessFilesStatus = systemFileUtility.checkSysClassFileAccess(SysClassPaths.BRIGHTNESS);
        let blPowerFilesStatus = systemFileUtility.checkSysClassFileAccess(SysClassPaths.BL_POWER);
        let mainSliderStatus = true;
        let extensionStatus = "NA";

        // _______________________
        // Declaration des objects
        this._screenpadControl = null;

        // __________________________
        // Declaration des connexions
        this._screenpadActivatedId = null;

        // ___________________________
        // et pour se simplifier la vie
        this.mainSlider = Main.panel.statusArea.quickSettings._brightness.quickSettingsItems[0];

        //---------------------------------------------------------------------
        //    Pour Fonctionner, cette extension a besoin d'un acces à :
        //        main.panel.statusArea.quickSettings._brightness...
        //        /sys/class/backlight/asus_screenpad/brightnessKernel > 6.5
        //        /sys/class/backlight/asus_screenpad/bl_powerKernel > 6.5
        //    en Lecture ET écriture
        //        /etc/udev/rules.d/99-asus.rules authorise l'acces en écriture
        //    Vérifions cela, mais qu'une seule fois, au premier démarrage ! 
        //---------------------------------------------------------------------

        if (firstRun) {

            // ________________________________
            // on test main.panel.statusArea...
            try {
                if (!Main.panel.statusArea.quickSettings._brightness?.quickSettingsItems?.[0]?.slider) {
                    mainSliderStatus = false;
                }
            } catch (e) {
                mainSliderStatus = false;
            }

            //-----------------------------------------------------------------
            //    verification de :
            //        /sys/class/backlight/asus_screenpad/brightness
            //        /sys/class/backlight/asus_screenpad/bl_power
            //        main.panel.statusArea.quickSettings._brightness...
            //    NA->Not Applicable
            //    00->inexistant
            //    RO->readOnly
            //    RW->readWrite 
            //-----------------------------------------------------------------

            if (mainSliderStatus) {
                if (brightnessFilesStatus !== "RW") extensionStatus = brightnessFilesStatus;
                else if (blPowerFilesStatus !=="RW") extensionStatus = blPowerFilesStatus;
                    else extensionStatus = "RW";
            } else extensionStatus = "NA";
            this._settings.set_string('sys-class-led-status', extensionStatus);

            // _______________________________
            // On informe l'utilisateur si NOK
            // si OK, on initialise l'extension
            switch (extensionStatus) {

                case "NA":
                    // Main.panel.statusArea.quickSettings._brightness.quickSettingsItems.[0].slider n est pas accessible
                    this._settings.set_boolean('screenpad-extension-activated', false);
                    this._showNotification (
                        _("Désactivation de ZenBook Extension"),
                        _("Le panneau de contrôle principal n’est pas accessible."),
                        "critical"
                    );

                break;

                case "00":
                    // /sys/class/backlight/asus_screenpad/brightness n'est pas present
                    this._settings.set_boolean('screenpad-extension-activated', false);
                    this._showNotification (
                        _("Désactivation de ZenBook Extension"),
                         _("Un fichier") + " /sys/class/backlight/asus_screenpad/* " + _("n’a pas été détecté. Un noyau supérieur à 6.5 est requis."),
                        "critical"
                    );

                break;

                case "RO":
                    // /sys/class/backlight/asus_screenpad/brightness est en lecture seule
                    this._settings.set_boolean('screenpad-extension-activated', false);
                    this._showNotification (
                        _("Désactivation de ZenBook Extension"),
                        _("Un fichier") + " /sys/class/backlight/asus_screenpad/* " + _("est en lecture seule. Consultez les préférences pour configurer /etc/udev/rules.d/99-asus.rules."),
                        "critical"
                    );

                break;

                case "RW":
                    //    /sys/class/backlight/asus_screenpad/brightness est en lecture/ecriture
                    //    Rien à faire ici

                break;

            }

            //-----------------------------------------------------------------
            //    firstRun passe à false,
            //    Les tests en lecture et ecriture de /sys/class/led...
            //    ne seront pas exécutés après un prochain enable().
            //-----------------------------------------------------------------
            firstRun = false;

        }
        //---------------------------------------------------------------------
        //    End of first run
        //---------------------------------------------------------------------

        //---------------------------------------------------------------------
        //    Activation des class objects et des connexions 
        //    si sys-class-led est RW et screenpad-extension-activated true
        //---------------------------------------------------------------------

        // _______________________
        // class _screenpadControl
        if( this._settings.get_boolean('screenpad-extension-activated') && this._settings.get_string('sys-class-led-status') === "RW" ) {
            //Main.notify('_screenpadControl start', 'Value : ' );

            // ________________________________________
            // Création de la class _screenpadControl
            this._screenpadControl = new screenpadObjects.screenpadControl(this);

            //-----------------------------------------------------------------
            // ATTENTION :
            //    _initScreenpadSetting est devenu asynchrone
            //    enableScreenpadControl()
            //    doit etre activé dans _initScreenpadSetting
            //-----------------------------------------------------------------

            // _____________________
            // _initScreenpadSetting
            this._initScreenpadSetting(SysClassPaths.BRIGHTNESS,SysClassPaths.BL_POWER);

            // ________________________________
            // Connexion du screenpad-extension-activated
            this._screenpadActivatedId = this._settings.connect ('changed::screenpad-extension-activated', () => {
                if( this._settings.get_boolean('screenpad-extension-activated') && this._settings.get_string('sys-class-led-status') === "RW") {
                    // Activation de la class _screenpadControl
                    this._screenpadControl = new screenpadObjects.screenpadControl(this);
                    // _initScreenpadSetting
                    this._initScreenpadSetting(SysClassPaths.BRIGHTNESS,SysClassPaths.BL_POWER);
                } else {
                    // destruction des objects
                    this._screenpadControl?.disableScreenpadControl();
                    this._screenpadControl = null;
                }
            } );

        }

        // __________________________________
        // Petit coup debalai avant de partir
        brightnessFilesStatus = null;
        blPowerFilesStatus = null;
        mainSliderStatus = null;
        extensionStatus = null;

    }

    disable() {

        //---------------------------------------------------------------------
        //    Remember
        //    Any objects or widgets created by an extension 
        //        MUST be destroyed in disable().
        //    This is required for approval during review!
        //---------------------------------------------------------------------

        // ___________________________
        // Destructions des connexions
        if (this._screenpadActivatedId) {
            this._settings.disconnect(this._screenpadActivatedId);
            this._screenpadActivatedId = null;
        }

        // ________________________
        // Destruction des objects 
        this._screenpadControl?.disableScreenpadControl();
        this._screenpadControl = null;

        // ___________
        // et le reste
        this._settings = null;
        this._backgroundSetting = null;
        this.mainSlider = null;
    }


    //-------------------------------------------------------------------------
    //    Initialisation de la valeur du screen pad brightness
    // 
    //    ScreenPad linked 
    //        sysClassScreenPadBrightnessValue = MainBrightnessValue
    // 
    //    ScreenPad Free
    //        ScreenPadBrightnessValue = sysClassScreenPadBrightnessValue
    // 
    //    ScreenPad Off 
    //        Cas1 : sysClassScreenPadBrightnessValue = 0: c'est vrai, si Auto On...
    //        Cas2 : sysClassScreenPadBrightnessValue≠ 0: c'est faux 
    //            ScreenPadBrightnessValue = sysClassScreenPadBrightnessValue
    //            ajuster les décorations ( bouton, slider, background + Free)
    // 
    //    ScreenPad Full 
    //        Cas1 : sysClassScreenPadBrightnessValue = 235: c'est vrai, rien a faire
    //        Cas2 : sysClassScreenPadBrightnessValue ≠ 235: c'est faux 
    //            ScreenPadBrightnessValue = sysClassScreenPadBrightnessValue
    //            ajuster les décorations ( bouton, slider, background + Free)
    //
    //    Cas particulier, au démarrage du system, l'écran est par defaut alllumé
    //        si screen pad status ne match pas bl_power
    //        le mode passe a Free et ajustement du background
    //-------------------------------------------------------------------------
    _initScreenpadSetting(SysClassBrightnessFile,SysClassBLPowerFile) {

        // Récupération de SysClassBrightnessFile de facon asynchrone
        systemFileUtility.getSysClassFileValue(SysClassBrightnessFile, (_sysClassScreenPadBrightnessValue) => {

            // Puis récupération de bl_powerFile de facon asynchrone
            systemFileUtility.getSysClassFileValue(SysClassBLPowerFile, (_sysClassScreenPadBLPowerValue) => {

                //-------------------------------------------------------------
                //    Rappel :
                //    main Brightness Value 
                //        Slider valeur comprise entre 000 et 001
                //        setting valeur en pourcentage entre 000 et 100
                //        sys/class/backlight valeur entre 000 et 255
                //    screenpad Brightness Value 
                //        Slider valeur comprise entre 000 et 001
                //        setting valeur en pourcentage entre 000 et 100
                //        sys/class/backlight valeur entre 000 et 235
                //-------------------------------------------------------------

                // Initialisation des variables
                let mainBrightnessValue = Math.round(this.mainSlider.slider.value*100);
                let sysClassScreenPadBrightnessValue = parseInt(_sysClassScreenPadBrightnessValue);
                let sysClassScreenPadBLPowerValue = parseInt(_sysClassScreenPadBLPowerValue);
                let screenpadMode = this._settings.get_string('screenpad-mode');
                let screenpadAutoAdjustValue = this._settings.get_boolean('screenpad-auto-adjust');
                let functionResult = "ko";

                let newScreenPadBrightnessValue = -1;
                //Main.notify('init screenpad', 'sysClassScreenPadBrightnessValue : ' + sysClassScreenPadBrightnessValue);

                // le screen pad est certainement allumé, dans le cas contraire, case "Off" l'éteindra!
                this._settings.set_boolean('screenpad-status', true);

                // ___________________________________
                // En Fonction de screenpad-mode
                switch (screenpadMode) {

                    case "Linked":
                        newScreenPadBrightnessValue = mainBrightnessValue;
                    break;

                    case "Free":
                        newScreenPadBrightnessValue = sysClassScreenPadBrightnessValue

                    break;

                        // Rappelle :
                        //    BLPower 1 = off
                        //    BLPower 0 = on
                    case "Off":
                        // Cas 1 : l'écran est il vraiment Off ?
                        if (sysClassScreenPadBLPowerValue === 1) {
                        this._settings.set_boolean('screenpad-status', false);
                        newScreenPadBrightnessValue = 0;

                            // La fonction autoAjustement est elle true?
                            if(screenpadAutoAdjustValue) {
                                // Auto allumage de l'écran, mise en mode Free
                                // BackLight a 0 pour on
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
                            // L'ecran n'était pas éteint, mise a jour de l'extension
                            // Certainement un redémarrage systeme
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

                // ___________________________________
                // Mise a jour de screenpad-brightness
                // puis écriture dans le /sys/.../brightness
                this._settings.set_int('screenpad-brightness', newScreenPadBrightnessValue);
                functionResult = systemFileUtility.setSysClassFileValue(SysClassBrightnessFile, Math.round(newScreenPadBrightnessValue*235/100));

                // puis, sauvegarde de l'état actuelle
                // sauf si off
                if ( this._settings.get_string('screenpad-mode') != "Off")
                    this._settings.set_strv ('screenpad-last-mode',
                        [this._settings.get_string('screenpad-mode'),this._settings.get_int('screenpad-brightness').toString() ]
                );

                // __________________________________
                // Petit coup debalai avant de partir
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


    //-------------------------------------------------------------------------
    //    Ici, je commence à traiter les fonctions
    //-------------------------------------------------------------------------
    
    
    //-------------------------------------------------------------------------
    //     Merci a Voluble Extension pour l'inspiration
    //-------------------------------------------------------------------------

    // __________________________
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

            notification.addAction(_("Préférences"), () => {
                this.openPreferences();
            });

            systemSource.addNotification(notification);
        } else {
            Main.notify(title, message);
        }

    }

//-----------------------------------------------------------------------------
//    La fin
//-----------------------------------------------------------------------------
}