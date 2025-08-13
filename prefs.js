'use strict';

		// ------------------------------------------------------------------------------------- //
		// 		./prefs.js																		 //
		// 																						 //
		// 		Code ecrit par Christophe Theodore												 //
		// 		Licence : GPL-2.0, logiciel libre, vous pouvez le copier et l'utiliser librement //
		// 		Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell				 //
		// 		Merci à la communauté pour les bouts de codes pèché ici et la.					 //
		//-------------------------------------------------------------------------------------- //


		// -------------------------------------------------------------------------------------------- //
		// 		Merci à Aryan Kaushik																	//
		// 		https://github.com/Aryan20/Logomenu														//
		// 		Qui m'a beaucoup inspiré pour l'écriture de ce code										//
		//--------------------------------------------------------------------------------------------- //


//	_______________
//	import from 'gi
import Gtk 										from 'gi://Gtk';
import Adw 										from 'gi://Adw';
import GObject 									from 'gi://GObject';

//	____________________________
//	import from org/gnome/shell/
import {ExtensionPreferences, gettext as _} 	from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';


//	________________
//	Class Principale
export default class zenBookDuoIntegration extends ExtensionPreferences {
	fillPreferencesWindow(window) {

//	__________________________
//	Declaration des constantes

		//	______________________
		//	Declaration du setting
		window._settings 						= this.getSettings('org.gnome.shell.extensions.zen-book-duo-integration');

		//window.search_enabled 				= true;

		//	__________________
		//	Création des pages
		const SCREENPADPAGE 					= new screenpadPage(window._settings, this.path);
		const ASUSRULESPAGE 					= new zenBookDuoRules();
		const ABOUTPAGE 						= new zenBookDuoAbout(window.metadata, this.path);

		window.add(SCREENPADPAGE);
		window.add(ASUSRULESPAGE);
		window.add(ABOUTPAGE);
	}
}


