'use strict';

		// ------------------------------------------------------------------------------------- //
		// 		./extensions.js																	 //
		// 																						 //
		// 		Code ecrit par Christophe Theodore												 //
		// 		Licence : GPL-2.0, logiciel libre, vous pouvez le copier et l'utiliser librement //
		// 		Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell				 //
		// 		Merci à la communauté pour les bouts de codes pèché ici et la.					 //
		//-------------------------------------------------------------------------------------- //

		// ------------------------------------------------------------------------------------- //
		// 		Inspiré par une extension écrite par jibsaramnim and lunaneff					 //
		// 		https://github.com/lunaneff/gnome-shell-extension-zenbook-duo					 //
		// 		Le code à été entièrement revu et modifié										 //
		// 		je remercie les auteurs.														 //
		// ------------------------------------------------------------------------------------- //


//	_______________
//	import from 'gi
import Gio 										from 'gi://Gio';

//	____________________________
//	import from org/gnome/shell/
import {Extension, gettext as _} 				from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main 								from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings 						from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as MessageTray 						from 'resource:///org/gnome/shell/ui/messageTray.js';

//	_______________________________
//	import from config (constantes)
import { SysClassPaths, GSettingsPaths } 		from './Config/config.js';

//	_______________________________________
//	import from class (object et fonctions)
import * as screenpadObjects					from './ClassObjects/screenpadobjects.js'
import * as systemFileUtility 					from './ClassObjects/functions.js';


// --------------------------------------------------------------------------------------------- //
// 		let firstRun passera à false après avoir testé les outils externe.						 //
// 		Je ne veux pas refaire le test a chaque enable(), mais une fois au démarrage.			 //
// --------------------------------------------------------------------------------------------- //
let firstRun 									= true;


