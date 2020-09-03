import { wait } from './Params.js';



let currentWorker;
let appCached;
let appChargee;
let isStarted = 0;
let resizing;
let popTimeout;
const version = document.documentElement.dataset.version;



/////////////////////////////////////////////////////////
// Démarre l'application (update? => populate => display)
function appStart()
{
  // Étape 1 : on vérifie si l'application est installée localement

  caches.keys()
  .then(keys => {
    const trueKeys = keys.filter(e => e.includes('solaire'));
    return trueKeys.length;
  })
  .then(result => {
    if (result >= 1 && localStorage.getItem('solaire/version') !== null)
    {
      appCached = true;
      return '[:)] L\'application est déjà installée localement.';
    }
    else
    {
      appCached = false;
      throw '[:(] L\'application n\'est pas installée localement';
    }
  })

  // Étape 2 : si la réponse est non, on installe l'application
  //   si l'installation est impossible, on arrête et on retentera une fois le service worker disponible

  .catch(raison => {
    console.log(raison);
    console.log('[:|] Préparation de l\'installation...');
    return appUpdate();
  })

  // Fini !! :)

  .then(result => {
    appChargee = 'loaded';
    document.querySelector('.conteneur-check-maj>span').innerHTML = 'v. ' + localStorage.getItem('solaire/version');
    recalcOnResize();
    console.log(result);
    if (typeof currentWorker !== 'undefined' && currentWorker != null)
    {
      checkInstall();
      return checkUpdate();
    }
    appChargee = true;
  })

  .catch(error => {
    console.error(error);
    appChargee = false;
  });
}

// Si service worker indisponible
function noStart()
{
  recalcOnResize();
}



///////////////////////////
// Met à jour l'application
function appUpdate(update = false)
{
  const version = Date.now();

  if (typeof currentWorker === 'undefined' || currentWorker == null)
    return Promise.reject('[:(] Service worker indisponible');

  // On récupère le numéro de version obtenu par checkUpdate()
  return Promise.resolve()
  .then(() => {
    if (checkedVersion != null)
      return { version: checkedVersion };

    // Si checkUpdate() n'a pas eu lieu, on récupère le numéro de version
    return fetch('/solaire/update.php?&date=' + Date.now())
    .then(response => {
      if (response.status == 200)
        return response;
      else
        throw '[:(] Erreur ' + response.status + ' lors de la requête';
    })
    .then(response => response.json());
  })
  .then(data => {
    return new Promise((resolve, reject) => {
      console.log('[:|] Installation des fichiers...');

      // On se prépare à envoyer un message au SW pour demander l'update
      const chan = new MessageChannel();

      //// Le SW répondra au message pour signaler la fin de l'update.
      //// On se prépare à réagir à cette réponse.
      chan.port1.onmessage = event => {
        if (event.data.error)
        {
          console.error(event.data.error);
          reject('[:(] Erreur de contact du service worker');
        }
        else
        {
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
        if (event.data.loaded)
        {
          totalLoaded++;
          if (update)
            document.getElementById('progression-maj').style.setProperty('--progression', totalLoaded / event.data.total);
        }
        else if (!event.data.loaded && event.data.erreur)
          reject('[:(] Certains fichiers n\'ont pas pu être récupérés');
      });
    });
  })
}



/////////////////////////////////////////////
// Vérifie la disponibilité d'une mise à jour
let checkingUpdate = 0;
let updateAvailable = 0;
let checkedVersion = null;
let lastCheck = 0;
function checkUpdate()
{
  if (lastCheck + 10000 > Date.now())
    return;
  lastCheck = Date.now();

  const boutonMaj = document.getElementById('bouton-maj');
  if (!boutonMaj.disabled || checkingUpdate)
    return;
  checkingUpdate = 1;
  const texteSucces = 'Mise à jour disponible...';

  return new Promise((resolve, reject) => {
    if (!navigator.onLine)
      return reject('Pas de connexion internet');
    if (updateAvailable)
      return resolve(texteSucces);

    // On lance update.php pour récupérer les données les plus récentes
    fetch('/solaire/update.php?date=' + Date.now())
    .then(response => {
      if (response.status == 200)
        return response;
      else
        throw '[:(] Erreur ' + response.status + ' lors de la requête';
    })
    .then(response => { return response.json(); })
    .then(data => {
      checkedVersion = data['version'];
      if (localStorage.getItem('solaire/version') != data['version'])
      {
        updateAvailable = 1;
        console.log('[:|] Mise à jour détectée');
        console.log('     Installé : v. ' + localStorage.getItem('solaire/version'));
        console.log('   Disponible : v. ' + data['version']);
        return texteSucces;
      }
      else
      {
        updateAvailable = 0;
        console.log('[:)] Aucune mise à jour disponible');
        console.log('     Installé : v. ' + localStorage.getItem('solaire/version'));
        throw 'Pas de mise à jour';
      }
    })
    .then(result => resolve(result))
    .catch(error => reject(error))
  })
  .then(() => wait(2000))
  .then(() => {
    boutonMaj.classList.add('on');
    boutonMaj.disabled = false;
    boutonMaj.tabIndex = 0;
    checkingUpdate = 0;
  })
  .catch(() => {
    checkingUpdate = 0;
  });
}



/////////////////////////////////////////
// Vérifie si l'appli peut être installée
function checkInstall()
{
  let installPrompt;
  const installBouton = document.getElementById('bouton-installer');
  const boutonPrecedent = document.getElementById('bouton-precedent');
  const boutonSuivant = document.getElementById('bouton-suivant');

  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    installBouton.classList.add('on');
    installBouton.disabled = false;
    installBouton.tabIndex = 0;
    boutonPrecedent.classList.add('off');
    boutonPrecedent.disabled = true;
    boutonPrecedent.tabIndex = -1;
    boutonSuivant.classList.add('off');
    boutonSuivant.disabled = true;
    boutonSuivant.tabIndex = -1;

    installBouton.addEventListener('click', e => {
      installBouton.classList.remove('on');
      installBouton.disabled = true;
      installBouton.tabIndex = -1;
      boutonPrecedent.classList.remove('off');
      boutonPrecedent.disabled = false;
      boutonPrecedent.tabIndex = 0;
      boutonSuivant.classList.remove('off');
      boutonSuivant.disabled = false;
      boutonSuivant.tabIndex = 0;
      installPrompt.prompt();
      installPrompt.userChoice
      .then(choix => {
        if (choix.outcome === 'accepted')
          console.log('[app] Installation acceptée !');
        else
          console.log('[app] Installation refusée');
          installPrompt = null;
      });
    });
  });

  window.addEventListener('appinstalled', e => {
    console.log('[app] Installation terminée !');
  });
}