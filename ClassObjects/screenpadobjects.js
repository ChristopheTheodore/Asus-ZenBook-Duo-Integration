'use strict';

//-----------------------------------------------------------------------------
//    ./ClassObjectss/quicksettingobjects.js

//    Code ecrit par Christophe Theodore
//    Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell

//    Licence : GPL-2.0, 
//        logiciel libre, vous pouvez le copier et l'utiliser librement

//    Merci à la communauté pour son aide précieuse..
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

// _______________________
// import personal objects
import * as QuickSettingObjects from './quicksettingobjects.js';

// _______________________________
// import from config (constantes)
import { SysClassPaths, GSettingsPaths } from '../Config/config.js';

// _______________________________________
// import from class (object et fonctions)
import * as systemFileUtility from './functions.js';


//-----------------------------------------------------------------------------
//    Class principale
//-----------------------------------------------------------------------------
export class screenpadControl {

//  _____________________________
    constructor(extensionObjects) {
        this._extensionObjects = extensionObjects;
    }


//  ________________________
    enableScreenpadControl() {

        // _________
        // Le setting
        this._settings = this._extensionObjects.getSettings(GSettingsPaths.SETTINGS);
        this._backgroundSetting = this._extensionObjects.getSettings(GSettingsPaths.BACKGROUND);

        // __________________________
        // Déclaration des constantes
        this.SYSCLASSSTATUS = this._settings.get_string('sys-class-led-status');

        // _________________________
        // Déclaration des Variables
        this.setScreenPadBrightnessIsRunning = false;

        // ____________________________________
        // Déclaration des objects quickSetting
        this._screenpadSliderIndicator = null;
        this._screenpadSlider = null;
        this._screenpadToggleMenuIndicator = null;
        this._screenpadToggleMenu = null;

        // __________________________
        // Déclaration des connexions
        this._screenpadSliderDragBeginId = null;
        this._screenpadSliderDragEndId = null;
        this._screenpadSliderChangedId = null;
        this._mainSliderDragBeginId = null;
        this._mainSliderDragEndId = null;
        this._mainSliderChangedId = null;
        this._screenpadToggleSwitchId = null;
        this._screenpadToggleMenuchId = null;

        // ___________________________________________
        // Déclaration des objects et autre stream Gio
        this._SysClassBrightnessGFile = null;
        this._SysClassBrightnessStream = null;
        this._SysClassBrightnessOutputStream = null;

        // ______________________________
        // et quelques petits outils util
        this._textEncoder = new TextEncoder();

        // ____________________________
        // et pour se simplifier la vie
        this.mainSlider = Main.panel.statusArea.quickSettings._brightness.quickSettingsItems[0];


//-----------------------------------------------------------------------------
//    Création du GIO File pour:
//        /sys/class/backlight/asus_screenpad/brightness.
//.       Noter que bl_power est géré dans ClassFunctions/functions.js    .
// 
//    Le Stream brightness sera ouvert en "drag-begin" et fermé en "drag-end".
//         et Seulement si sys-class-led-status est "RW".
//         en fait, la class screenpadcontrol n'est pas initiée si RW n'es pas respectée
//         Je supprimerai les tests RW dans cette class! dans les versions suivantes
//-----------------------------------------------------------------------------

        if( this.SYSCLASSSTATUS == "RW" ) {
            this._SysClassBrightnessGFile = Gio.File.new_for_path(SysClassPaths.BRIGHTNESS);
        }

        // Creation des objects screenpadSlider et _screenpadToggleMenu
        // placement dans quicksetting menu et initialisation du slider

        // __________________________________
        // Creation du slider screenpadSlider
        this._screenpadSliderIndicator = new QuickSettings.SystemIndicator();
        this._screenpadSlider = new QuickSettingObjects.ScreenPadSlider(this._extensionObjects);

        this._screenpadSliderIndicator.quickSettingsItems.push(this._screenpadSlider);

        Main.panel.statusArea.quickSettings.addExternalIndicator(this._screenpadSliderIndicator, 2);
        Main.panel.statusArea.quickSettings.menu._grid.set_child_above_sibling(this._screenpadSlider.actor, this.mainSlider);

        //    _______________________________________
        //    Creation du toggle _screenpadToggleMenu
        this._screenpadToggleMenuIndicator = new QuickSettings.SystemIndicator();
        this._screenpadToggleMenu = new QuickSettingObjects.ScreenPadToggleMenu(this._extensionObjects);

        this._screenpadToggleMenuIndicator.quickSettingsItems.push(this._screenpadToggleMenu);
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._screenpadToggleMenuIndicator, 1);


//-----------------------------------------------------------------------------
//    Creation des connexions
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
// ATTENTION :Connexion du screenpadSlider
//    Je déconnecter le MainSlider lorsque screenpadSlider est activé
//    car je créer un évenement mainSlider en mode linked..
//    le serpent se mord la queue
//-----------------------------------------------------------------------------

