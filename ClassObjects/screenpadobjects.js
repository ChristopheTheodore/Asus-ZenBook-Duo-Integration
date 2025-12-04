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


// import from
import Gio from 'gi://Gio';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import * as QuickSettingObjects from './quicksettingobjects.js';

import { SysClassPaths, GSettingsPaths } from '../Config/config.js';

import * as systemFileUtility from './functions.js';


export class screenpadControl {
    constructor(extensionObjects) {
        this._extensionObjects = extensionObjects;
    }

    enableScreenpadControl() {

        // Le setting
        this._settings = this._extensionObjects.getSettings(GSettingsPaths.SETTINGS);
        this._backgroundSetting = new Gio.Settings( {schema_id: GSettingsPaths.BACKGROUND } );

        // Déclaration des constantes
        this.SYSCLASSSTATUS = this._settings.get_string('sys-class-led-status');

        // Déclaration des Variables
        this.setScreenPadBrightnessIsRunning = false;

        // Déclaration des objects quickSetting
        this._screenpadSliderIndicator = null;
        this._screenpadSlider = null;
        this._screenpadToggleMenuIndicator = null;
        this._screenpadToggleMenu = null;

        // Déclaration des connexions
        this._screenpadSliderDragBeginId = null;
        this._screenpadSliderDragEndId = null;
        this._screenpadSliderChangedId = null;
        this._mainSliderDragBeginId = null;
        this._mainSliderDragEndId = null;
        this._mainSliderChangedId = null;
        this._screenpadToggleSwitchId = null;
        this._screenpadToggleMenuchId = null;

        // Déclaration des objects et autre stream Gio
        this._SysClassBrightnessGFile = null;
        this._SysClassBrightnessStream = null;
        this._SysClassBrightnessOutputStream = null;

        // et quelques petits outils util
        this._textEncoder = new TextEncoder();

        // et pour se simplifier la vie
        this.mainSlider = Main.panel.statusArea.quickSettings._brightness.quickSettingsItems[0];

        //    Création du GIO File pour: /sys/class/ file
        //    Stream ouvert en "drag-begin" et fermé en "drag-end".
        if( this.SYSCLASSSTATUS == "RW" ) {
            this._SysClassBrightnessGFile = Gio.File.new_for_path(SysClassPaths.BRIGHTNESS);
        }

        // Creation des objects screenpadSlider et _screenpadToggleMenu

        // Creation du slider screenpadSlider
        this._screenpadSliderIndicator = new QuickSettings.SystemIndicator();
        this._screenpadSlider = new QuickSettingObjects.ScreenPadSlider(this._extensionObjects);

        this._screenpadSliderIndicator.quickSettingsItems.push(this._screenpadSlider);

        Main.panel.statusArea.quickSettings.addExternalIndicator(this._screenpadSliderIndicator, 2);
        Main.panel.statusArea.quickSettings.menu._grid.set_child_above_sibling(this._screenpadSlider, this.mainSlider);

        //    Creation du toggle _screenpadToggleMenu
        this._screenpadToggleMenuIndicator = new QuickSettings.SystemIndicator();
        this._screenpadToggleMenu = new QuickSettingObjects.ScreenPadToggleMenu(this._extensionObjects);

        this._screenpadToggleMenuIndicator.quickSettingsItems.push(this._screenpadToggleMenu);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._screenpadToggleMenuIndicator, 1);


        //    Creation des connexions

        // Connexion du screenpadSlider
        //    linked : Connexion screenpadSlider -> déconnexion MainSlider
        this._screenpadSliderDragBeginId = this._screenpadSlider.slider.connect('drag-begin', () => {
            // Je déconnecte _mainSliderChangedId
            this.mainSlider.slider.disconnect(this._mainSliderChangedId);
            this._mainSliderChangedId = null;
            // J'ouvre le RWstream
            if(this.SYSCLASSSTATUS == "RW")
                this._SysClassBrightnessGFileOpenStream();
        });

        this._screenpadSliderDragEndId = this._screenpadSlider.slider.connect('drag-end', () => {
            // Je ferme le RWstream
            if(this._SysClassBrightnessStream) this._SysClassBrightnessGFileCloseStream();
            // Je reconnecte _mainSliderChangedId
            this._mainSliderChangedId = this.mainSlider.slider.connect('notify::value', () => this._onMainSliderChanged() );
        });

        this._screenpadSliderChangedId = this._screenpadSlider.slider.connect('notify::value', () => this._onScreenpadSliderChanged() );