//	________________
//	Class Principale
export default class ZenBookDuoIntegration extends Extension {

//	________
//	enable()
	enable() {

		//	__________
		//	Le setting
		this._settings 							= this.getSettings(GSettingsPaths.SETTINGS);
		this._backgroundSetting 				= this.getSettings(GSettingsPaths.BACKGROUND);

		//	_________________________
		//	Declaration des Variables
		let brightnessFilesStatus 				= systemFileUtility.checkSysClassFileAccess(SysClassPaths.BRIGHTNESS);
		let blPowerFilesStatus 					= systemFileUtility.checkSysClassFileAccess(SysClassPaths.BL_POWER);
		let mainSliderStatus					= true;
		let extensionStatus						= "NA";

		//	_______________________
		//	Declaration des objects
		this._screenpadControl 					= null;
		//	__________________________
		//	Declaration des connexions
		this._screenpadActivatedId				= null;

		//	___________________________
		// et pour se simplifier la vie
		this.mainSlider							= Main.panel.statusArea.quickSettings._brightness.quickSettingsItems[0];

		// ------------------------------------------------------------------------------------- //
		// 		Pour Fonctionner, cette extension a besoin d'un acces à :						 //
		// 			main.panel.statusArea.quickSettings._brightness...							 //
		// 			/sys/class/leds/asus::screenpad/brightness		Kernel <6.5 non supporté	 //
		// 			/sys/class/backlight/asus_screenpad/brightness			Kernel > 6.5		 //
		// 			/sys/class/backlight/asus_screenpad/bl_power			Kernel > 6.5		 //
		// 		en Lecture ET écriture															 //
		// 		/etc/udev/rules.d/99-asus.rules authorise l'acces en écriture					 //
		// 		Vérifions cela, mais qu'une seule fois, au premier démarrage ! 					 //
		//-------------------------------------------------------------------------------------- //

		if (firstRun) {

			// --------------------------------------------------------------------------------- //
			// 		on test main.panel.statusArea.quickSettings._brightness...					 //
			// --------------------------------------------------------------------------------- //
			try {
				if (!Main.panel.statusArea.quickSettings._brightness?.quickSettingsItems?.[0]?.slider) {
					mainSliderStatus = false;
				}
			} catch (e) {
				mainSliderStatus = false;
			}

			// --------------------------------------------------------------------------------- //
			//		on Verifie les trois conditions soit honorée								 //
			// 			/sys/class/backlight/asus_screenpad/brightness							 //
			// 			/sys/class/backlight/asus_screenpad/bl_power							 //
			// 		et on met a jour le seting													 //
			// --------------------------------------------------------------------------------- //

			if (mainSliderStatus) {
				if (brightnessFilesStatus !== "RW") extensionStatus = brightnessFilesStatus;
				else if (blPowerFilesStatus !=="RW") extensionStatus = blPowerFilesStatus;
					else extensionStatus = "RW";
			} else extensionStatus				= "NA";
			this._settings.set_string('sys-class-led-status', extensionStatus);

			// --------------------------------------------------------------------------------- //
			// 		verification de 	/sys/class/backlight/asus_screenpad/brightness			 //
			// 					 de 	/sys/class/backlight/asus_screenpad/bl_power			 //
			// 				et de		main.panel.statusArea.quickSettings._brightness...		 //
			// 		NA->Not Applicable
			// 		00->inexistant																 //
			// 		RO->readOnly																 //
			// 		RW->readWrite 																 //
			// --------------------------------------------------------------------------------- //

			// --------------------------------------------------------------------------------- //
			// 		On informe l'utilisateur si NOK												 //
			// 		et si OK, on initialise l'extension											 //
			// --------------------------------------------------------------------------------- //
			switch (extensionStatus) {

				case "NA":
					//	Main.panel.statusArea.quickSettings._brightness.quickSettingsItems.[0].slider n est pas accessible
					this._settings.set_boolean('screenpad-extension-activated', false);
					this._showNotification (
						_("Désactivation de ZenBook Extension"),
						_("Le panneau de contrôle principal n’est pas accessible."),
						"critical"
					);

				break;

				case "00":
					//	/sys/class/backlight/asus_screenpad/brightness n'est pas present
					this._settings.set_boolean('screenpad-extension-activated', false);
					this._showNotification (
						_("Désactivation de ZenBook Extension"),
 						_("Un fichier /sys/class/backlight/asus_screenpad/* n’a pas été détecté. Un noyau supérieur à 6.5 est requis."),
						"critical"
					);

				break;

				case "RO":
					//	/sys/class/backlight/asus_screenpad/brightness est en lecture seule
					this._settings.set_boolean('screenpad-extension-activated', false);
					this._showNotification (
						_("Désactivation de ZenBook Extension"),
						_("Un fichier /sys/class/backlight/asus_screenpad/* est en lecture seule. Consultez les préférences pour configurer /etc/udev/rules.d/99-asus.rules."),
						"critical"
					);

				break;

				case "RW":
					//	/sys/class/backlight/asus_screenpad/brightness est en lecture/ecriture
					//	Rien à faire ici

				break;

			}

			// --------------------------------------------------------------------------------- //
			// 		firstRun passe à false,														 //
			// 		Les tests en lecture et ecriture de /sys/class/led...						 //
			// 		ne seront pas exécutés après un prochain enable().							 //
			// --------------------------------------------------------------------------------- //
			firstRun = false;
		}
		// 		-------------------------------------------------------------------------------- //
		// 		 End of first run																 //
		// 		-------------------------------------------------------------------------------- //


		// 		-------------------------------------------------------------------------------- //
		// 		Activation des class objects et des connexions 									 //
		// 		Seulement si sys-class-led-status est RW et screenpad-extension-activated true	 //
		// 		-------------------------------------------------------------------------------- //

		//	_______________________
		//	class _screenpadControl
		if(		this._settings.get_boolean('screenpad-extension-activated') 
		&& 		extensionStatus === "RW"
		) {

			//	_____________________
			//	_initScreenpadSetting
			this._initScreenpadSetting(SysClassPaths.BRIGHTNESS,SysClassPaths.BL_POWER);
			
			//	________________________________________
			//	Activation de la class _screenpadControl
			this._screenpadControl = new screenpadObjects.screenpadControl(this);
			this._screenpadControl.enableScreenpadControl();

			//	________________________________
			//	Connexion du screenpad-extension-activated
			this._screenpadActivatedId = this._settings.connect ('changed::screenpad-extension-activated', 
				() => 	{
							if(	this._settings.get_boolean('screenpad-extension-activated')
							&& 	this._settings.get_string('sys-class-led-status') === "RW") {
								//	_initScreenpadSetting
								this._initScreenpadSetting(SysClassPaths.BRIGHTNESS,SysClassPaths.BL_POWER);
								//	Activation de la class _screenpadControl
								this._screenpadControl = new screenpadObjects.screenpadControl(this);
								this._screenpadControl.enableScreenpadControl();
							} else {
								// destruction des objects
								this._screenpadControl?.disableScreenpadControl();
								this._screenpadControl = null;
							}
						} );

		}

		//	__________________________________
		//	Petit coup debalai avant de partir
		brightnessFilesStatus 					= null;
		blPowerFilesStatus 						= null;
		mainSliderStatus						= null;
		extensionStatus							= null;

	}