        // ____________________________
        // Connexion du screenpadSlider
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


//-----------------------------------------------------------------------------
// ATTENTION: Connexion du main slider
//    Je déconnecte le screenpadSlider lorsque MainSlider est activé
//    car je créer un évenement screenpadSlider en mode linked..
//    le serpent se mord la queue
//-----------------------------------------------------------------------------

        // ________________________
        // Connexion du main slider
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


        // _______________________
        // Connexion Toggle switch
        this._screenpadToggleSwitchId = this._screenpadToggleMenu.connect( 'clicked', () => this._onScreenPadToggleSwitchClicked() );

        this._screenpadToggleMenuId = this._settings.connect('changed::screenpad-mode', () => this._onScreenpadToggleMenuChange() );


        // ________________________________________
        // initialisation du slider screenpadSlider
        // et mise à jour de setting avec la valeur de main brightness
        // Attention, on créer un evenement slider change, mais les RWstream sont fermé

        // Ouverture du RWstream
        if(this.SYSCLASSSTATUS == "RW")
            this._SysClassBrightnessGFileOpenStream();

        // Mise à jour du slider
        this._screenpadSlider.slider.value = this._settings.get_int('screenpad-brightness')/100;
        this._settings.set_int('main-brightness', this.mainSlider.slider.value*100);

        // Fermeture du RWstram
        if(this._SysClassBrightnessStream)
            this._SysClassBrightnessGFileCloseStream();

        //    _______________________________
        //    initialisation du Toggle switch
        this._screenpadToggleMenu.subtitle = this._settings.get_string('screenpad-mode');
        if (this._settings.get_string('screenpad-mode') == "Off")
            this._screenpadToggleMenu.set_checked(false);
        else this._screenpadToggleMenu.set_checked(true);
    }


//-----------------------------------------------------------------------------
//    disable
//-----------------------------------------------------------------------------

//  _________________________
    disableScreenpadControl() {

//-----------------------------------------------------------------------------
//    Remember
//    Any objects or widgets created by an extension MUST be destroyed in disable().
//    This is required for approval during review!
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
//    Destructions des connexions
//-----------------------------------------------------------------------------

        // _______________________________
        // Déconnexion du _screenpadSlider
        this._screenpadSlider.slider.disconnect(this._screenpadSliderDragBeginId);
        this._screenpadSlider.slider.disconnect(this._screenpadSliderDragEndId);
        this._screenpadSlider.slider.disconnect(this._screenpadSliderChangedId);

        // _________________________
        // Déconnexion du mainSlider
        this.mainSlider.slider.disconnect(this._mainSliderDragBeginId);
        this.mainSlider.slider.disconnect(this._mainSliderDragEndId);
        this.mainSlider.slider.disconnect(this._mainSliderChangedId);

        // _________________________
        // Déconnexion du ToggleMenu
        this._screenpadToggleMenu.disconnect(this._screenpadToggleSwitchId);
        this._settings.disconnect(this._screenpadToggleMenuId);

        // ______________
        // Connexion null
        this._screenpadSliderDragBeginId = null;
        this._screenpadSliderDragEndId = null;
        this._screenpadSliderChangedId = null;

        this._mainSliderDragBeginId = null;
        this._mainSliderDragEndId = null;
        this._mainSliderChangedId = null;

        this._screenpadToggleSwitchId = null;
        this._screenpadToggleMenuId = null;


//-----------------------------------------------------------------------------
//    Destruction des objects 
//-----------------------------------------------------------------------------

        // ____________________________________
        // Destruction des objects quickSetting
        this._screenpadSlider?.destroy();
        this._screenpadSliderIndicator?.destroy();
        this._screenpadToggleMenu?.destroy();           // Selon GJS doc, Destroys the menu and all its items
        this._screenpadToggleMenuIndicator?.destroy();  // _forEachmenuItem.destroy(),n'est pas necessaire

        this._screenpadSlider = null;
        this._screenpadSliderIndicator = null;
        this._screenpadToggleMenu = null;
        this._screenpadToggleMenuIndicator = null;

        // ___________________________________________
        // Destruction des objects et autre stream Gio
        //this._SysClassBrightnessGFile?.destroy();     // c'est un Gio.File.new_for_path, pas un new ...

        this._SysClassBrightnessGFile = null;
        //this._SysClassBrightnessStream = null;        // null dans _SysClassBrightnessGFileCloseStream()
        //this._SysClassBrightnessOutputStream = null;  // null dans _SysClassBrightnessGFileCloseStream()

        // ___________
        // et le reste
        //this._textEncoder?.destroy();                 // retourne : this._textEncoder is not a function (à clarifier)
        this._textEncoder = null;
        this._settings = null;

        // _________________________________
        // utilisé parfois pour le débeugage
        this._notifSource?.destroy();
        this._notifSource = null;

    }


