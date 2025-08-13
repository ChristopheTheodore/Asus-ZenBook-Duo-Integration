'use strict';

		// ------------------------------------------------------------------------------------- //
		// 		./ClassFunctions/functions.js													 //
		// 																						 //
		// 		Code ecrit par Christophe Theodore												 //
		// 		Licence : GPL-2.0, logiciel libre, vous pouvez le copier et l'utiliser librement //
		// 		Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell				 //
		// 		Merci à la communauté pour les bouts de codes pèché ici et la.					 //
		//-------------------------------------------------------------------------------------- //


//	_______________
//	import from 'gi
import GLib 									from 'gi://GLib';
import Gio 										from 'gi://Gio';
//import Shell 									from 'gi://Shell';

//	____________________________
//	import from org/gnome/shell/
import {Extension, gettext as _} 				from 'resource:///org/gnome/shell/extensions/extension.js';

//	_______________________________
//	import from config (constantes)
import { GSettingsPaths } 						from '../Config/config.js';


//	________________________________________
//	Fonction checkSysClassFileAccess Read Write	
//	Test les droit RW des fichiers sys/class/.
export function checkSysClassFileAccess (sysClassFile) {

	//	_________________________
	//	Declaration des Variables
	let sysClassFileStatus 						= '00';
	let sysClassFileValue 						= null;
	//sysClassFile 								= '/home/christophe/Documents/test';							// For Testing
	
	//	____________________________
	//	Test si sysclassled... exist
	//	Création de l'object Giofile et control sa validité
	let _SysClassFileGFile 						= Gio.File.new_for_path(sysClassFile);
	if (_SysClassFileGFile.query_exists(null)) {

		//	________________
		//	Essai en lecture
		try {
			sysClassFileValue 					= _SysClassFileGFile.load_contents(null)[1];
			sysClassFileStatus 					= 'RO';
		}
		catch(err) {
			sysClassFileStatus 					= '00';
		}

		//	_________________
		//	Essai en écriture
		if (sysClassFileStatus == 'RO') {

			try {
				let _SysClassFileStream 		= _SysClassFileGFile.open_readwrite(null);
				let _SysClassFileOutputStream 	= _SysClassFileStream.get_output_stream();

				const _textEncoder = new TextEncoder();
				//	je rajoute '00' au dans les cas ou je remplace un valeur a 1 chiffre sur une valeur à 2 chiffres (008 -> 192)
				//	let _SysClassFileGuint8 = _textEncoder.encode(('00'+sysClassFileValue));
				//	Pas Nessessaire avec le nouveau noyeau
				let _SysClassFileGuint8 		= _textEncoder.encode((sysClassFileValue));
				
				_SysClassFileOutputStream.write(_SysClassFileGuint8,null);
				_SysClassFileOutputStream.flush(null);

				sysClassFileStatus = 'RW';

				//	__________________________________
				//	Petit coup debalai avant de partir
				_SysClassFileOutputStream.close(null);
				_SysClassFileStream.close(null);
				_SysClassFileGuint8 		= null;
				//this._textEncoder?.destroy();					// Rien à faire ici. TextEncoder est géré par le GC.
				//this._textEncoder = null;						// Rien à faire ici. TextEncoder est géré par le GC.
			}
			catch(err) {
				//	sysClassFileStatus = err.message;
				sysClassFileStatus 				= 'RO';
			}
		}
	}

	//	__________________________________
	//	Petit coup debalai avant de partir
	_SysClassFileGFile 							= null;
	sysClassFileValue 							= null;

	return sysClassFileStatus;
}


