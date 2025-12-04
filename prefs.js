'use strict';

//-----------------------------------------------------------------------------
//    ./prefs.js

//    This extension is not affiliated, funded,or in any way associated with Asus.
//    Code ecrit par Christophe Theodore
//    Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell

//    Licence : GPL-2.0, 
//        logiciel libre, vous pouvez le copier et l'utiliser librement

//    Merci à la communauté pour son aide précieuse..

// ----------------------------------------------------------------------------
//    Merci à Aryan Kaushik
//    https://github.com/Aryan20/Logomenu
//    Qui m'a beaucoup inspiré pour l'écriture de ce code
//-----------------------------------------------------------------------------


// _______________
// import from 'gi
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';

// ____________________________
// import from org/gnome/shell/
import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

// _______________________________
// import from config (constantes)
import { SysClassPaths, GSettingsPaths } from './Config/config.js';


// ________________
// Class Principale
export default class zenBookDuoIntegration extends ExtensionPreferences {
    fillPreferencesWindow(window) {

        // ______________________
        // Declaration du setting
        window._settings = this.getSettings(GSettingsPaths.SETTINGS);

        // __________________
        // Création des pages
        const SCREENPADPAGE = new screenpadPage(window._settings, this.path);
        const ASUSRULESPAGE = new zenBookDuoRules();
        const ABOUTPAGE = new zenBookDuoAbout(window.metadata, this.path);

        window.add(SCREENPADPAGE);
        window.add(ASUSRULESPAGE);
        window.add(ABOUTPAGE);
    }
}