//-----------------------------------------------------------------------------
//    Ici, je commence à traiter les connections
//-----------------------------------------------------------------------------

    // _______________________________________________
    // Connection _SysClassBrightnessGFileOpenStream()
    _SysClassBrightnessGFileOpenStream(){
        if (this._SysClassBrightnessGFile.query_exists(null)) {
            try {
                this._SysClassBrightnessStream = this._SysClassBrightnessGFile.open_readwrite(null);
                this._SysClassBrightnessOutputStream = this._SysClassBrightnessStream.get_output_stream();
            }
            catch(err) {
                //this._showNotification('Erreur','Open _SysClassBrightnessOutputStream # ' + err);
                Main.notify( _("Erreur dans Screenpad Exension"), "Open _SysClassBrightnessOutputStream # " + err.message);
            }
        }
    }


    // ________________________________________________
    // Connection _SysClassBrightnessGFileCloseStream()
    _SysClassBrightnessGFileCloseStream() {
        try {
            this._SysClassBrightnessOutputStream.close(null);
            this._SysClassBrightnessStream.close(null);
        }
        catch(err) {
            //this._showNotification('Erreur','Close _SysClassBrightnessOutputStream # ' + err);
            Main.notify( _("Erreur dans Screenpad Exension"), "Close _SysClassBrightnessOutputStream # " + err.message);
        }
        this._SysClassBrightnessOutputStream = null;
        this._SysClassBrightnessStream = null;
    }


    // _____________________________________
    // Connection _onScreenpadSliderChanged()
    _onScreenpadSliderChanged() {

//-----------------------------------------------------------------------------
//         ATTENTION
//         En mode Linked, cette fonction créer un évènement _onMainSliderChanged()             
//         POUR EVITER LES BOUCLES FOLLES, j'ai DECONNECTE MainSliderChange dans 
//        la fonction _screenpadSliderDragBeginId et reconnecté en _screenpadSliderDragEndId
//-----------------------------------------------------------------------------

        let SetScreenPadBrightness = Math.round(this._screenpadSlider.slider.value*100);

        if (this._settings.get_string('screenpad-mode') == "Off") {
            SetScreenPadBrightness = 0;
            this._screenpadSlider.slider.value = 0;
        }

        if (this._settings.get_string('screenpad-mode') == "Full") {
            SetScreenPadBrightness = 100;
            this._screenpadSlider.slider.value = 1;
        }

        this._settings.set_int('screenpad-brightness', SetScreenPadBrightness);

        if(this._settings.get_string('screenpad-mode') == "Linked"){
            this.mainSlider.slider.value = SetScreenPadBrightness/100;
            this._settings.set_int('main-brightness', SetScreenPadBrightness);
        }

        if(this.SYSCLASSSTATUS == "RW") {
            if(this.setScreenPadBrightnessIsRunning == false) {
                this.setScreenPadBrightnessIsRunning = true;
                this.setScreenPadBrightnessIsRunning = this._writeOnSysClassBrightnessStream(SetScreenPadBrightness);

//-----------------------------------------------------------------------------
// ATTENTION: WriteOnSysClassBrightnessStream est la fonction d'écriture la le fichier système
//    Je ne veux PAS voir cette fonction tourner DEUX fois en meme temps
//    setScreenPadBrightnessIsRunning passe a "true" avant activation et "false au return
//-----------------------------------------------------------------------------
            }
        }
        // Petit coup debalai avant de partir
        SetScreenPadBrightness = null;
    }


    // _________________________________
    // Connection _onMainSliderChanged()
    _onMainSliderChanged() {
        // ---------------------------------------------------------------------------------------------
        //         ATTENTION
        //         En mode Linked, cette fonction créer un évènement _onScreenPadSliderChanged()         
        //         Le Screenpad est mis a jour par cette intermédiaire 
        //----------------------------------------------------------------------------------------------

        // ---------------------------------------------------------------------------------------------
        //         ATTENTION
        //         Gnome peux evoyer des signaux (par exemple ALT F4 ou ALT F5 Fonction luminosité)     
        //         MAIS dans ces cas, _SysClassBrightnessStream n'est pas ouvert!                 
        //         j'ouvre manuellement, mais il faudra à le refermer.                             
        //----------------------------------------------------------------------------------------------

        let StreamManuallyOpen = false;
        if(!this._SysClassBrightnessStream) {
            this._SysClassBrightnessGFileOpenStream();
            StreamManuallyOpen = true;
        }

        // début de la procédure
        let MainBrightness = Math.round(this.mainSlider.slider.value*100);

        this._settings.set_int('main-brightness', MainBrightness);
        if(this._settings.get_string('screenpad-mode') == "Linked") {
            this._screenpadSlider.slider.value = MainBrightness/100;
            this._settings.set_int('screenpad-brightness', MainBrightness);
        }

        if(this.SYSCLASSSTATUS == "RW" && this._settings.get_string('screenpad-mode') == "Linked") {
            if(this.setScreenPadBrightnessIsRunning == false) {
                this.setScreenPadBrightnessIsRunning = true;
                this.setScreenPadBrightnessIsRunning = this._writeOnSysClassBrightnessStream(MainBrightness);

//-----------------------------------------------------------------------------
// ATTENTION: WriteOnSysClassBrightnessStream est la fonction d'écriture la le fichier système
//    Je ne veux PAS voir cette fonction tourner DEUX fois en meme temps
//    setScreenPadBrightnessIsRunning passe a "true" avant activation et "false au return
//-----------------------------------------------------------------------------
            }
        }
        //    Petit coup debalai avant de partir
        if(StreamManuallyOpen == true)
            this._SysClassBrightnessGFileCloseStream();

        StreamManuallyOpen = null;
        MainBrightness = null;
    }


    // ____________________________________________
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

                    // mise a jour de screenpad mode
                    // en fonction du dernier enregistrement du dernier état connu
                    this._settings.set_string('screenpad-mode', this._settings.get_strv('screenpad-last-mode')[0]);

                    // mise a jour de screenpad value
                    // en fonction du dernier enregistrement du dernier état connu
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

                    // mise a jour de screenpad mode
                    this._settings.set_string('screenpad-mode', "Off")

                    // La luminosité du screePad passe à 0
                    // la commande d'extinction se fait avec bl_power
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
            Main.notify( _("Erreur dans Screenpad Exension"), _("Un des fichiers /sys/class/backlight/asus_screenpad/* n'est pas accessible"));
        }

        // Petit coup debalai avant de partir
        functionResult = null;
        screenpadstatus = null;
    }


    // ___________________________________________
    // Connection _onScreenpadToggleMenuChange()
    _onScreenpadToggleMenuChange() {

//-----------------------------------------------------------------------------
// ATTENTION
//    Cette fonction est appelée par la connexion settings.connect changed::screenpad-mode
//    NE PAS MODIFIER settings 'screenpad-mode' ICI POUR EVITER LA BOUCLE INFERNAL
//-----------------------------------------------------------------------------

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
                //this._screenpadSlider._icon.iconName = 'input-tablet-symbolic-off';
                this._screenpadSlider.gicon = this._screenpadSlider.giconOn;

                // La luminosité du screePad s'adapte à l'écran principale
                this._UpdateScreenPadBrightness(this._settings.get_int('main-brightness'));

                // puis mise à jour du background image
                // deja fait dans _onScreenPadToggleSwitchClicked
                if (this._settings.get_boolean('background-activated'))
                    systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "On");

                // Mise a jour du BLPower et du screenpad status si ok
                functionResult = systemFileUtility.setSysClassFileValue(SysClassPaths.BL_POWER,"0");
                if (functionResult === "ok") this._settings.set_boolean('screenpad-status', true);

            break;

            case "Free":

                // changement des icons et du toggle switch
                this._screenpadToggleMenu.set_checked(true);
                //this._screenpadSlider._icon.iconName = 'input-tablet-symbolic';
                this._screenpadSlider.gicon = this._screenpadSlider.giconOn;