	disable() {

		// ------------------------------------------------------------------------------------- //
		// 		Remember																		 //
		// 		Any objects or widgets created by an extension MUST be destroyed in disable().	 //
		// 		This is required for approval during review!									 //
		// ------------------------------------------------------------------------------------- //

		// ------------------------------------------------------------------------------------- //
		// 		Destructions des connexions														 //
		// ------------------------------------------------------------------------------------- //
		if (this._screenpadActivatedId) {
			this._settings.disconnect(this._screenpadActivatedId);
			this._screenpadActivatedId = null;
		}

		// ------------------------------------------------------------------------------------- //
		// 		Destruction des objects 														 //
		// ------------------------------------------------------------------------------------- //
		this._screenpadControl?.disableScreenpadControl();
		this._screenpadControl 					= null;

		//	__________________________________________
		//	et le reste
		this._settings 							= null;
		this._backgroundSetting					= null;
		this.mainSlider 						= null;
	}


	// 		------------------------------------------------------------------------------------ //
	// 		Initialisation de la valeur du screen pad brightness								 //
	// 																							 //
	// 		ScreenPad linked 																	 //
	// 			SysClassBrightnessValue 	= MainBrightnessValue								 //
	// 																							 //
	// 		ScreenPad Free 		 																 //
	// 			ScreenPadBrightnessValue 	= SysClassBrightnessValue							 //
	// 																							 //
	// 		ScreenPad Off 																		 //
	// 			Cas1 : SysClassBrightnessValue	= 0: c'est vrai, si Auto On...					 //
	// 			Cas2 : SysClassBrightnessValue	≠ 0: c'est faux 								 //
	// 								ScreenPadBrightnessValue 	= SysClassBrightnessValue		 //
	// 								ajuster les décorations ( bouton, slider, background + Free) //
	// 																							 //
	// 		ScreenPad Full 																		 //
	// 			Cas1 : SysClassBrightnessValue	= 235: c'est vrai, rien a faire					 //
	// 			Cas2 : SysClassBrightnessValue	≠ 235: c'est faux 								 //
	// 								ScreenPadBrightnessValue 	= SysClassBrightnessValue		 //
	// 								ajuster les décorations ( bouton, slider, background + Free) //
	// 		------------------------------------------------------------------------------------ //
	_initScreenpadSetting(SysClassBrightnessFile,SysClassBLPowerFile) {

		// 	------------------------------------------------------------------------------------ //
		// Rappel :																				 //
		// 				main Brightness Value 													 //
		// 							Slider valeur comprise entre			 000 et 001			 //
		// 							setting valeur en pourcentage entre		 000 et 100			 //
		//							sys/class/backlight valeur entre		 000 et 255			 //
		// 				screenpad Brightness Value 												 //
		// 							Slider valeur comprise entre			 000 et 001			 //
		// 							setting valeur en pourcentage entre		 000 et 100			 //
		//							sys/class/backlight valeur entre		 000 et 235			 //
		// 	------------------------------------------------------------------------------------ //

		let screenpadAutoAdjustValue 			= this._settings.get_boolean('screenpad-auto-adjust');
		let mainBrightnessValue 				= Math.round(this.mainSlider.slider.value*100);
		let sysClassScreenPadValue 				= Math.round(systemFileUtility.getSysClassFileValue(SysClassBrightnessFile)/235*100);
		let screenpadBrightnessValue 			= -1;
		let screenpadMode 						= this._settings.get_string('screenpad-mode');
		let functionResult 						= "kp";

		// le screen pad est certainement allumé, dans le cas contraire, case "Off" l'éteindra!
		this._settings.set_boolean('screenpad-status', true);


		// 		-------------------------------------------------------------------------------- //
		// 		En Fonction de screenpad-mode													 //
		// 		-------------------------------------------------------------------------------- //

		switch (screenpadMode) {

			case "Linked":
			//	SysClassBrightnessValue = MainBrightnessValue
				screenpadBrightnessValue = mainBrightnessValue;

			break;

			case "Free":
			//	ScreenPadBrightnessValue = SysClassBrightnessValue
				screenpadBrightnessValue = sysClassScreenPadValue

			break;

			case "Off":
				//	Cas 1 : l'écran est il vraiment Off ?
				if (sysClassScreenPadValue === 0) {
				this._settings.set_boolean('screenpad-status', false);

					//	la fonction autoAjustement est elle true?
					if(screenpadAutoAdjustValue) {
						//	Auto allumage de l'écran, mise en mode Free
						//	BackLight a 0 pour on
						functionResult = systemFileUtility.setSysClassFileValue(SysClassBLPowerFile,"0");
						if (functionResult === "ok") this._settings.set_boolean('screenpad-status', true);
						screenpadBrightnessValue = mainBrightnessValue;
						this._settings.set_string('screenpad-mode', "Free");

						//	Mise a jour de la décoration background
						if (this._settings.get_boolean('background-activated'))
							systemFileUtility.ChangeBackgroundImage(this._settings, this._backgroundSetting, "On");

					}
				//	Cas 2 : l'écran n'était pas Off
				} else {
					//	l'ecran n'était pas éteint, mise a jour de l'extension
					screenpadBrightnessValue = sysClassScreenPadValue
					this._settings.set_string('screenpad-mode', "Free");
				}

			break;

			case "Full":
				//	Cas 1 : l'écran est il vraiment Full ?
				if (sysClassScreenPadValue > 234) {
					//	la fonction autoAjustement est elle true?
					if(screenpadAutoAdjustValue) {
						//	Auto ajustement de l'écran, mise en mode Free
						screenpadBrightnessValue = mainBrightnessValue;
						this._settings.set_string('screenpad-mode', "Free");
					}
				//	Cas 2 : l'écran n'était pas Full
				} else {
					//	l'ecran n'était pas éteint, mise a jou de l'extension
					screenpadBrightnessValue = sysClassScreenPadValue
					this._settings.set_string('screenpad-mode', "Free");
				}

			break;

		}

		//	___________________________________
		//	Mise a jour de screenpad-brightness
		//	puis écriture dans le /sys/class/backlight/asus_screenpad/brightness
		this._settings.set_int('screenpad-brightness', screenpadBrightnessValue); 
		functionResult = systemFileUtility.setSysClassFileValue(SysClassBrightnessFile, Math.round(screenpadBrightnessValue*235/100));

		// puis, sauvegarde de l'état actuelle
		this._settings.set_strv	('screenpad-last-mode', [this._settings.get_string('screenpad-mode'),
														this._settings.get_int('screenpad-brightness').toString() ]
								);

		//	__________________________________
		//	Petit coup debalai avant de partir
		screenpadAutoAdjustValue 				= null;
		sysClassScreenPadValue 					= null;
		mainBrightnessValue 					= null;	
		screenpadBrightnessValue 				= null;
		screenpadMode 							= null;
		functionResult 							= null;
	}


	// ----------------------------------------------------------------------------------------- //
	// 		Ici, je commence à traiter les fonctions											 //
	// ----------------------------------------------------------------------------------------- //


	// ----------------------------------------------------------------------------------------- //
	// 		Merci a Voluble Extension pour les notifications									 //
	//------------------------------------------------------------------------------------------ //

//	__________________________
//	Fonction _showNotification
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

// --------------------------------------------------------------------------------------------- //
// 		La fin																					 //
//---------------------------------------------------------------------------------------------- //
}