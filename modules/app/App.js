import { Systeme } from '../systeme/Systeme.js';
import { textualiser } from './traduction.js';
import { Decouverte } from './Decouverte.js';
import { Favoris } from './Favoris.js';
import { Menu } from './Menu.js';
import { wait, recalcOnResize, callResize } from './Params.js';
import { Parametre } from './parametres.js';
import { initInterface, createFocusability } from './interface.js';
import { getString } from './traduction.js';
import { Voyage } from './Voyage.js';
import { Seed } from '../systeme/Seed.js';



let currentWorker;

let appCached;
let appChargee;

let checkedVersion;
let checkingUpdate = 0;
let updateAvailable = 0;
let lastCheck = 0;

let isStarted = 0;



export class App {
  /////////////////////////////////////////////////////////
  // Démarre l'application (update? => populate => display)
  static async start() {
    let result;
    try {
      // Étape 1 : on vérifie si l'application est installée localement
      let keys = await caches.keys();
      keys = keys.filter(e => e.includes('solaire'));
      keys = keys.length;

      if (keys >= 1 && localStorage.getItem('solaire/version') !== null) {
        appCached = true;
        result = '[:)] L\'application est déjà installée localement.';
      }
      else {
        appCached = false;
        result = '[:(] L\'application n\'est pas installée localement';
      }
      console.log(result);

      // Étape 2 : si la réponse est non, on installe l'application
      //   si l'installation est impossible, on arrête et on retentera une fois le service worker disponible
      if (!appCached) {
        try {
          await App.update();
        }
        catch(error) {
          console.log(`[:(] Installation impossible : ${error}`);
        }
      }

      // Fini !! :)

      appChargee = 'loaded';
      document.querySelector('.conteneur-check-maj>span').innerHTML = 'v. ' + localStorage.getItem('solaire/version');
      recalcOnResize();
      if (typeof currentWorker !== 'undefined' && currentWorker != null) {
        App.checkInstall();
        App.checkUpdate();
      }
      appChargee = true;
    }

    
    catch(error) {
      console.error(error);
      appChargee = false;
    }    
  }