// ___________________
// Class screenpadPage
const screenpadPage = GObject.registerClass(class screenpadPage extends Adw.PreferencesPage {
    _init(settings, path) {

        // ____
        // init
        super._init({
            title: _("Screenpad"),
            icon_name: 'display-symbolic',
        });
        this._settings = settings;
        this._path = path;

        // Créations des Icones
        this.giconOff = Gtk.Image.new_from_file(this._path + '/Media/input-tablet-symbolic-off-pref.svg');
        this.giconOn = Gtk.Image.new_from_file(this._path + '/Media/input-tablet-symbolic-on-pref.svg');
        this.giconFree = Gtk.Image.new_from_file(this._path + '/Media/input-tablet-symbolic-free-pref.svg');
        this.giconDesactivated = Gtk.Image.new_from_file(this._path + '/Media/input-tablet-symbolic-desactivated-pref.svg');
        this.gicon = this.giconDesactivated;

        // Création des trois groupes
        const ActiverPreferencesGroup = new Adw.PreferencesGroup({ title: _("Enable ScreenPad functions"), });
        const voirPreferencesGroup = new Adw.PreferencesGroup({ title: _("View Settings"), });
        const changePreferencesGroup = new Adw.PreferencesGroup({ title: _("Manage Backgrounds"), });


        // _____________________________
        // GROUPE1 - activer la fonction
        const activateScreenPadExtension = this._settings.get_boolean('screenpad-extension-activated');

        const activateScreenPadExtensionRow = new Adw.SwitchRow({ title: _("Enable ScreenPad sliders"), });
        activateScreenPadExtensionRow.set_active (activateScreenPadExtension);

        activateScreenPadExtensionRow.connect('notify::active', ()=> {
            this._settings.set_boolean('screenpad-extension-activated', activateScreenPadExtensionRow.get_active());
            this.changeGicon();
            if (activateScreenPadExtensionRow.get_active() == false) {
                changePreferencesGroup.sensitive = false;
                autoAdjustScreenPadRow.sensitive = false;

            } else {
                changePreferencesGroup.sensitive = true;
                autoAdjustScreenPadRow.sensitive = true;
            }
        } );

        const autoAdjustScreenPad = this._settings.get_boolean('screenpad-auto-adjust');

        const autoAdjustScreenPadRow = new Adw.SwitchRow({ title: _("If off, turn on the ScreenPad at startup"), });
        autoAdjustScreenPadRow.set_active (autoAdjustScreenPad);

        autoAdjustScreenPadRow.connect('notify::active', ()=> {
            this._settings.set_boolean('screenpad-auto-adjust', autoAdjustScreenPadRow.get_active());
        } );

        // ________________________
        // GROUPE2 - voir le status
        this.voirTitreRow = new Adw.ActionRow();

        // décoration
        this.voirTitreRow.add_suffix(this.gicon);

        // Connexions
        this._settings.connect('changed::screenpad-brightness', () => this.changeSubtitle() );
        this._settings.connect('changed::main-brightness', () => this.changeSubtitle() );
        this._settings.connect('changed::screenpad-mode', () => this.changeGicon() );


        // ____________________
        // GROUPE3 - Background

        // ActivateBackGroundSwitch
        const activateBackGroundValue = this._settings.get_boolean('background-activated');

        // Décorations
        const backGroundControlRow = new Adw.SwitchRow( {
            title: _("Enable background effects"),
            subtitle: _("ScreenPad functions must be active"),
            active: activateBackGroundValue
        });
        backGroundControlRow.set_active (activateBackGroundValue);

        // Connections
        backGroundControlRow.connect('notify::active',()=> {
            this._settings.set_boolean('background-activated', backGroundControlRow.get_active())
            if(backGroundControlRow.get_active()) {
                backgroundImageOnRow.sensitive=true;
                backgroundImageOffRow.sensitive=true;
            } else {
                backgroundImageOnRow.sensitive=false;
                backgroundImageOffRow.sensitive=false;
            }
        } );

        // Background Image on
        const backgroundImageOn = this._settings.get_string('background-image-on');
        const backgroundImageOnRow = new Adw.EntryRow({ title: _("Background Image On"), });
        // Décoration
        backgroundImageOnRow.set_text(backgroundImageOn);
        // Connections
        backgroundImageOnRow.connect('changed', () => {
            this._settings.set_string('background-image-on', backgroundImageOnRow.get_text()); 
        } );

        // ____________________
        // Background Imege off
        const backgroundImageOff = this._settings.get_string('background-image-off');
        const backgroundImageOffRow = new Adw.EntryRow({title: _("Background Image Off"),});
        // Décoration
        backgroundImageOffRow.set_text(backgroundImageOff);
        // Connections
        backgroundImageOffRow.connect('changed', () => {
            this._settings.set_string('background-image-off', backgroundImageOffRow.get_text()); 
        } );

        // ____________________
        // Je garni les groupes
        ActiverPreferencesGroup.add(activateScreenPadExtensionRow);
        ActiverPreferencesGroup.add(autoAdjustScreenPadRow);

        voirPreferencesGroup.add(this.voirTitreRow);

        changePreferencesGroup.add(backGroundControlRow);
        changePreferencesGroup.add(backgroundImageOnRow);
        changePreferencesGroup.add(backgroundImageOffRow);

        // _____________________
        // Je garni les fenetres
        this.add(ActiverPreferencesGroup);
        this.add(voirPreferencesGroup);
        this.add(changePreferencesGroup);

        // je mets a jour les décorations
        this.changeSubtitle();
        this.changeGicon();
    }


// ----------------------------------------------------------------------------
//    Ici, je commence à traiter les texts
// ----------------------------------------------------------------------------

// ________________
// changeSubtitle()
    changeSubtitle() {
        this.voirTitreRow.subtitle =
            '/sys/class/led status \t\t \t : \t\t' + this._settings.get_string('sys-class-led-status') + '\n' +
            'main screen Brightess (%) \t \t : \t\t' + this._settings.get_int('main-brightness').toString() + '\n' +
            'screenPad Value (%) - Mode \t : \t\t' + this._settings.get_int('screenpad-brightness').toString() + '\t\t' +
                this._settings.get_string('screenpad-mode') + '\t\t' +
                this._settings.get_boolean('screenpad-status') + '\n' +
            'Last Value (%) - Mode \t \t \t : \t\t' + this._settings.get_strv('screenpad-last-mode')[1] + '\t\t' +
                this._settings.get_strv('screenpad-last-mode')[0];
    }


    // _____________
    // changeGicon()
    changeGicon() {
        // choix de l'icone
        this.voirTitreRow.remove(this.gicon);
        if (this._settings.get_string('screenpad-mode') == 'Free' || this._settings.get_string('screenpad-mode') == 'Linked')
            this.gicon = this.giconFree;
        if (this._settings.get_string('screenpad-mode') == 'Off')
            this.gicon = this.giconOff;
        if (this._settings.get_string('screenpad-mode') == 'Full')
            this.gicon = this.giconOn;
        if (this._settings.get_boolean('screenpad-extension-activated') == false)
            this.gicon = this.giconDesactivated;

        // affichage de l'icone
        this.gicon.set_pixel_size(38);
        this.voirTitreRow.add_suffix(this.gicon);
    }
});


