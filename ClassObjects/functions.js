'use strict';

//-----------------------------------------------------------------------------
//    ./ClassFunctions/functions.js

//    This extension is not affiliated, funded,or in any way associated with Asus.
//    Code ecrit par Christophe Theodore
//    Intégration des fonctions de l'Asus ZenBook Duo dans GNOME Shell

//    Licence : GPL-2.0, 
//        logiciel libre, vous pouvez le copier et l'utiliser librement

//    Merci à la communauté pour son aide précieuse..
//-----------------------------------------------------------------------------



// import
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import { GSettingsPaths } from '../Config/config.js';


// Test les droit RW des fichiers sys/class/.
export function checkSysClassFileAccess (sysClassFile) {

    // Declaration des Variables
    let sysClassFileStatus = '00';
    let sysClassFileValue = null;

    // Test si sysclassled... exist
    let _SysClassFileGFile = Gio.File.new_for_path(sysClassFile);
    if (_SysClassFileGFile.query_exists(null)) {

        // Essai en lecture
        try {
            sysClassFileValue = _SysClassFileGFile.load_contents_async(null)[1];
            sysClassFileStatus = 'RO';
        }
        catch(err) {
            sysClassFileStatus = '00';
        }

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

                // Petit coup de balai avant de partir
                _SysClassFileOutputStream.close(null);
                _SysClassFileStream.close(null);
                _SysClassFileGuint8 = null;
            }
            catch(err) {
                sysClassFileStatus = 'RO';
            }
        }
    }

    // Petit coup de balai avant de partir
    _SysClassFileGFile = null;
    sysClassFileValue = null;

    return sysClassFileStatus;
}


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

            // équivalent de callback(success ? contents : '-1');
            if (!success) {
                callback('-1');
                return;
            }

            // contents est un Uint8Array -> on convertit en string
            const decoder = new TextDecoder();
            const sysClassFileValue = decoder.decode(contents).trim();

            callback(sysClassFileValue);

        } catch (err) {
            callback('-1');
        }
    });
}


// Fonction set
export function setSysClassFileValue (sysClassFile, sysClassFileValue) {

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

            // Petit coup de balai avant de partir
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
            }
        newBackgroundImageGFile = null;
        }

    }

    // Petit coup de balai avant de partir
    currentBackgroundImage = null;
    newBackgroundImage = null;
}