//                //this._screenpadSlider.reactive = true;

                // on était off précédement on set ScreenPadBrighness
                if (this._settings.get_int('screenpad-brightness') == 0)
                    this._UpdateScreenPadBrightness(parseInt(this._settings.get_strv('screenpad-last-mode')[1]));

                // puis mise à jour du background image
                // deja fait dans _onScreenPadToggleSwitchClicked
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
                // this._screenpadSlider.slider.reactive = false;

                // La luminosité du screePad passe à 0
                // et le cas éventuel, mise à jour des backgounds
                // _UpdateScreenPadBrightness(0) n,etteint plus l,ecran
                // la commande d,extinction se fait avec bl_power
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
                // this._screenpadSlider.reactive = false;

                // La luminosité du screePad passe à 235
                // et le cas éventuel, mise à jour des backgounds
                this._UpdateScreenPadBrightness(100);

                // puis mise à jour du background image
                // deja fait dans _onScreenPadToggleSwitchClicked
                if (this._settings.get_boolean('background-activated'))
                    systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "On");

                //Mise a jour du BLPower et du screenpad status si ok
                functionResult = systemFileUtility.setSysClassFileValue(SysClassPaths.BL_POWER,"0");
                if (functionResult === "ok") this._settings.set_boolean('screenpad-status', true);

            break;
        }

        // enregistrement du dernier état connu
        // sauf dans le cas de Off
        if (screenpadmode != "Off")
            this._settings.set_strv ('screenpad-last-mode', [screenpadmode, this._settings.get_int('screenpad-brightness').toString() ] );

        // Petit coup debalai avant de partir
        functionResult = null;
    }