//	_____________________________
//	Fonction getSysClassFileValue
//	Fonction get
export function getSysClassFileValue (sysClassFile) {

	//	_________________________
	//	Declaration des Variables
	let sysClassFileValue 						= '-1';

	//	___________________________________________________
	//	Création de l'object Giofile et control sa validité
	let _SysClassFileGFile 						= Gio.File.new_for_path(sysClassFile);
	if (_SysClassFileGFile.query_exists(null)) {
		try {
			sysClassFileValue 					= _SysClassFileGFile.load_contents(null)[1];
		}
		catch(err) {
			sysClassFileValue 					= '-1';
		}
	}

	//	__________________________________
	//	Petit coup debalai avant de partir
	_SysClassFileGFile 							= null;

	// Rappel, La valeur de _settings.screenpad-brightness est enregistéee en %
	if(sysClassFileValue != '-1') 
		//	getSysClassFileValue renvoi déja un pourcentage;
		//	Cette fonction peut etre utilisé pour BLPower,
		//	il ne faut donc pas renvoyer un pourcentage
		//	sysClassFileValue 						= Math.round((parseInt(sysClassFileValue)/235*100));
	return sysClassFileValue;
}


//	_____________________________
//	Fonction setSysClassFileValue
//	Fonction set
export function setSysClassFileValue (sysClassFile, sysClassFileValue) {

	//	_________________________
	//	Declaration des Variables
	let temp_result 							= "ok";

	//	Création de l'object Giofile et control sa validité
	let _SysClassFileGFile = Gio.File.new_for_path(sysClassFile);
	if (_SysClassFileGFile.query_exists(null)) {
		try {
			let _SysClassFileStream = _SysClassFileGFile.open_readwrite(null);
			let _SysClassFileOutputStream = _SysClassFileStream.get_output_stream();

			const _textEncoder = new TextEncoder();
			let _SysClassFileGuint8 = _textEncoder.encode((sysClassFileValue));

			_SysClassFileOutputStream.write(_SysClassFileGuint8,null);
			_SysClassFileOutputStream.flush(null);

			//	__________________________________
			//	Petit coup debalai avant de partir
			//this._textEncoder?.destroy();					// Rien à faire ici. TextEncoder est géré par le GC.
			//this._textEncoder = null;						// Rien à faire ici. TextEncoder est géré par le GC.
			_SysClassFileGuint8 = null;
			_SysClassFileOutputStream.close(null);
			_SysClassFileStream.close(null);
			_SysClassFileGFile = null;

		}
		catch(err) {
			temp_result = 'SysClassStream # ' + sysClassFile + ' erreur :' + err.message;
		}
	}else temp_result = 'SysClassFileGFile ' +sysClassFile+ ' no exist';

	return temp_result;

}


	//	_________________________________
	//		ChangeBackgroundImage (onOff)
export function ChangeBackgroundImage (thisSettings,thisBackgroundSetting,onOff) {
		
	// récupération des répertoires
	let temp_currentBackgroundImage 			= thisBackgroundSetting.get_string('picture-uri');
	let temp_newBackgroundImage					= "";

	if (onOff === "On") temp_newBackgroundImage	= thisSettings.get_string('background-image-on');
	else temp_newBackgroundImage				= thisSettings.get_string('background-image-off');

	// si le nouveau background est différent
	if (temp_currentBackgroundImage !== "file://" + temp_newBackgroundImage) {

		// Je créer un GFile et je test la présence du nouveau background
		let temp_newBackgroundImageGFile 		= Gio.File.new_for_path(temp_newBackgroundImage);
		if (temp_newBackgroundImageGFile.query_exists(null)) {
			try {
				thisBackgroundSetting.set_string('picture-uri', "file://" + temp_newBackgroundImage);
				thisBackgroundSetting.set_string('picture-options', "spanned");
			}
			catch(err) {
				//Main.notify( "ZenBook Extension", "BackGround Erreur");
			}
		temp_newBackgroundImageGFile		= null;
		}

	}

	//	__________________________________
	//	Petit coup debalai avant de partir
	temp_currentBackgroundImage 				= null;
	temp_newBackgroundImage						= null;
}



// --------------------------------------------------------------------------------------------- //
// 		La fin																					 //
// --------------------------------------------------------------------------------------------- //