        // Connexion du main slider
        //    linked : Connexion MainSlider -> déconnexion screenpadSlider
        this._mainSliderDragBeginId = this.mainSlider.slider.connect('drag-begin', () => {
            // Je déconnecte _screenpadSliderChangedId
            this._screenpadSlider.slider.disconnect(this._screenpadSliderChangedId);
            this._screenpadSliderChangedId = null;
            // J'ouvre le RWstream en mode linked seulement :/
            if((this.SYSCLASSSTATUS == "RW") && (this._settings.get_string('screenpad-mode') == "Linked"))
                this._SysClassBrightnessGFileOpenStream();
        });

        this._mainSliderDragEndId = this.mainSlider.slider.connect('drag-end', () => {
            // Je ferme le RWstream
            if(this._SysClassBrightnessStream) this._SysClassBrightnessGFileCloseStream();
            // Je reconnecte _screenpadSliderChangedId
            this._screenpadSliderChangedId = this._screenpadSlider.slider.connect('notify::value', () => this._onScreenpadSliderChanged() );
        });

        this._mainSliderChangedId = this.mainSlider.slider.connect('notify::value', () => this._onMainSliderChanged() );


        // Connexion Toggle switch
        this._screenpadToggleSwitchId = this._screenpadToggleMenu.connect( 'clicked', () => this._onScreenPadToggleSwitchClicked() );

        this._screenpadToggleMenuId = this._settings.connect('changed::screenpad-mode', () => this._onScreenpadToggleMenuChange() );


        // initialisation du slider screenpadSlider
        // Attention: on créer un evenement slider change, mais les RWstream sont fermé

        // Ouverture du RWstream
        if(this.SYSCLASSSTATUS == "RW")
            this._SysClassBrightnessGFileOpenStream();

        // Mise à jour du slider
        this._screenpadSlider.slider.value = this._settings.get_int('screenpad-brightness')/100;
        this._settings.set_int('main-brightness', this.mainSlider.slider.value*100);

        // Fermeture du RWstram
        if(this._SysClassBrightnessStream)
            this._SysClassBrightnessGFileCloseStream();

