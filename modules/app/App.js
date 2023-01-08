import { Seed } from '../systeme/Seed.js';
import { Systeme } from '../systeme/Systeme.js';
import { Decouverte } from './Decouverte.js';
import { Favoris } from './Favoris.js';
import { Menu } from './Menu.js';
import { Notification } from './Notification.js';
import { Params, callResize, recalcOnResize, wait } from './Params.js';
import { Voyage } from './Voyage.js';
import { initInterface, pulseBouton } from './interface.js';
import dataStorage from './localForage.js';
import { Parametre } from './parametres.js';
import { textualiser } from './traduction.js';



let checkingUpdate = 0;
let updateAvailable = 0;
let lastCheck = 0;



/////////////////////////////////////////////////////
// On enregistre le service worker
// et on le met à jour si la version du site a changé
async function initServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/solaire/service-worker.js.php');
    console.log('Le service worker a été enregistré', registration);

    window.addEventListener('updatecheck', event => {
      registration.update();
    });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      let updating = false;

      newWorker?.addEventListener('statechange', async event => {
        const updateHandler = async () => {
          return await new Promise((resolve, reject) => {
            const chan = new MessageChannel();
    
            chan.port1.onmessage = event => {
              if (event.data.error) {
                console.error(event.data.error);
                reject('[:(] Erreur de contact du service worker.');
              }
    
              if (event.data.ready) {
                console.log('[:)] Nouvelle version prête !');
                resolve(true);
              } else {
                reject('[:(] Nouvelle version pas prête.');
              }
            };
    
            chan.port1.onmessageerror = event => {
              reject('[:(] Erreur de communication avec le service worker.');
            };
    
            updating = true;
            newWorker.postMessage({ 'action': 'force-update' }, [chan.port2]);
          });
        };

        if (newWorker.state == 'installed') {
          console.log('[sw] Service worker mis à jour');
          
          // Ne PAS utiliser de notification, ça ferme les découvertes.
          //await Notification.create('Mise à jour installée !', null, Notification.maxDelay, [{ type: 'icone', texte: 'refresh', action: updateHandler }]);
        }

        else if (newWorker.state == 'activated') {
          if (updating) return location.reload();
        }
      });
    });

    return navigator.serviceWorker.controller;
  } catch(error) {
    console.error(error);
    throw null;
  }
}



/////////////////////////////////////////////////////////
// Démarre l'application (update? => populate => display)
export async function launch() {
  try {
    await dataStorage.ready();

    // Initialisation
    await textualiser();

    await Parametre.init();
    await Decouverte.init();
    await Favoris.init();
    Menu.init();

    Decouverte.updateList();
    Favoris.updateList();
    Menu.ongletCarnet('onglet-decouvertes');

    // Suppression du champ 'url-getter' si inutile
    if (navigator.share || navigator.clipboard)
      document.getElementById('url-getter').remove();

    const firstVisit = (await dataStorage.getItem('version-univers')) == null;
    // Si c'est la première visite, montrer un message de bienvenue
    if (firstVisit) {
      document.body.setAttribute('data-first-visit', '');
      await dataStorage.setItem('version-univers', Systeme.versionUnivers);
      const bouton = document.querySelector('#bouton-explorer');
      await new Promise(resolve => {
        bouton.addEventListener('click', async event => {
          await pulseBouton(event);
          resolve();
        }, { once: true });
      });
    }

    else if (await Systeme.universObsolete()) {
      // Si l'univers a changé depuis la dernière visite, on efface les références à l'ancien univers
      await Decouverte.clearAll();
      await Favoris.clearAll();
      await dataStorage.setItem('version-univers', Systeme.versionUnivers);
      document.querySelector('.nouvel-univers').classList.add('on');
    }

    initInterface();

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
    const loadScreen = document.getElementById('welcome');
    if (loadScreen != null) {
      document.body.removeAttribute('data-first-visit');
      const loadAway = loadScreen.animate([
        { opacity: 1 },
        { opacity: 0 }
      ], {
        duration: 500,
        easing: Params.easingStandard,
        fill: 'forwards'
      });
      await new Promise(resolve => loadAway.addEventListener('finish', resolve));
      loadScreen.remove();
    }

    window.addEventListener('resize', callResize);
    window.addEventListener('orientationchange', callResize);
  }

  catch (error) {
    console.log(error);
  }

    
  // Gestion de l'appli par service worker

  if (!'serviceWorker' in navigator) {
    console.log('[non-sw:not-in-navigator] Démarrage...');
    startNoInstall();
    return;
  }

  console.log('[sw] Démarrage...');
  try {
    // ÉTAPE 1 : on vérifie si l'application est installée localement

    let installedFiles = (await dataStorage.getItem('file-versions')) ?? {};
    let cacheVersion = Math.max(...Object.values(installedFiles).map(v => Number(v)));

    // On vérifie si les fichiers sont installés
    const filesInstalled = await caches.has(`solaire-sw-${cacheVersion}`);

    // On vérifie si le service worker est prêt
    const serviceWorkerReady = navigator.serviceWorker.controller != null;

    // ---

    // ÉTAPE 2 : si la réponse est oui, on passe à la suite ;
    //           si la réponse est non, on installe l'application

    if (filesInstalled && serviceWorkerReady) {
      console.log('[:)] L\'application est déjà installée localement.');
      initServiceWorker();
    } else {
      console.log('[:(] L\'application n\'est pas installée localement.');
      console.log('[:|] Préparation de l\'installation...');
      await initServiceWorker();
  
      installedFiles = (await dataStorage.getItem('file-versions')) ?? {};
      cacheVersion = Math.max(...Object.values(installedFiles).map(v => Number(v)));
    }

    document.querySelector('.conteneur-check-maj>span').innerHTML = 'v. ' + cacheVersion;
    console.log('[:)] Chargement de l\'application...');

    recalcOnResize();
  }

  catch (error) {
    console.error(error);
    console.log('[non-sw] Démarrage...');
    startNoInstall();
  }

  // Surveille les demandes de mise à jour manuelles
  window.addEventListener('check-update', () => checkUpdate());
}



