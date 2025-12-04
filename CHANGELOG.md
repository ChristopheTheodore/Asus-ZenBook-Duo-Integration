
# Extension GNOME pour Asus ZenBook Duo
### By Christophe Theodore

## This extension is not affiliated, funded,or in any way associated with Asus.

Cette extension permet de contrôler l'écran secondaire (ScreenPad) des ordinateurs portables Asus ZenBook Duo sous GNOME :
Le réglage de la luminosité du ScreenPad se controle en fonction du mode choisi:
  - Linked ( Lié )      : Synchronisé avec l'écran principal.
  - Free ( Libre )	    : Contrôle indépendant.
  - Full ( Maximum )	  : Luminosité au maximum.
  - Off ( Éteint )	    : Désactivation complète.

Les fonds d'écran peuvent s'adapter à la demande.

## Version 5.0: actor - initialisation

* ### Améliorations :
    *   Intégration à Gnome49
    *   Remplacement de this._screenpadSlider.actor (Usage of object.actor is deprecated for ScreenPadSlider)
    *   Correction de initialisation
    *   correction de bug (icones) dans prefs.js

## Version 4.0: Refonte Asynchrone et Robustesse

* ### Nouveautés et Améliorations :
    *   Suppression des codes morts
    *   Suppression des commentaires inutiles. Je transmetterai toutes information utile sur code, à la demande.
    *   tous les texts passe en anglais, la traduction en Francais reste assurée par mes soins
    *   ajout de la mension "This extension is not affiliated, funded,or in any way associated with Asus." un peu partout

## Version 3.0: Refonte Asynchrone et Robustesse

Cette version majeure introduit une refonte significative de la gestion des lectures système pour une intégration plus fluide et fiable avec GNOME Shell.

* ### Refonte Asynchrone Majeure :
    *   Lecture asynchrone des fichiers système (`/sys/class/backlight/asus_screenpad/*`) pour éviter tout blocage de l'interface GNOME Shell lors du démarrage de l'extension.
    *   L'initialisation des paramètres du ScreenPad (`enableScreenpadControl()`) est maintenant déclenchée une fois les valeurs système lues, garantissant un état cohérent dès l'activation.

* ### Corrections de Bugs :
    *   **Correction de l'initialisation au démarrage :** Résolution d'un problème où l'état du ScreenPad (allumé/éteint) ou sa luminosité pouvaient être incorrects au démarrage de la session ou après un réveil de veille. La logique de synchronisation entre le matériel et les paramètres de l'extension a été entièrement repensée pour plus de fiabilité.
    *   Renforcement de la gestion des erreurs lors de l'accès aux fichiers système.

* ### Optimisations :
    *   Nettoyage du code et suppression de variables et de commentaires obsolètes.
    *   Amélioration de la stabilité générale et de la réactivité de l'interface.


## Version 2:
* ### Corrections :
  - Correction du metadata.json.
  - mise à jour des indentations au standard gnome extension pour une meilleur lecture.

## Version 1:
  - Version Initial, avant revue.