        //    initialisation du Toggle switch
        this._screenpadToggleMenu.subtitle = this._settings.get_string('screenpad-mode');
        if (this._settings.get_string('screenpad-mode') == "Off")
            this._screenpadToggleMenu.set_checked(false);
        else this._screenpadToggleMenu.set_checked(true);
    }


    //    disable
    disableScreenpadControl() {

        // Destructions des connexions
        // Déconnexion du _screenpadSlider
        this._screenpadSlider.slider.disconnect(this._screenpadSliderDragBeginId);
        this._screenpadSlider.slider.disconnect(this._screenpadSliderDragEndId);
        this._screenpadSlider.slider.disconnect(this._screenpadSliderChangedId);

        // Déconnexion du mainSlider
        this.mainSlider.slider.disconnect(this._mainSliderDragBeginId);
        this.mainSlider.slider.disconnect(this._mainSliderDragEndId);
        this.mainSlider.slider.disconnect(this._mainSliderChangedId);

        // Déconnexion du ToggleMenu
        this._screenpadToggleMenu.disconnect(this._screenpadToggleSwitchId);
        this._settings.disconnect(this._screenpadToggleMenuId);

        // Connexion null
        this._screenpadSliderDragBeginId = null;
        this._screenpadSliderDragEndId = null;
        this._screenpadSliderChangedId = null;

        this._mainSliderDragBeginId = null;
        this._mainSliderDragEndId = null;
        this._mainSliderChangedId = null;

        this._screenpadToggleSwitchId = null;
        this._screenpadToggleMenuId = null;


        // Destruction des objects 
        // Destruction des objects quickSetting
        this._screenpadSlider?.destroy();
        this._screenpadSliderIndicator?.destroy();
        this._screenpadToggleMenu?.destroy();           // Selon GJS doc, Destroys the menu and all its items
        this._screenpadToggleMenuIndicator?.destroy();  // _forEachmenuItem.destroy(),n'est pas necessaire

        this._screenpadSlider = null;
        this._screenpadSliderIndicator = null;
        this._screenpadToggleMenu = null;
        this._screenpadToggleMenuIndicator = null;

        // Destruction des objects et autre stream Gio
        this._SysClassBrightnessGFile = null;

        // et le reste
        this._textEncoder = null;
        this._settings = null;
        this._notifSource?.destroy();
        this._notifSource = null;
    }


    // connections

    // Connection _SysClassBrightnessGFileOpenStream()
    _SysClassBrightnessGFileOpenStream(){
        if (this._SysClassBrightnessGFile.query_exists(null)) {
            try {
                this._SysClassBrightnessStream = this._SysClassBrightnessGFile.open_readwrite(null);
                this._SysClassBrightnessOutputStream = this._SysClassBrightnessStream.get_output_stream();
            }
            catch(err) {
                Main.notify( _("Error in ScreenPad Extension"), "Open _SysClassBrightnessOutputStream # " + err.message);
            }
        }
    }


    // Connection _SysClassBrightnessGFileCloseStream()
    _SysClassBrightnessGFileCloseStream() {
        try {
            this._SysClassBrightnessOutputStream.close(null);
            this._SysClassBrightnessStream.close(null);
        }
        catch(err) {
            Main.notify( _("Error in ScreenPad Extension"), "Close _SysClassBrightnessOutputStream # " + err.message);
        }
        this._SysClassBrightnessOutputStream = null;
        this._SysClassBrightnessStream = null;
    }


    // Connection _onScreenpadSliderChanged()
    _onScreenpadSliderChanged() {

        // Linked, _onMainSliderChanged() -> deconnecxion MainSliderChange dans 
        // Reconnexion _screenpadSliderDragEndId
        let screenPadMode = this._settings.get_string('screenpad-mode');
        let setScreenPadBrightness = Math.round(this._screenpadSlider.slider.value*100);

        //    0% et 100% sont réservé à off et full
        if ( setScreenPadBrightness == 0) setScreenPadBrightness = 1;
        if ( setScreenPadBrightness == 100) setScreenPadBrightness = 99;

        if (screenPadMode == "Off") {
            setScreenPadBrightness = 0;
            this._screenpadSlider.slider.value = 0;
        }

        if (screenPadMode == "Full") {
            setScreenPadBrightness = 100;
            this._screenpadSlider.slider.value = 1;
        }

        if(screenPadMode == "Linked"){
            this.mainSlider.slider.value = setScreenPadBrightness/100;
            this._settings.set_int('main-brightness', setScreenPadBrightness);
        }

        // Mise à jour du settings
        this._settings.set_int('screenpad-brightness', setScreenPadBrightness);
        // Pas de mise a jour du last mode si full ou off
        if ( setScreenPadBrightness != 0 && setScreenPadBrightness != 100)
            this._settings.set_strv ('screenpad-last-mode', [screenPadMode, setScreenPadBrightness.toString()] );

        // Ecriture dans sys/class
        if(this.SYSCLASSSTATUS == "RW") {
            if(this.setScreenPadBrightnessIsRunning == false) {
                this.setScreenPadBrightnessIsRunning = true;
                this.setScreenPadBrightnessIsRunning = this._writeOnSysClassBrightnessStream(setScreenPadBrightness);
            // WriteOnSysClassBrightnessStream est la fonction d'écriture la le fichier système
            // setScreenPadBrightnessIsRunning passe a "true" avant activation et "false au return

            }
        }
        // Petit coup de balai avant de partir
        setScreenPadBrightness = null;
        screenPadMode = null;
    }


    // Connection _onMainSliderChanged()
    _onMainSliderChanged() {
        // En mode Linked, cette fonction créer un évènement _onScreenPadSliderChanged()         
        // Le Screenpad est mis a jour par cette intermédiaire 

        let StreamManuallyOpen = false;
        let screenPadMode = this._settings.get_string('screenpad-mode');
        let MainBrightness = Math.round(this.mainSlider.slider.value*100);
        let setScreenPadBrightness = MainBrightness;

        //    0% et 100% sont réservé à off et full
        if ( setScreenPadBrightness == 0) setScreenPadBrightness = 1;
        if ( setScreenPadBrightness == 100) setScreenPadBrightness = 99;

        // Gnome peux evoyer des signaux (par exemple ALT F4 ou ALT F5 Fonction luminosité)
        // MAIS le Stream n'est pas ouvert, ouverture manuellement
        if(!this._SysClassBrightnessStream) {
            this._SysClassBrightnessGFileOpenStream();
            StreamManuallyOpen = true;
        }

        this._settings.set_int('main-brightness', MainBrightness);

        if(screenPadMode == "Linked") {
            this._screenpadSlider.slider.value = setScreenPadBrightness/100;
            this._settings.set_int('screenpad-brightness', setScreenPadBrightness);
            this._settings.set_strv ('screenpad-last-mode', [screenPadMode, setScreenPadBrightness.toString()] );
        }

        if(this.SYSCLASSSTATUS == "RW" && screenPadMode == "Linked") {
            if(this.setScreenPadBrightnessIsRunning == false) {
                this.setScreenPadBrightnessIsRunning = true;
                this.setScreenPadBrightnessIsRunning = this._writeOnSysClassBrightnessStream(MainBrightness);
            // WriteOnSysClassBrightnessStream est la fonction d'écriture la le fichier système
            // setScreenPadBrightnessIsRunning passe a "true" avant activation et "false au return
            }
        }
        //    Petit coup de balai avant de partir
        if(StreamManuallyOpen == true)
            this._SysClassBrightnessGFileCloseStream();

        StreamManuallyOpen = null;
        MainBrightness = null;
        screenPadMode = null;
        setScreenPadBrightness = null;
    }


    // Connection _onScreenPadToggleSwitchClicked()
    _onScreenPadToggleSwitchClicked() {

        let functionResult;
        let screenpadstatus = this._settings.get_boolean('screenpad-status');

        //    Check RW
        if(this.SYSCLASSSTATUS == "RW") {

            // allumage de l'écran
            if(this._screenpadToggleMenu.get_checked()) {

                // confirmation que l'écran etait bien éteint
                if (!screenpadstatus) {

                    // mise a jour en fonction du dernier enregistrement du dernier état connu
                    this._settings.set_string('screenpad-mode', this._settings.get_strv('screenpad-last-mode')[0]);
                    this._UpdateScreenPadBrightness(parseInt(this._settings.get_strv('screenpad-last-mode')[1]));

                    // puis mise à jour du background image
                    if (this._settings.get_boolean('background-activated'))
                        systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "On");

                    // Mise a jour du BLPower et du screenpad status si ok
                    functionResult = systemFileUtility.setSysClassFileValue(SysClassPaths.BL_POWER,"0")
                    if (functionResult == "ok") this._settings.set_boolean('screenpad-status', true);

                }

            // extinction de l'écran
            } else {
                // confirmation que l'écran etait bien allumé
                if (screenpadstatus) {

                    // enregistrement de l'état actuelle
                    this._settings.set_strv ( 'screenpad-last-mode', [this._settings.get_string('screenpad-mode'),this._settings.get_int('screenpad-brightness').toString() ] );

                    // mise a jour 
                    this._settings.set_string('screenpad-mode', "Off")
                    this._UpdateScreenPadBrightness(0);

                    // puis mise à jour du background image
                    if (this._settings.get_boolean('background-activated'))
                        systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "Off");

                    // Mise a jour du BLPower et du screenpad status si ok
                    functionResult = systemFileUtility.setSysClassFileValue(SysClassPaths.BL_POWER,"1");
                    if (functionResult == "ok") this._settings.set_boolean('screenpad-status', false);
                }
            }
        }else{
            Main.notify( _("Error in ScreenPad Extension"), _("One of the files") + " /sys/class/backlight/asus_screenpad/* " + _("is not accessible"));
        }

        // Petit coup de balai avant de partir
        functionResult = null;
        screenpadstatus = null;
    }


    // Connection _onScreenpadToggleMenuChange()
    _onScreenpadToggleMenuChange() {

        // Fonction appelée par la connexion settings.connect changed::screenpad-mode
        // NE PAS MODIFIER settings 'screenpad-mode' ICI POUR EVITER LA BOUCLE INFERNAL
        let functionResult;
        let screenpadmode = this._settings.get_string('screenpad-mode');

        // Mise à jour du Toggle Menu
        this._screenpadToggleMenu.subtitle = screenpadmode;
        this._screenpadToggleMenu.updateOrnamentMenuItems();

        // 4 cas de figure: Linked, Free, Off, Full
        switch (screenpadmode) {

            case "Linked":

                // changement des icons et du toggle switch
                this._screenpadToggleMenu.set_checked(true);
                this._screenpadSlider.gicon = this._screenpadSlider.giconOn;

                // La luminosité du screePad s'adapte à l'écran principale
                this._UpdateScreenPadBrightness(this._settings.get_int('main-brightness'));

                // puis mise à jour du background image (fait dans _onScreenPadToggleSwitchClicked)
                if (this._settings.get_boolean('background-activated'))
                    systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "On");

                // Mise a jour du BLPower et du screenpad status si ok
                functionResult = systemFileUtility.setSysClassFileValue(SysClassPaths.BL_POWER,"0");
                if (functionResult === "ok") this._settings.set_boolean('screenpad-status', true);

            break;

            case "Free":

                // changement des icons et du toggle switch
                this._screenpadToggleMenu.set_checked(true);
                this._screenpadSlider.gicon = this._screenpadSlider.giconOn;

                // on était off précédement on set ScreenPadBrighness
                if (this._settings.get_int('screenpad-brightness') == 0 || this._settings.get_int('screenpad-brightness') == 100)
                    this._UpdateScreenPadBrightness(parseInt(this._settings.get_strv('screenpad-last-mode')[1]));

                // puis mise à jour du background image (fait dans _onScreenPadToggleSwitchClicked)
                if (this._settings.get_boolean('background-activated'))
                    systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "On");

                //Mise a jour du BLPower et du screenpad status si ok
                functionResult = systemFileUtility.setSysClassFileValue(SysClassPaths.BL_POWER,"0");
                if (functionResult === "ok") this._settings.set_boolean('screenpad-status', true);

            break;

            case "Off":

                // changement des icons et du toggle switch
                this._screenpadToggleMenu.set_checked(false);
                this._screenpadSlider.gicon = this._screenpadSlider.giconOff;

                // La luminosité du screePad passe à 0
                this._UpdateScreenPadBrightness(0);

                // puis mise à jour du background image
                if (this._settings.get_boolean('background-activated'))
                    systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "Off");

                // Mise a jour du BLPower et du screenpad status si ok
                functionResult = systemFileUtility.setSysClassFileValue(SysClassPaths.BL_POWER,"1");
                if (functionResult === "ok") this._settings.set_boolean('screenpad-status', false);

            break;

            case "Full":
                // changement des icons et du toggle switch
                this._screenpadToggleMenu.set_checked(true);
                this._screenpadSlider.gicon = this._screenpadSlider.giconFull;

                // La luminosité du screePad passe à 235
                this._UpdateScreenPadBrightness(100);

                // puis mise à jour du background image (fait dans _onScreenPadToggleSwitchClicked)
                if (this._settings.get_boolean('background-activated'))
                    systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "On");

                //Mise a jour du BLPower et du screenpad status si ok
                functionResult = systemFileUtility.setSysClassFileValue(SysClassPaths.BL_POWER,"0");
                if (functionResult === "ok") this._settings.set_boolean('screenpad-status', true);

            break;
        }

        // enregistrement du dernier état connu sauf dans le cas de Off ou Full 
        if (screenpadmode != "Off" && screenpadmode != "Full")
            this._settings.set_strv ('screenpad-last-mode', [screenpadmode, this._settings.get_int('screenpad-brightness').toString() ] );

        // Petit coup de balai avant de partir
        functionResult = null;
    }


    // Les fonctions


    // Le Toggle switch ou le slider icon ont changés, mise à jour des luminosité et des slider
    async _UpdateScreenPadBrightness(brightnessValue) {

        // l'evenement _screenpadSliderDragBeginId n'a pas lieux! Le Stream est fermé
        // Ouverture du RWstream
        if(this.SYSCLASSSTATUS == "RW")
            this._SysClassBrightnessGFileOpenStream();

        // Mise à jour du slider
        this._screenpadSlider.slider.value = brightnessValue/100;

        // Fermeture du RWstram
        if(this._SysClassBrightnessStream)
            this._SysClassBrightnessGFileCloseStream();

        // Petit coup de balai avant de partir
        brightnessValue = null;
    }


    // écriture dans le SysClassBrightnessStream
    _writeOnSysClassBrightnessStream(finalBrightnessValue) {
        // pour certaine raison que j'ignore, le min-max de /sys/class/led...brightness est de 0 à 235
        finalBrightnessValue = Math.round(finalBrightnessValue*235/100);
        let sysClassBrightnessGuint8 = this._textEncoder.encode((finalBrightnessValue));

        // écriture dans le système
        if(this._SysClassBrightnessStream) {
            this._SysClassBrightnessOutputStream.write(sysClassBrightnessGuint8,null);
            this._SysClassBrightnessOutputStream.flush(null);
        }
        else Main.notify( _("Error in ScreenPad Extension"), "_SysClassBrightnessStream " + _("is not open"));

        //    Petit coup de balai avant de partir
        sysClassBrightnessGuint8 = null;
        finalBrightnessValue = null;
        return false;
    }

}