/////////////////////////////////////////////
// Vérifie la disponibilité d'une mise à jour
export async function checkUpdate(checkNotification = false) {
  if (lastCheck + 10000 > Date.now())
    return;
  lastCheck = Date.now();

  const boutonMaj = document.getElementById('bouton-maj');
  if (!boutonMaj.disabled || checkingUpdate)
    return;
  checkingUpdate = 1;

  const texteSucces = 'Mise à jour disponible...';
  const notifyMaj = async () => {
    checkingUpdate = 0;
    await Notification.create(texteSucces, null, 10000, [{
      type: 'normal',
      texte: 'Installer',
      action: () => {
        window.dispatchEvent(new Event('updatecheck'));
      }
    }]);
  };

  try {
    if (!navigator.onLine) throw 'Pas de connexion internet';
    if (updateAvailable) return notifyMaj();

    const installedFiles = await dataStorage.getItem('file-versions');
    const cacheVersion = Math.max(...Object.values(installedFiles).map(v => Number(v)));

    // On lance update.php pour récupérer les données les plus récentes
    const response = await fetch(`/solaire/backend/update.php?type=check&from=${cacheVersion}&date=${Date.now()}`);
    if (response.status != 200)
      throw '[:(] Erreur ' + response.status + ' lors de la requête';
    const data = await response.json();

    if ((cacheVersion != data['version-fichiers'])) {
      updateAvailable = 1;
      console.log('[:|] Mise à jour détectée');
      console.log('     Installé : fichiers v. ' + timestamp2date(cacheVersion * 1000));
      console.log('   Disponible : fichiers v. ' + timestamp2date(data['version-fichiers'] * 1000));
      console.log('     Modifiés :', data['liste-fichiers-modifies']);
      return notifyMaj();
    } else {
      updateAvailable = 0;
      console.log('[:)] Aucune mise à jour disponible');
      console.log('     Installé : fichiers v. ' + timestamp2date(cacheVersion * 1000));
      throw 'Pas de mise à jour';
    }
  }

  catch(error) {
    if (checkNotification && typeof error === 'string') {
      await Notification.create(error, 'error', 10000);
    }
    console.error(error);
    checkingUpdate = 0;
  }
}


/////////////////////////////////////////
// Vérifie si l'appli peut être installée
export async function checkInstall() {
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
export function startNoInstall() {
  recalcOnResize();
}