// _____________________
// Class zenBookDuoRules
const zenBookDuoRules = GObject.registerClass(class zenBookDuoRules extends Adw.PreferencesPage {
    _init() {
        super._init({
             title: _("Requirements"),
            icon_name: 'info-symbolic',
        });

        // _______________________
        // minimumTextPreferencesGroup
        const minimumTextPreferencesGroup = new Adw.PreferencesGroup({
        })

        // Row Minimum Requis
        const ModuleActionRow = new Adw.ActionRow({
            title: _("Minimum Requirements"),
        })
        ModuleActionRow.subtitle = this._minimumRequierement();

        // Row udev/rules
        const RegleInitialActionRow = new Adw.ActionRow({
            title: "udev/rules \n\n\t" + _("Read the readme file for more information"),
        })
        RegleInitialActionRow.subtitle = this._minimumRules();

        // ____________________
        // Je garni les groupes
        minimumTextPreferencesGroup.add(ModuleActionRow);
        minimumTextPreferencesGroup.add(RegleInitialActionRow);

        // _____________________
        // Je garni les fenetres
        this.add(minimumTextPreferencesGroup);
    }


// ----------------------------------------------------------------------------
//    Ici, je commence à traiter les texts
// ----------------------------------------------------------------------------

    // ____________________
    // _minimumRequierement
    _minimumRequierement() {

        const minimumRequierement =
            "\n"
            + "<b>" + _("This extension requires:") + "</b>\n"
            + "\t• " + _("A Linux kernel ≥ 6.5") + "\n"
            + "\t• " + _("GNOME Shell ≥ 45") + "\n\n"
            + "<b>" + _("Check your version with:") + "</b>\n"
            + "\t• uname -r " + _("for the kernel") + "\n"
            + "\t• gnome-shell --version " + _("for GNOME")
            + "\n";
        return minimumRequierement;
    }

    // _____________
    // _minimumRules
    _minimumRules() {

        const minimumRules =
            "\n"
            + "<b>" + _("This extension needs read and write access to:") + "</b>\n"
            + "\t• /sys/class/backlight/asus_screenpad/brightness\n"
            + "\t• /sys/class/backlight/asus_screenpad/bl_power\n\n"
            + "<b>" + _("Create a file") + " /etc/udev/rules.d/99-asus.rules " + _("with this content:") + "</b>\n"
            + "\t# Règles pour Asus ScreenPad\n"
            + "\tACTION==\"add\", SUBSYSTEM==\"backlight\", KERNEL==\"asus_screenpad\", \\\n"
            + "\t\tRUN+=\"/bin/chmod a+w /sys/class/backlight/asus_screenpad/brightness\"\n"
            + "\tACTION==\"add\", SUBSYSTEM==\"backlight\", KERNEL==\"asus_screenpad\", \\\n"
            + "\t\tRUN+=\"/bin/chmod a+w /sys/class/backlight/asus_screenpad/bl_power\"\n\n"
            + "<b>" + _("Then restart your session or reload the rules with:") + "</b>\n"
            + "\tsudo udevadm control --reload-rules";
        return minimumRules
    }

});