//-----------------------------------------------------------------------------
//    Ici, je commence à traiter les fonctions
//-----------------------------------------------------------------------------


// ______________________________________________
// Le Toggle switch ou le slider icon ont changés
// mise à jour des luminosité et des slider
    async _UpdateScreenPadBrightness(brightnessValue) {

//-----------------------------------------------------------------------------
// ATTENTION: l'evenement _screenpadSliderDragBeginId n'a pas lieux!,
//    Le RW Stream n'est pas ouvert
//        Ouverture manuel du stream
//        _onScreenpadSliderChanged() s'occupe de l'écriture
//-----------------------------------------------------------------------------

        // Ouverture du RWstream
        if(this.SYSCLASSSTATUS == "RW")
            this._SysClassBrightnessGFileOpenStream();

        // Mise à jour du slider
        this._screenpadSlider.slider.value = brightnessValue/100;

        // Fermeture du RWstram
        if(this._SysClassBrightnessStream)
            this._SysClassBrightnessGFileCloseStream();

        // __________________________________
        // Petit coup debalai avant de partir
        brightnessValue = null;
    }


// _________________________________________
// écriture dans le SysClassBrightnessStream
// deux fonction seulement on acces ici:
// _onMainSliderChange et _onScreenpad SliderChange

    _writeOnSysClassBrightnessStream(finalBrightnessValue) {
        // pour certaine raison que j'ignore, le min-max de /sys/class/led...brightness est de 0 à 235
        finalBrightnessValue = Math.round(finalBrightnessValue*235/100);
        let sysClassBrightnessGuint8 = this._textEncoder.encode((finalBrightnessValue));

        // Dernière vérification de l'existance de _SysClassBrightnessStream
        // et écriture dans le système
        if(this._SysClassBrightnessStream) {
            this._SysClassBrightnessOutputStream.write(sysClassBrightnessGuint8,null);
            this._SysClassBrightnessOutputStream.flush(null);
        }
        else Main.notify( _("Erreur dans Screenpad Exension"), "_SysClassBrightnessStream n est pas ouvert");

        //    Petit coup debalai avant de partir
        sysClassBrightnessGuint8 = null;
        finalBrightnessValue = null;
        return false;
    }


//-----------------------------------------------------------------------------
//    La fin
//-----------------------------------------------------------------------------
}
