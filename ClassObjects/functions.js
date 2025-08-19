'use strict';

//-----------------------------------------------------------------------------
//    ./ClassFunctions/functions.js

//    Code ecrit par Christophe Theodore
//    Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell

//    Licence : GPL-2.0, 
//        logiciel libre, vous pouvez le copier et l'utiliser librement

//    Merci à la communauté pour son aide précieuse..
//-----------------------------------------------------------------------------


// _______________
// import from 'gi
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

// ____________________________
// import from org/gnome/shell/
import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';


// _______________________________
// import from config (constantes)
import { GSettingsPaths } from '../Config/config.js';


// ___________________________________________
// Fonction checkSysClassFileAccess Read Write
// Test les droit RW des fichiers sys/class/.
export function checkSysClassFileAccess (sysClassFile) {

    // _________________________
    // Declaration des Variables
    let sysClassFileStatus = '00';
    let sysClassFileValue = null;

    // ____________________________
    // Test si sysclassled... exist
    // Création de l'object Giofile et control sa validité
    let _SysClassFileGFile = Gio.File.new_for_path(sysClassFile);
    if (_SysClassFileGFile.query_exists(null)) {

        // ________________
        // Essai en lecture
        try {
            sysClassFileValue = _SysClassFileGFile.load_contents_async(null)[1];
            sysClassFileStatus = 'RO';
        }
        catch(err) {
            sysClassFileStatus = '00';
        }

        // _________________
        // Essai en écriture
        if (sysClassFileStatus == 'RO') {

            try {
                let _SysClassFileStream = _SysClassFileGFile.open_readwrite(null);
                let _SysClassFileOutputStream = _SysClassFileStream.get_output_stream();

                const _textEncoder = new TextEncoder();
                let _SysClassFileGuint8 = _textEncoder.encode((sysClassFileValue));

                _SysClassFileOutputStream.write(_SysClassFileGuint8,null);
                _SysClassFileOutputStream.flush(null);

                sysClassFileStatus = 'RW';

                // __________________________________
                // Petit coup debalai avant de partir
                _SysClassFileOutputStream.close(null);
                _SysClassFileStream.close(null);
                _SysClassFileGuint8 = null;
                //this._textEncoder?.destroy();   // Rien à faire ici. TextEncoder est géré par le GC.
                //this._textEncoder = null;       // Rien à faire ici. TextEncoder est géré par le GC.
            }
            catch(err) {
                // sysClassFileStatus = err.message;
                sysClassFileStatus = 'RO';
            }
        }
    }

    // __________________________________
    // Petit coup debalai avant de partir
    _SysClassFileGFile = null;
    sysClassFileValue = null;

    return sysClassFileStatus;
}


// _____________________________
// Fonction getSysClassFileValue
// renvoi la valeur de sysClassFile via callback et load_contents_async
export function getSysClassFileValue(sysClassFile, callback) {
    let _sysClassFileGFile = Gio.File.new_for_path(sysClassFile);

    // Vérification synchrone de l'existence (acceptable)
    if (!_sysClassFileGFile.query_exists(null)) {
        callback('-1');
        return;
    }

    // Lecture asynchrone avec callback GIO
    _sysClassFileGFile.load_contents_async(null, (_file, res) => {
        try {
            // Récupération des résultats de l'opération asynchrone
            let [success, contents] = _sysClassFileGFile.load_contents_finish(res);

            //callback(success ? contents : '-1');
            if (!success) {
                callback('-1');
                return;
            }

            // contents est un Uint8Array -> on convertit en string
            //const sysClassFileValue = imports.byteArray.toString(contents).trim();
            const decoder = new TextDecoder();
            const sysClassFileValue = decoder.decode(contents).trim();

            callback(sysClassFileValue);

        } catch (err) {
            //console.debug(`[ZenBook] Error reading _sysClassFileGFile: ${err.message}`);
            callback('-1');
        }
    });
}


// _____________________________
// Fonction setSysClassFileValue
// Fonction set
export function setSysClassFileValue (sysClassFile, sysClassFileValue) {

    //    _________________________
    //    Declaration des Variables
    let result = "ok";

    // Création de l'object Giofile et control sa validité
    let _SysClassFileGFile = Gio.File.new_for_path(sysClassFile);
    if (_SysClassFileGFile.query_exists(null)) {
        try {
            let _SysClassFileStream = _SysClassFileGFile.open_readwrite(null);
            let _SysClassFileOutputStream = _SysClassFileStream.get_output_stream();

            const _textEncoder = new TextEncoder();
            let _SysClassFileGuint8 = _textEncoder.encode((sysClassFileValue));

            _SysClassFileOutputStream.write(_SysClassFileGuint8,null);
            _SysClassFileOutputStream.flush(null);

            // __________________________________
            // Petit coup debalai avant de partir
            //this._textEncoder?.destroy();       // Rien à faire ici. TextEncoder est géré par le GC.
            //this._textEncoder = null;           // Rien à faire ici. TextEncoder est géré par le GC.
            _SysClassFileGuint8 = null;
            _SysClassFileOutputStream.close(null);
            _SysClassFileStream.close(null);
            _SysClassFileGFile = null;

        }
        catch(err) {
            result = 'SysClassStream # ' + sysClassFile + ' erreur :' + err.message;
        }
    }else result = 'SysClassFileGFile ' +sysClassFile+ ' no exist';

    return result;

}


// ________________________________
// ChangeBackgroundImage (onOff)
export function ChangeBackgroundImage (thisSettings,thisBackgroundSetting,onOff) {

    // Récupération des répertoires
    let currentBackgroundImage = thisBackgroundSetting.get_string('picture-uri');
    let newBackgroundImage = "";

    if (onOff === "On") newBackgroundImage = thisSettings.get_string('background-image-on');
    else newBackgroundImage = thisSettings.get_string('background-image-off');

    // Si le nouveau background est différent
    if (currentBackgroundImage !== "file://" + newBackgroundImage) {

        // Je créer un GFile et je test la présence du nouveau background
        let newBackgroundImageGFile = Gio.File.new_for_path(newBackgroundImage);
        if (newBackgroundImageGFile.query_exists(null)) {
            try {
                thisBackgroundSetting.set_string('picture-uri', "file://" + newBackgroundImage);
                thisBackgroundSetting.set_string('picture-options', "spanned");
            }
            catch(err) {
                //Main.notify( "ZenBook Extension", "BackGround Erreur");
            }
        newBackgroundImageGFile = null;
        }

    }

    // __________________________________
    // Petit coup debalai avant de partir
    currentBackgroundImage = null;
    newBackgroundImage = null;
}


//-----------------------------------------------------------------------------
//    La fin
//-----------------------------------------------------------------------------