// _____________________
// Class zenBookDuoAbout
 const zenBookDuoAbout = GObject.registerClass(class zenBookDuoAbout extends Adw.PreferencesPage {
    _init(metadata, path) {
        super._init({
             title: _("About"),
            icon_name: 'emoji-people-symbolic',
        });

        this._path = path;
        this.giconFree = Gtk.Image.new_from_file(this._path + '/Media/input-tablet-symbolic-free-pref.svg');
        this.giconFree.set_pixel_size(100);


        // __________________________
        // AboutTitrePreferencesGroup
        const AboutTitrePreferencesGroup = new Adw.PreferencesGroup();

        const AboutTitrePrincipaleBox = new Gtk.Box({
            orientation: Gtk.Orientation.HORIZONTAL,
            spacing: 75,
        });

        const AboutTitreImageBox = new Gtk.Box();
        AboutTitreImageBox.append(this.giconFree);

        const AboutTitreNameBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
        });

        const AboutTitreLabel = new Gtk.Label({
            label: '<span size="large"><b> Asus ZenBook Duo Integration</b></span>',
            use_markup: true,
            halign: Gtk.Align.START,
        });

        const AboutDescriptionLabel = new Gtk.Label({
            label: _("Integration of screenpad functions into the Gnome desktop") ,
            vexpand: true,
            halign: Gtk.Align.START,
        });

        // On mélange les boites
        AboutTitreNameBox.append(AboutTitreLabel);
        AboutTitreNameBox.append(AboutDescriptionLabel);

        AboutTitrePrincipaleBox.append(AboutTitreImageBox);
        AboutTitrePrincipaleBox.append(AboutTitreNameBox);

        // Et hope on foure tout dans le groupe
        AboutTitrePreferencesGroup.add(AboutTitrePrincipaleBox);

        this.add(AboutTitrePreferencesGroup);


        // _________________________
        // AboutTextPreferencesGroup
        const AboutTextPreferencesGroup = new Adw.PreferencesGroup()

        const AuteurActionRow = new Adw.ActionRow({
            title: _("This extension is not affiliated, funded,or in any way associated with Asus.") + "\n\n" + _("Author"),
        })
        AuteurActionRow.subtitle = this._auteurText();

        const ProjetInitialActionRow = new Adw.ActionRow({
            title: _("Initial project"),
        })
        ProjetInitialActionRow.subtitle = this._projetInitialText();

        const LicenceRow = new Adw.ActionRow({
            title: 'Licence',
        })
        LicenceRow.subtitle = this._licenceText();

        AboutTextPreferencesGroup.add(AuteurActionRow);
        AboutTextPreferencesGroup.add(ProjetInitialActionRow);
        AboutTextPreferencesGroup.add(LicenceRow);

        this.add(AboutTextPreferencesGroup);

        //    _________________________
        //    AboutTextPreferencesGroup
        const GarantieLabel = _("This software is provided WITHOUT ANY WARRANTY.");
        const urlLabel =  _("Voir la %sLicence Publique Générale GNU%s pour plus de détails.")
            .format('<a href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.fr.html">', '</a>');

        const gnuSoftwareGroup = new Adw.PreferencesGroup();
        const gnuSofwareLabel = new Gtk.Label({
            label: `<span size="small">${GarantieLabel}\n${urlLabel}</span>`,
            use_markup: true,
            justify: Gtk.Justification.CENTER,
        });

        gnuSoftwareGroup.add(gnuSofwareLabel);
        this.add(gnuSoftwareGroup);
    }


// ----------------------------------------------------------------------------
//    Ici, je commence à traiter les texts
// ----------------------------------------------------------------------------

 // ___________
    // _auteurText
    _auteurText () {
        const auteurText =
            _("Code written by") + " Christophe Théodore:\t(mission_theodore@hotmail.com)\n"
            + _("With help from the community.") +"\n\n"
            + _("Many thanks to the developers, who unknowingly helped me achieve this result.");
        return auteurText;
    }

    // ______________
    // _projetInitial
    _projetInitialText () {
        const projetInitialText =
            _("A first version of Asus integration was written by") + " jibsaramnim " + _("and") + " lunaneff.\n"
            + "https://github.com/lunaneff/gnome-shell-extension-zenbook-duo\n\n"
            + _("I was inspired by the idea to create this extension, I thank the authors.")
            + "\n";
        return projetInitialText;
    }

    // ____________
    // _licenceText
    _licenceText () {
        const licenceText =
            _("Free software under the GPL-2.0+ license") + "\n\n"
            + _("You are free to:") + "\n"
            + "\t• " + _("Use, study, and share this software") + "\n"
            + "\t• " + _("Modify it to suit your needs") +"\n"
            + "\t• " + _("Redistribute your modifications");
        return licenceText;
    }

});