  ///////////////////////////
  // Met à jour l'application
  static async update(update = false) {
    const version = Date.now();

    if (typeof currentWorker === 'undefined' || currentWorker == null)
      throw 'Service worker indisponible';

    if (checkedVersion != null)
      return { version: checkedVersion };

    // Si checkUpdate() n'a pas eu lieu, on récupère le numéro de version
    let data = await fetch('/solaire/update.php?&date=' + Date.now());
    if (data.status != 200)
      throw 'Erreur ' + data.status + ' lors de la requête de màj';
    data = await data.json();

    try {
      const result = await new Promise((resolve, reject) => {
        console.log('[:|] Installation des fichiers...');

        // On se prépare à envoyer un message au SW pour demander l'update
        const chan = new MessageChannel();

        //// Le SW répondra au message pour signaler la fin de l'update.
        //// On se prépare à réagir à cette réponse.
        chan.port1.onmessage = event => {
          if (event.data.error) {
            console.error(event.data.error);
            reject('[:(] Erreur de contact du service worker');
          } else {
            console.log('[:)] Fichiers correctement installés !');
            localStorage.setItem('solaire/version', data['version']);

            if (update)
              setTimeout(() => { location.reload(true); }, 1000);
            resolve('[:)] Installation terminée !');
          }
        }
        //// On envoie le message
        currentWorker.postMessage({'action': 'update', 'version': version}, [chan.port2]);

        // Indépendamment du message qu'on lui a envoyé, le SW va envoyer des messages
        // pour compter le nombre de fichiers mis en cache.
        let totalLoaded = 0;
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data.loaded) {
            totalLoaded++;
            if (update)
              document.getElementById('progression-maj').style.setProperty('--progression', totalLoaded / event.data.total);
          }
          else if (!event.data.loaded && event.data.erreur)
            reject('[:(] Certains fichiers n\'ont pas pu être récupérés');
        });
      });

      console.log(result);
    }
    catch(error) {
      console.error(error);
    }
    return;
  }


  /////////////////////////////////////////////
  // Vérifie la disponibilité d'une mise à jour
  static async checkUpdate() {
    if (lastCheck + 10000 > Date.now())
      return;
    lastCheck = Date.now();

    const boutonMaj = document.getElementById('bouton-maj');
    if (!boutonMaj.disabled || checkingUpdate)
      return;
    checkingUpdate = 1;
    const texteSucces = 'Mise à jour disponible...';

    try {
      let result;
      if (!navigator.onLine)
        throw 'Pas de connexion internet';
      if (updateAvailable)
        result = texteSucces;
      else {
        // On lance update.php pour récupérer les données les plus récentes
        let data = await fetch('/solaire/update.php?date=' + Date.now());
        if (data.status != 200)
          throw '[:(] Erreur ' + response.status + ' lors de la requête';
        data = await data.json();

        checkedVersion = data['version'];

        if (localStorage.getItem('solaire/version') != data['version']) {
          updateAvailable = 1;
          console.log('[:|] Mise à jour détectée');
          console.log('     Installé : v. ' + localStorage.getItem('solaire/version'));
          console.log('   Disponible : v. ' + data['version']);
          result = texteSucces;

          await wait(2000);
          boutonMaj.classList.add('on');
          boutonMaj.disabled = false;
          boutonMaj.tabIndex = 0;
        }
        else {
          updateAvailable = 0;
          console.log('[:)] Aucune mise à jour disponible');
          console.log('     Installé : v. ' + localStorage.getItem('solaire/version'));
          result = 'Pas de mise à jour';
        }
      }
    }

    catch(error) {
      console.error(error);
    }

    checkingUpdate = 0;
    return;
  }


  /////////////////////////////////////////
  // Vérifie si l'appli peut être installée
  static checkInstall() {
    const installBouton = document.getElementById('bouton-installer');
    const boutonPrecedent = document.getElementById('bouton-precedent');
    const boutonSuivant = document.getElementById('bouton-suivant');

    window.addEventListener('beforeinstallprompt', bipEvent => {
      bipEvent.preventDefault();
      installBouton.classList.add('on');
      installBouton.disabled = false;
      installBouton.tabIndex = 0;
      boutonPrecedent.classList.add('off');
      boutonPrecedent.disabled = true;
      boutonPrecedent.tabIndex = -1;
      boutonSuivant.classList.add('off');
      boutonSuivant.disabled = true;
      boutonSuivant.tabIndex = -1;

      installBouton.addEventListener('click', () => {
        installBouton.classList.remove('on');
        installBouton.disabled = true;
        installBouton.tabIndex = -1;
        boutonPrecedent.classList.remove('off');
        boutonPrecedent.disabled = false;
        boutonPrecedent.tabIndex = 0;
        boutonSuivant.classList.remove('off');
        boutonSuivant.disabled = false;
        boutonSuivant.tabIndex = 0;
        bipEvent.prompt();
        bipEvent.userChoice
        .then(choix => {
          if (choix.outcome === 'accepted')
            console.log('[app] Installation acceptée !');
          else
            console.log('[app] Installation refusée');
        });
      });
    });

    window.addEventListener('appinstalled', () => {
      console.log('[app] Installation terminée !');
    });
  }


  /////////////////////////////////
  // Si service worker indisponible
  static noStart() {
    recalcOnResize();
  }


  ////////////////////////////////
  // Au lancement de l'application
  static async launch() {
    // Affichage d'un avertissement sur les navigateurs non/mal supportés
    const warning = document.querySelector('.warning');
    if (getComputedStyle(warning).display == 'none') {
      warning.remove();
      document.getElementById('warning-edge').remove();
    }
    else {
      const bouton = document.getElementById('bouton-pause');
      bouton.querySelector('i').innerHTML = 'play_arrow';
      bouton.disabled = true;
      bouton.tabIndex = -1;
      bouton.title = 'Microsoft Edge supporte mal la présence de certaines variables CSS dans les animations de Solaire. Par conséquent, elles sont désactivées. Désolé pour ce désagrément !';
    }

    // Initialisation des textes
    await textualiser();
  
    // Initialisation des données sauvegardées
    Parametre.init();
    Decouverte.init();
    Favoris.init();
    Menu.init();

    Favoris.updateList();
    await Decouverte.populate();

    Menu.ongletCarnet('onglet-decouvertes');
    initInterface();
    createFocusability(document);

    // Suppression du champ 'url-getter' si inutile
    document.getElementById('code-saisi').placeholder = getString('saisie-placeholder');
    if (navigator.share || navigator.clipboard)
      document.getElementById('url-getter').remove();

    // Si l'univers a changé depuis la dernière visite, on efface les références à l'ancien univers
    if (Systeme.universObsolete)
    {
      Decouverte.clearAll();
      Favoris.clearAll();
      localStorage.setItem('solaire/version-univers', Systeme.versionUnivers);
      pop.querySelector('.nouvel-univers').classList.add('on');
    }

    // Récupération de l'adresse de système fournie dans l'URL
    let URLcode;
    try {
      URLcode = window.location.href.match(/(solaire\/systeme\/)(.+)/)[2];
      if (!Seed.validate(URLcode)) throw 'Bad initial seed';
      console.log('Code détecté :', URLcode);
    } catch(error) {}

    // Création d'un premier système planétaire
    const voy = new Voyage(URLcode);
    voy.go();

    await wait(100);

    // Suppression de l'écran de chargement
    if (document.querySelector('#welcome') != null)
      document.getElementById('welcome').remove();

    window.addEventListener('resize', callResize);
    window.addEventListener('orientationchange', callResize);

      
    // Gestion de l'appli par service worker

    if (!'serviceWorker' in navigator) {
      console.log('[non-sw:not-in-navigator] Démarrage...');
      App.noStart();
      return;
    }

    currentWorker = navigator.serviceWorker.controller;
    isStarted = 1;
    console.log('[sw] Démarrage...');
    App.start();

    try {
      const registration = await navigator.serviceWorker.register('/solaire/service-worker.js');
      console.log('Le service worker a été enregistré', registration);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state == 'activated') {
            console.log('[sw] Service worker mis à jour');
            currentWorker = newWorker;
          }
        });
      });

      const sw = registration.installing || navigator.serviceWorker.controller || registration.active;
      currentWorker = sw;
      if (!isStarted) {
        console.log('[sw] Démarrage...');
        App.start();
      }
      else if (appChargee === true) {
        App.checkUpdate();
        App.checkInstall();
      }
    }
    catch(error) {
      console.error(error);
      if (!isStarted) {
        console.log('[non-sw] Démarrage...');
        App.noStart();
      }
    }

    // Surveille les demandes de mise à jour manuelles
    window.addEventListener('check-update', App.checkUpdate);
    window.addEventListener('app-update', () => App.update(true));
  }
}