//	___________________
//	Class screenpadPage
const screenpadPage = GObject.registerClass(class screenpadPage extends Adw.PreferencesPage {
	_init(settings, path) {

		//	____
		//	init
		super._init({
		title: _("Screenpad"),
		icon_name: 'input-tablet-symbolic',
		});
		this._settings 							= settings;
		this._path 								= path;

		// Créations des Icones
		this.giconOff 							= Gtk.Image.new_from_file(this._path + '/Media/input-tablet-symbolic-off-pref.svg');
		this.giconOn 							= Gtk.Image.new_from_file(this._path + '/Media/input-tablet-symbolic-on-pref.svg');
		this.giconFree 							= Gtk.Image.new_from_file(this._path + '/Media/input-tablet-symbolic-free-pref.svg');
		this.giconDesactivated					= Gtk.Image.new_from_file(this._path + '/Media/input-tablet-symbolic-desactivated-pref.svg');
		this.gicon								= this.giconDesactivated;


		// Création des trois groupes
		const ActiverPreferencesGroup 			= new Adw.PreferencesGroup({ title: _("Activer les fonctions du screenpad"), });
		const voirPreferencesGroup 				= new Adw.PreferencesGroup({ title: _("Voir les Parametres"), });
		const changePreferencesGroup 			= new Adw.PreferencesGroup({ title: _("Gérer les Background"), });


		//	_____________________________
		//	GROUPE1 - activer la fonction
		const activateScreenPadExtension 		= this._settings.get_boolean('screenpad-extension-activated');

		const activateScreenPadExtensionRow 	= new Adw.SwitchRow({ title: _('Active les slider du screenpad'), });
		activateScreenPadExtensionRow.set_active (activateScreenPadExtension);

		activateScreenPadExtensionRow.connect('notify::active',	
				()=>{ 
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

		const autoAdjustScreenPad 				= this._settings.get_boolean('screenpad-auto-adjust');
		
		const autoAdjustScreenPadRow 			= new Adw.SwitchRow({ title: _("Si éteind, Alume le screenpad au démarrage"), });
		autoAdjustScreenPadRow.set_active (autoAdjustScreenPad);

		autoAdjustScreenPadRow.connect('notify::active',	
				()=>{ 
						this._settings.set_boolean('screenpad-auto-adjust', autoAdjustScreenPadRow.get_active());
					} );

		//	______________________
		//GROUPE2 - voir le status
		this.voirTitreRow 						= new Adw.ActionRow();

		// décoration
		this.voirTitreRow.add_suffix(this.gicon);

		// Connexions
		this._settings.connect('changed::screenpad-brightness', 		() => this.changeSubtitle() );
		this._settings.connect('changed::main-brightness', 				() => this.changeSubtitle() );
		this._settings.connect('changed::screenpad-mode', 				() => this.changeGicon() );


		//	___________________
		// GROUPE3 - Background

		//	ActivateBackGroundSwitch
		const activateBackGroundValue 			= this._settings.get_boolean('background-activated');

		// Décorations
		const backGroundControlRow 				= new Adw.SwitchRow({ 	title: _("Activer les effets background"),
																		subtitle: _("Les fonctions du screenpad doivent etre actives"),
																		active: activateBackGroundValue});
		backGroundControlRow.set_active (activateBackGroundValue);

		// Connections
		backGroundControlRow.connect('notify::active',	
				()=> {	this._settings.set_boolean('background-activated', backGroundControlRow.get_active())
						if(backGroundControlRow.get_active()) {
							backgroundImageOnRow.sensitive=true;
							backgroundImageOffRow.sensitive=true;
						} else {
							backgroundImageOnRow.sensitive=false;
							backgroundImageOffRow.sensitive=false;
						}
					} );

		// Background Image on
		const backgroundImageOn 				= this._settings.get_string('background-image-on');
		const backgroundImageOnRow 				= new Adw.EntryRow({ title: _('Background Image On'), });
		// Décoration
		backgroundImageOnRow.set_text(backgroundImageOn);
		// Connections
		backgroundImageOnRow.connect('changed', () 	=> { this._settings.set_string('background-image-on', backgroundImageOnRow.get_text()); });

		//	____________________
		//	Background Imege off
		const backgroundImageOff 				= this._settings.get_string('background-image-off');
		const backgroundImageOffRow 			= new Adw.EntryRow({ 	title: _("Background Image Off"),});
		// Décoration
		backgroundImageOffRow.set_text(backgroundImageOff);
		// Connections
		backgroundImageOffRow.connect('changed', () 	=> { this._settings.set_string('background-image-off', backgroundImageOffRow.get_text()); });


		//	____________________
		//	Je garni les groupes
		ActiverPreferencesGroup.add(activateScreenPadExtensionRow);
		ActiverPreferencesGroup.add(autoAdjustScreenPadRow);
		
		voirPreferencesGroup.add(this.voirTitreRow);

		changePreferencesGroup.add(backGroundControlRow);
		changePreferencesGroup.add(backgroundImageOnRow);
		changePreferencesGroup.add(backgroundImageOffRow);

		//	_____________________
		//	Je garni les fenetres
		this.add(ActiverPreferencesGroup);
		this.add(voirPreferencesGroup);
		this.add(changePreferencesGroup);

		// je mets a jour les décorations
		this.changeSubtitle();
		this.changeGicon();
	}


	// --------------------------------------------------------------------------------------------- //
	// 		Ici, je commence à traiter les fonctions												 //
	// --------------------------------------------------------------------------------------------- //

	//	________________
	//	changeSubtitle()
	changeSubtitle() {
		this.voirTitreRow.subtitle = 	'/sys/class/led status \t\t \t : \t\t'		+ 	this._settings.get_string('sys-class-led-status') 			+ '\n' +
										'main screen Brightess (%) \t \t : \t\t' 	+ 	this._settings.get_int('main-brightness').toString() 		+ '\n' +
										'screenPad Value (%) - Mode \t : \t\t' 		+ 	this._settings.get_int('screenpad-brightness').toString() 	+ '\t\t' +
																						this._settings.get_string('screenpad-mode') 				+ '\t\t' +
																						this._settings.get_boolean('screenpad-status') 				+ '\n' +
										'Last Value (%) - Mode \t \t \t : \t\t'		+ 	this._settings.get_strv('screenpad-last-mode')[1] 			+ '\t\t' +
																						this._settings.get_strv('screenpad-last-mode')[0] 			;
	}


	//	_____________
	//	changeGicon()
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


//	_____________________
//	Class zenBookDuoRules
const zenBookDuoRules = GObject.registerClass(class zenBookDuoRules extends Adw.PreferencesPage {
	_init() {
		super._init({
 			title: 			_("Minimum Requis"),
			icon_name: 		'preferences-other-symbolic',
		});

//		const text1 = _("hello 3");

		//	_______________________
		//	wmiTextPreferencesGroup
		const wmiTextPreferencesGroup 			= new Adw.PreferencesGroup({
		})

		//	 Row
		const ModuleActionRow 					= new Adw.ActionRow({
			title: _("Minimum Requis"),
		})
		ModuleActionRow.subtitle 				= this._minimumRequierement();


		//	 Row
		const RegleInitialActionRow 			= new Adw.ActionRow({
			title: "udev/rules \n\n\t" + _("Lisez le fichier readme pour plus d'information"),
		})
		RegleInitialActionRow.subtitle 			= this._minimumRules();


		//	____________________
		//	Je garni les groupes
		wmiTextPreferencesGroup.add(ModuleActionRow);
		wmiTextPreferencesGroup.add(RegleInitialActionRow);

		//	_____________________
		//	Je garni les fenetres
		this.add(wmiTextPreferencesGroup);
	}


	// --------------------------------------------------------------------------------------------- //
	// 		Text																					 //
	// 		Ici, je commence à traiter les fonctions												 //
	// --------------------------------------------------------------------------------------------- //

	// ____________________
	// _minimumRequierement
	_minimumRequierement() {

		const minimumRequierement =
		"\n"
		+ "<b>" + _("Cette extension nécessite :") + "</b>\n"
		+ "\t• " + _("Un noyau Linux ≥ 6.5") + "\n"
		+ "\t• " + _(" GNOME Shell ≥ 45") + "\n\n"
		+ "<b>" + _("Vérifiez votre version avec :") + "</b>\n"
		+ "\t• uname -r " + _("pour le noyau") + "\n"
		+ "\t• gnome-shell --version " + _("pour GNOME")
		+ "\n";
		return minimumRequierement;
	}

	// _____________
	// _minimumRules
	_minimumRules() {

		const minimumRules = 
		"\n"
		+ "<b>" + _("Cette extension à besoin d'un accès en lecture et écriture à :") + "</b>\n"
		+ "\t• /sys/class/backlight/asus_screenpad/brightness\n"
		+ "\t• /sys/class/backlight/asus_screenpad/bl_power\n\n"
		+ "<b>" + _("Créez un fichier") + " /etc/udev/rules.d/99-asus.rules " + _("avec ce contenu :") + "</b>\n"
		+ "\t# Règles pour Asus ScreenPad\n"
		+ "\tACTION==\"add\", SUBSYSTEM==\"backlight\", KERNEL==\"asus_screenpad\", \\\n"
		+ "\t\tRUN+=\"/bin/chmod a+w /sys/class/backlight/asus_screenpad/brightness\"\n"
		+ "\tACTION==\"add\", SUBSYSTEM==\"backlight\", KERNEL==\"asus_screenpad\", \\\n"
		+ "\t\tRUN+=\"/bin/chmod a+w /sys/class/backlight/asus_screenpad/bl_power\"\n\n"
		+ "<b>" + _("Puis redémarrer la cession ou rechargez les règles avec :") + "</b>\n"
		+ "\tsudo udevadm control --reload-rules";
		return minimumRules
	}

});


//	_____________________
//	Class zenBookDuoAbout
const zenBookDuoAbout = GObject.registerClass(class zenBookDuoAbout extends Adw.PreferencesPage {
	_init(metadata, path) {
		super._init({
 			title: _("À propos"),
			icon_name: 'emoji-people-symbolic',
		});

		this._path 								= path;
		this.giconFree 							= Gtk.Image.new_from_file(this._path + '/Media/input-tablet-symbolic-free-pref.svg');
		this.giconFree.set_pixel_size(100);


		//	__________________________
		//	AboutTitrePreferencesGroup
		const AboutTitrePreferencesGroup 		= new Adw.PreferencesGroup();

		const AboutTitrePrincipaleBox 			= new Gtk.Box({
			orientation: Gtk.Orientation.HORIZONTAL,
			spacing: 75,
		});

		const AboutTitreImageBox 				= new Gtk.Box();
		AboutTitreImageBox.append(this.giconFree);

		const AboutTitreNameBox 				= new Gtk.Box({
			orientation: Gtk.Orientation.VERTICAL,
		});

		const AboutTitreLabel 					= new Gtk.Label({
			label: '<span size="large"><b> Asus ZenBook Duo Integration</b></span>',
			use_markup: true,
			halign: Gtk.Align.START,
		});

		const AboutDescriptionLabel 			= new Gtk.Label({
			label: _("Intégration des fonctions Asus au bureau Gnome") + "\n" + _("modele:") + " zenBook Duo",
			vexpand: true,
			halign: Gtk.Align.START,
		});

		// on mélange les boites
		AboutTitreNameBox.append(AboutTitreLabel);
		AboutTitreNameBox.append(AboutDescriptionLabel);

		AboutTitrePrincipaleBox.append(AboutTitreImageBox);
		AboutTitrePrincipaleBox.append(AboutTitreNameBox);

		// et hope on foure tout dans le groupe
		AboutTitrePreferencesGroup.add(AboutTitrePrincipaleBox);

		this.add(AboutTitrePreferencesGroup);


		//	_________________________
		//	AboutTextPreferencesGroup
		const AboutTextPreferencesGroup 		= new Adw.PreferencesGroup()

		const AuteurActionRow 					= new Adw.ActionRow({
			title: 		_("Auteur"),
		})
		AuteurActionRow.subtitle 				= this._auteurText();

		const ProjetInitialActionRow = new Adw.ActionRow({
			title: 		"Projet initial",
		})
		ProjetInitialActionRow.subtitle 		= this._projetInitialText();

		const LicenceRow = new Adw.ActionRow({
			title: 		'Asus-WMI',
		})
		LicenceRow.subtitle 					= this._licenceText();
		
		AboutTextPreferencesGroup.add(AuteurActionRow);
		AboutTextPreferencesGroup.add(ProjetInitialActionRow);
		AboutTextPreferencesGroup.add(LicenceRow);

		this.add(AboutTextPreferencesGroup);

		//	_________________________
		//	AboutTextPreferencesGroup
		const GarantieLabel 					= 	_("Ce logiciel est fourni sans AUCUNE GARANTIE.");
		const urlLabel 							= 	_("Voir la %sLicence Publique Générale GNU%s pour plus de détails.")
														.format('<a href="https://www.gnu.org/licenses/old-licenses/gpl-2.0.fr.html">', '</a>');
		const gnuSoftwareGroup 					= new Adw.PreferencesGroup();
		const gnuSofwareLabel 					= new Gtk.Label({
			label: 			`<span size="small">${GarantieLabel}\n${urlLabel}</span>`,
			use_markup: 	true,
			justify: 		Gtk.Justification.CENTER,
		});

		gnuSoftwareGroup.add(gnuSofwareLabel);
		this.add(gnuSoftwareGroup);
	}


	// --------------------------------------------------------------------------------------------- //
	// 		Text																					 //
	// 		Ici, je commence à traiter les fonctions												 //
	// --------------------------------------------------------------------------------------------- //

	// ___________
	// _auteurText
	_auteurText () {

	const auteurText =
		_("Code écrit par") + " Christophe Théodore.\n"
		+ _("Avec l'aide de la communauté.")
		+ "\n\n" + _("Grand merci au développeurs, qui sans le savoir, m'ont permis d'obtenir ce résultat.")
		+ "\n";
	return auteurText;
	}

	// ______________
	// _projetInitial
	_projetInitialText () {
		const projetInitialText =
		_("Une première version d'asus intégration avait été écrite par") + " jibsaramnim " + _("et") + " lunaneff.\n"
		+ "https://github.com/lunaneff/gnome-shell-extension-zenbook-duo\n\n"
		+ _("Je me suis inspiré de l'idée pour créer cette extension, je remercie les auteurs.")
		+ "\n";
	return projetInitialText;
	}

	// ____________
	// _licenceText
	_licenceText () {
		const licenceText =
			_("Logiciel libre sous licence GPL-2.0+") + "\n\n"
			+ _("Vous êtes libre de:") + "\n"
			+ "\t• " + _("Utiliser, étudier, partager ce logiciel") + "\n"
			+ "\t• " + _("Le modifier selon vos besoins") +"\n"
			+ "\t• " + _("Redistribuer vos modifications");
		return licenceText;
	}

});


