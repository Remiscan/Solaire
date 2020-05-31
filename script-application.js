"use strict";

/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! PRÉPARATION DE L'APPLICATION !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/



let currentWorker;
let appCached;
let appChargee;
let isStarted = 0;
let resizing;
let popTimeout;
function wait(time) { return new Promise(resolve => setTimeout(resolve, time)); }
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



//////////////////////////////////////////////
// Vérifie si les lois de l'univers ont changé
function comparerVersionUnivers()
{
  const versionLocale = localStorage.getItem('solaire/version-univers');
  if (versionLocale != versionUnivers)
  {
    // Réinitialisation des découvertes
    localStorage.removeItem('solaire/decouvertes');
    initDecouvertes();
    peuplerDecouvertes();

    // Réinitialisation des favoris
    localStorage.removeItem('solaire/favoris');
    initFavoris();
    peuplerFavoris();

    if (versionLocale != null)
    {
      localStorage.setItem('solaire/version-univers', versionUnivers);
      return 'notify';
    }
    else
    {
      localStorage.setItem('solaire/version-univers', versionUnivers);
      return true;
    }
  }
  else
    return false;
}





/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! TEXTE ET TRADUCTION !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/



let langage;
const Textes = {};

///////////////////////////////////////////////////////
// Place le texte français ou anglais aux bons endroits
function textualiser()
{
  const localLang = localStorage.getItem('solaire/langage');
  const httpLang = document.documentElement.dataset.httpLang;
  const navLang = navigator.language;
  if (localLang != null)
    langage = (localLang == 'fr') ? 'fr' : 'en';
  else if (httpLang)
    langage = (httpLang == 'fr') ? 'fr' : 'en';
  else if (navLang != null)
    langage = navLang.includes('fr') ? 'fr' : 'en';
  else
    langage = 'fr';

  document.documentElement.lang = langage;

  return new Promise((resolve, reject) => {
    if (Object.keys(Textes).length === 0 && Textes.constructor === Object)
    {
      fetch('/solaire/strings--' + version + '.json')
      .then(response => {
        if (response.status == 200)
          return response;
        else
          throw '[:(] Erreur ' + response.status + ' lors de la requête';
      })
      .then(response => response.json())
      .then(response => {
        Textes.fr = response.fr;
        Textes.en = response.en;
        Object.freeze(Textes);
        Object.freeze(Textes.fr);
        Object.freeze(Textes.en);
        return resolve();
      })
      .catch(error => reject(error));
    }
    else resolve();
  })
  .then(() => {
    Array.from(document.querySelectorAll('[data-string]')).forEach(e => {
      e.innerHTML = getString(e.dataset.string);
    });
    return;
  })
  .catch(error => console.error(error));
}
textualiser();



///////////////////////////////////////////////////////////////////////////
// Récupère un string dans la langue choisie, et en français si non-traduit
function getString(id, lang = langage)
{
  const t = Textes[lang][id] || Textes['fr'][id];
  const temp = document.createElement('div');
  temp.textContent = t;
  return temp.innerHTML;
}



//////////////////////////////////
// Change la langue entre FR et EN
function switchLangage()
{
  langage = (langage == 'fr') ? 'en' : 'fr';
  localStorage.setItem('solaire/langage', langage);
  document.querySelector('.bouton-langage').removeEventListener('click', switchLangage);
  document.querySelector('.bouton-langage').innerHTML = '•••';
  return wait(50)
  .then(textualiser)
  .then(() => {
    recalcOnResize();
    peuplerDecouvertes();
    favoriActuel();
    document.getElementById('code-saisi').placeholder = getString('saisie-placeholder');
    document.querySelector('.bouton-langage').addEventListener('click', switchLangage);
  });
}



///////////////////////////////////////////
// Active le bouton de changement de langue
document.querySelector('.bouton-langage').addEventListener('click', switchLangage);





/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! VOYAGE VERS SYSTÈME !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/



/////////////////////////////////////////////
// Voyage vers le système indiqué par le code
function visiter(code)
{
  const boutonRedim = document.getElementById('bouton-redimensionner');

  closePops()
  .then(() => {
    if (isNaN(code))
      throw 'Code invalide';

    if (code != history.state.systeme)
    {
      window.derniereGeneration = Date.now();
      const boutonSuivant = document.getElementById('bouton-suivant');
      boutonSuivant.disabled = true;
      boutonSuivant.tabIndex = -1;
      boutonRedim.classList.remove('needed');
      boutonRedim.disabled = true;
      boutonRedim.tabIndex = -1;
      return queLaLumiereSoit(code, window.derniereGeneration);
    }
    else
      throw 'Système actuel';
  })
  .then(decouvertesDansCeSysteme => {
    favoriActuel();
    nouvellesDecouvertes(Array.from(decouvertesDansCeSysteme));
  })
  .catch(raison => {
    if (raison == 'Système actuel')
    {
      queLaLumiereSoit(code, history.state.date);
      boutonRedim.classList.remove('needed');
      boutonRedim.disabled = true;
      boutonRedim.tabIndex = -1;
    }
    else if (raison == 'Mauvais système')
      notify(getString('erreur-systeme-non-atteint'), 'error');
    else if (raison == 'Code invalide')
      notify(getString('erreur-adresse-invalide'), 'error');
  });
}



/////////////////////////////////////////
// Voyage vers le code saisi manuellement
let i_kc = 0;
function visiterSaisie()
{
  const codeSaisi = document.getElementById('code-saisi').value;
  if (codeSaisi != '')
  {
    document.getElementById('code-saisi').readonly = true;
    document.getElementById('code-saisi').blur();
    function isKeyboardClosed()
    {
      i_kc++;
      return new Promise((resolve, reject) => {
        if (document.getElementById('bouton-redimensionner').classList.contains('needed') && i_kc < 50)
          return wait(100).then(reject);
        else
        {
          i_kc = 0;
          return resolve();
        }
      })
      .catch(isKeyboardClosed);
    }

    isKeyboardClosed()
    .then(() => {
      document.getElementById('code-saisi').readonly = false;
      visiter(codeSaisi);
    });
  }
}





/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! DÉCOUVERTES !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/



//////////////////////////////////////
// Récupère (et règle) les découvertes
const decouvertesData = [
  {
    id: 'planete-anneaux'
  }, {
    id: 'lune-interanneaux'
  }, {
    id: 'planete-lunes'
  }, {
    id: 'etoile-binaire'
  }, {
    id: 'etoile-neutrons'
  }, {
    id: 'trounoir'
  }, {
    id: 'trounoir-anneau'
  }/*, {
    id: 'sphere-dyson'
  }*/
];

let decouvertes = JSON.parse(localStorage.getItem('solaire/decouvertes'));

function initDecouvertes()
{
  let decouvertes = JSON.parse(localStorage.getItem('solaire/decouvertes'));
  if (decouvertes == null)
  {
    decouvertes = [];
    decouvertesData.forEach(e => {
      decouvertes.push( { id: e.id, connu: 0, systeme: null } );
    });
    localStorage.setItem('solaire/decouvertes', JSON.stringify(decouvertes));
  }
  else
  {
    decouvertesData.forEach(e => {
      const k = decouvertes.findIndex(d => d.id == e.id);
      if (k == -1)
        decouvertes.push( { id: e.id, connu: 0, systeme: null } );
    });
    localStorage.setItem('solaire/decouvertes', JSON.stringify(decouvertes));
  }
}
initDecouvertes();



////////////////////////////////////////////////
// Construit le contenu du carnet de découvertes
function peuplerDecouvertes(nouvelles = [])
{
  let decouvertes = JSON.parse(localStorage.getItem('solaire/decouvertes'));
  const liste = document.getElementById('pop-decouvertes').querySelector('.liste-decouvertes');
  const listeNew = document.getElementById('pop-nouvelle-decouverte').querySelector('.liste-nouvelle-decouverte');
  liste.innerHTML = '';
  listeNew.innerHTML = '';

  function inconnue() {
    const div = document.getElementById('template-decouverte').content.cloneNode(true);
    div.querySelector('.decouverte').classList.add('non');
    div.querySelector('.material-icons').innerHTML = 'bookmark_border';
    div.querySelector('.decouverte-titre').innerHTML = '???';
    div.querySelector('.decouverte-description').innerHTML = '';
    div.querySelector('.decouverte-lien').remove();
    liste.appendChild(div);
  };

  let texte;
  if (nouvelles.length <= 1)
    texte = getString('notification-une-decouverte');
  else
    texte = getString('notification-plusieurs-decouvertes');
  document.getElementById('pop-nouvelle-decouverte').querySelector('h3').innerHTML = texte;

  decouvertesData.forEach(e => {
    const k = decouvertes.findIndex(d => d.id == e.id);
    if (k != -1)
    {
      if (decouvertes[k].connu === 1)
      {
        const div = document.getElementById('template-decouverte').content.cloneNode(true);
        div.querySelector('.decouverte-titre').innerHTML = getString('decouverte-' + e.id + '-titre');
        div.querySelector('.decouverte-description').innerHTML = getString('decouverte-' + e.id + '-description');
        div.querySelector('.decouverte-lien').innerHTML = 
          `<i class="material-icons">explore</i>
           <span data-string="bouton-revisiter">${getString('bouton-revisiter')}</span>`;
        div.querySelector('.decouverte-lien').onclick = () => visiter(decouvertes[k].systeme);
        liste.appendChild(div);
        if (nouvelles.includes(e.id))
        {
          const newdiv = document.getElementById('template-decouverte').content.cloneNode(true);
          newdiv.querySelector('.decouverte-titre').innerHTML = getString('decouverte-' + e.id + '-titre');
          newdiv.querySelector('.decouverte-description').innerHTML = getString('decouverte-' + e.id + '-description');
          newdiv.querySelector('.decouverte-lien').remove();
          newdiv.querySelector('.decouverte').classList.add('new');
          listeNew.appendChild(newdiv);
        }
      }
      else
        inconnue();
    }
    else
      inconnue();
  });
}



////////////////////////////////////////////////
// Marque de nouvelles découvertes comme connues
function nouvellesDecouvertes(potentiellesDecouvertes, genese = false)
{
  const ids = new Array();
  potentiellesDecouvertes.forEach(id => {
    if (verifDecouverte(id))
      ids.push(id);
  });

  if (ids.length > 0)
  {
    let decouvertes = JSON.parse(localStorage.getItem('solaire/decouvertes'));

    closePops()
    .then(() => {
      ids.forEach(id => {
        const k = decouvertes.findIndex(e => e.id == id);
        if (k != -1)
        {
          decouvertes[k].connu = 1;
          decouvertes[k].systeme = history.state.systeme;
        }
      });
      return;
    })
    .then(() => {
      localStorage.setItem('solaire/decouvertes', JSON.stringify(decouvertes));
      peuplerDecouvertes(ids);
      const pop = document.getElementById('pop-nouvelle-decouverte');
      if (genese)
        pop.querySelector('.nouvel-univers').classList.add('on');
      else
        pop.querySelector('.nouvel-univers').classList.remove('on');
      setTimeout(() => openPop(pop), 500);
      ongletCarnet('onglet-decouvertes');
    });
  }
}



///////////////////////////////////////////////////
// Vérifie si une découverte est déjà connue ou non
function verifDecouverte(id)
{
  let decouvertes = JSON.parse(localStorage.getItem('solaire/decouvertes'));
  const k = decouvertes.findIndex(e => e.id == id);
  if (k != -1 && decouvertes[k].connu === 0)
    return true;
  else
    return false;
}





/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! FAVORIS !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/



////////////////////////////////////////////////////////
// Récupère et règle les systèmes enregistrés en favoris
function initFavoris()
{
  let favoris = JSON.parse(localStorage.getItem('solaire/favoris'));
  if (favoris == null)
  {
    favoris = [];
    localStorage.setItem('solaire/favoris', JSON.stringify(favoris));
  }
}
initFavoris();



///////////////////////////////////////////////////////
// Construit le contenu de la liste de systèmes favoris
function peuplerFavoris()
{
  let favoris = JSON.parse(localStorage.getItem('solaire/favoris'));
  favoris = favoris.reverse();
  const liste = document.getElementById('pop-decouvertes').querySelector('.liste-navigation');
  Array.from(liste.getElementsByClassName('favori')).forEach(e => e.remove());

  favoris.forEach((e, k) => {
    const div = document.getElementById('template-favori').content.cloneNode(true);
    div.querySelector('.favori').id = 'favori-' + e.systeme;

    // Génération light du système pour récupérer son titre
    const temp = new MersenneTwister(e.systeme);
      // Type de l'étoile : normal, neutron ou trounoir
      let r = Math.floor(1 + (40 * temp.rnd()));
      let type;
      switch (r)
      {
        case 1:
          type = 'trounoir';
          break;
        case 2:
          type = 'trounoir-anneau';
          break;
        case 3:
        case 4:
          type = 'etoile-neutrons';
          break;
        case 5:
        case 6:
          type = 'etoile-binaire';
          break;
        /*case 7:
          this.type = 'sphere-dyson';
          break;*/
        default:
          type = 'normal';
      }
      r = decouvertesData.findIndex(e => e.id == type);
      const titreEtoile = decouvertesData[r] ? getString('decouverte-' + decouvertesData[r].id + '-titre') : '';
      temp.rnd(); // On saute les étapes inutiles ici
      const couleur = Math.floor(360 * temp.rnd());
      const nombre_planetes = Math.round(3 + 2 * temp.rnd()) + Math.round(4 + 2 * temp.rnd());
      const titre = (titreEtoile != '' ? titreEtoile + ', ' : '') + nombre_planetes + '<span data-string="favori-planetes"> ' + getString('favori-planetes') + '</span>';
    div.querySelector('.decouverte-titre').innerHTML = titre;

    div.querySelector('.decouverte-description').innerHTML = getString('adresse') + e.systeme;
    if (e.systeme == seed)
    {
      div.querySelector('.decouverte-lien').classList.add('off');
      div.querySelector('.favori').classList.add('actuel');
    }
    div.querySelector('.decouverte-lien').innerHTML = 
      `<i class="material-icons">explore</i>
       <span data-string="bouton-revisiter">${getString('bouton-revisiter')}</span>`;
    div.querySelector('.vous-etes-ici').innerHTML = 
      `<i class="material-icons">place</i>
       <span data-string="bouton-revisiter">${getString('favori-actuel')}</span>`;
    div.querySelector('.decouverte-lien').onclick = () => visiter(favoris[k].systeme);
    div.querySelector('.icon').style.setProperty('--couleur', couleur);
    div.querySelector('.icon').onclick = () => toggleFavori(favoris[k].systeme);
    highlightFavori(div.querySelector('.icon'));
    liste.appendChild(div);
  });

  createFocusability(liste);
}



//////////////////////////////////////////////////////
// Liste le système actuel dans la liste de navigation
function favoriActuel()
{
  // On met à jour la liste des favoris, pour enlever les favoris supprimés
  // et pour détecter si le système actuel est déjà en favoris (pour ne pas l'afficher 2 fois)
  peuplerFavoris();

  // Puis on affiche le système actuel (si nécessaire) pour pouvoir l'ajouter en favori
  let favoriActuel = document.getElementById('favori-actuel');
  if (document.getElementById('favori-' + seed) != null)
    favoriActuel.classList.add('off');
  else
    favoriActuel.classList.remove('off');

  let titreEtoile = '';
  if (astre.type != 'normal')
  {
    const k = decouvertesData.findIndex(e => e.id == astre.type);
    titreEtoile = getString('decouverte-' + decouvertesData[k].id + '-titre');
  }

  const titre = (titreEtoile != '' ? titreEtoile + ', ' : '') +
                String(astre.nombre_planetes_telluriques + astre.nombre_planetes_gazeuses) + 
                `<span data-string="favori-planetes">${getString('favori-planetes')}</span>`;
  favoriActuel.querySelector('.decouverte-titre').innerHTML = titre;
  favoriActuel.querySelector('.decouverte-description').innerHTML = getString('adresse') + seed;
  favoriActuel.querySelector('.icon').onclick = () => toggleFavori(seed);
  favoriActuel.querySelector('.icon').innerHTML = 'star_border';
  favoriActuel.querySelector('.icon').style.setProperty('--couleur', astre.couleur);
  favoriActuel.querySelector('.icon').classList.remove('yes');
  highlightFavori(favoriActuel.querySelector('.icon'));
}



//////////////////////////////
// Ajoute un système en favori
function ajoutFavori(id = seed)
{
    let favoris = JSON.parse(localStorage.getItem('solaire/favoris'));
    const k = favoris.findIndex(e => e.systeme == id);
    let favoriConsidere;

    if (id == seed && document.getElementById('favori-' + seed) == null)
    {
      favoriConsidere = document.getElementById('favori-actuel');
    }
    else
    {
      favoriConsidere = document.getElementById('favori-' + id);
    }
    
    if (k == -1)
    {
      favoris.push(
        {
          systeme: id
        }
      );
      localStorage.setItem('solaire/favoris', JSON.stringify(favoris));
      favoriConsidere.querySelector('.icon').classList.add('yes');
      favoriConsidere.querySelector('.icon').innerHTML = 'star';
    }
}



//////////////////////////////////
// Supprime un système des favoris
function supprimeFavori(id)
{
    let favoris = JSON.parse(localStorage.getItem('solaire/favoris'));
    const k = favoris.findIndex(e => e.systeme == id);
    let favoriConsidere;

    if (id == seed && document.getElementById('favori-' + seed) == null)
      favoriConsidere = document.getElementById('favori-actuel');
    else
      favoriConsidere = document.getElementById('favori-' + id);

    if (k != -1)
    {
      favoris = favoris.filter(v => { return v.systeme != id; });
      localStorage.setItem('solaire/favoris', JSON.stringify(favoris));
      favoriConsidere.querySelector('.icon').classList.remove('yes');
      favoriConsidere.querySelector('.icon').innerHTML = 'star_border';
    }
}



//////////////////////////////////////////////////////////////////////////////
// Ajoute un favori s'il ne l'est pas déjà, supprime un favori s'il l'est déjà
function toggleFavori(id)
{
  let favoris = JSON.parse(localStorage.getItem('solaire/favoris'));
  const k = favoris.findIndex(e => e.systeme == id);
  if (k == -1)
    ajoutFavori(id);
  else
    supprimeFavori(id);
}



///////////////////////////////////////////////////////////////////////////////////
// Change l'icône d'étoile au survol de la souris selon qu'il soit en favori ou non
function highlightFavori(etoile)
{
  etoile.addEventListener('mouseover', () => {
    if (etoile.classList.contains('yes'))
      etoile.innerHTML = 'star_border';
    else
      etoile.innerHTML = 'star';
  });
  etoile.addEventListener('mouseout', () => {
    if (etoile.classList.contains('yes'))
      etoile.innerHTML = 'star';
    else
      etoile.innerHTML = 'star_border';
  });
}





/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! PARAMÈTRES !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/



/////////////////////////////////////
// Récupère (et règle) les paramètres
const parametresData = [
  { id: 'animation', classe: 'paused', classType: 'negative', bouton: 'bouton-pause', default: 1 },
  { id: 'interface', classe: 'no-interface', classType: 'negative', bouton: 'bouton-interface', default: 1},
  { id: 'fond', classe: 'no-bg', classType: 'negative', switch: 'switch-bg', default: 1 },
  { id: 'planetesTexturees', classe: 'no-textures', classType: 'negative', switch: 'switch-textures', default: 1 },
  { id: 'orbites', classe: 'no-orbits', classType: 'negative', switch: 'switch-orbites', default: 1 },
  { id: 'orbitesLunaires', classe: 'no-lunar-orbits', classType: 'negative', switch: 'switch-orbites-lunaires', default: 1 },
  { id: 'orbitesColorees', classe: 'orbites-blanches', classType: 'negative', switch: 'switch-orbites-colorees', default: 1 },
  { id: 'ombresExagerees', classe: 'ombres-realistes', classType: 'negative', switch: 'switch-ombres-exagerees', default: 1 },
  { id: 'ombres', classe: 'no-shadows', classType: 'negative', switch: 'switch-ombres', default: 1 },
  { id: 'ombresNonAdditives', classe: 'ombres-non-additives', classType: 'positive', switch: 'switch-ombres-na', default: 1 }
];

function initParametres()
{
  let parametres = JSON.parse(localStorage.getItem('solaire/parametres'));
  if (parametres == null)
  {
    parametres = [];
    parametresData.forEach(e => {
      parametres.push( { id: e.id, valeur: e.default } );
    });
    localStorage.setItem('solaire/parametres', JSON.stringify(parametres));
  }
  else
  {
    parametresData.forEach(e => {
      const k = parametres.findIndex(d => d.id == e.id);
      if (k == -1)
        parametres.push( { id: e.id, valeur: e.default } );
    });
    localStorage.setItem('solaire/parametres', JSON.stringify(parametres));
  }
  return parametres;
}
let parametres = initParametres();
activeParametres();



/////////////////////////////////////////////
// Modifie l'application selon les paramètres
function activeParametres(param = null, value = null)
{
  parametresData.forEach(p => {
    const k = parametres.findIndex(e => e.id == p.id);
    if (k != -1)
    {
      if (param === p.id || param == null)
      {
        const val = value || parametres[k].valeur;
        if (val === 0)
        {          
          if (p.bouton != null)
          {
            const bouton = document.getElementById(p.bouton).querySelector('.material-icons');
            bouton.innerHTML = bouton.parentElement.dataset.off;
          }
          else if (p.switch != null)
          {
            const interrupteur = document.getElementById(p.switch);
            interrupteur.checked = false;
          }
          wait(200).then(() => {
            if (p.classType == 'negative')
              document.documentElement.classList.add(p.classe);
            else
              document.documentElement.classList.remove(p.classe);
          });
        }
        else if (val === 1)
        {       
          if (p.bouton != null)
          {
            const bouton = document.getElementById(p.bouton).querySelector('.material-icons');
            bouton.innerHTML = bouton.parentElement.dataset.on;
          }
          else if (p.switch != null)
          {
            const interrupteur = document.getElementById(p.switch);
            interrupteur.checked = true;
          }
          wait(200).then(() => {
            if (p.classType == 'positive')
              document.documentElement.classList.add(p.classe);
            else
              document.documentElement.classList.remove(p.classe);
          });
        }
      }
    }
  });
}



///////////////////////
// Modifie un paramètre
function changeParametre(param)
{
  //let parametres = JSON.parse(localStorage.getItem('solaire/parametres'));
  const k = parametres.findIndex(e => e.id == param);
  if (k != -1)
  {
    const val = (parametres[k].valeur === 0) ? 1 : 0;
    parametres[k].valeur = val;
    localStorage.setItem('solaire/parametres', JSON.stringify(parametres));
    activeParametres(param, val);
  }
}



//////////////////////////////
// Donne l'état d'un paramètre
function getParametre(param)
{
  const k = parametres.findIndex(e => e.id == param);
  if (k != -1)
    return parametres[k].valeur;
}



////////////////////////
// Switch des paramètres

parametresData.forEach(e => {
  if (typeof e.switch !== 'undefined')
  {
    const leSwitch = document.getElementById(e.switch);
    leSwitch.addEventListener('click', () => {
      changeParametre(e.id);
    }, {passive: true});
  }
});





/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! BOUTONS ET MENUS !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/



///////////////////////////////
// Boutons précédent et suivant
document.getElementById('bouton-precedent').addEventListener('click', event => {
  closePops();
  history.back();
});

document.getElementById('bouton-suivant').addEventListener('click', event => {
  closePops();
  history.forward();
});



///////////////
// Bouton pause
let pulseTimeout;
document.getElementById('bouton-pause').addEventListener('click', event => {
  closePops()
  .then(() => {
    /*pulseBouton(event)
    .then(() => */changeParametre('animation')/*)*/;
  });
}, {passive: true});



////////////////////////////
// Champ de saisie d'adresse
document.getElementById('code-saisi').addEventListener('focus', event => {
  const inputCode = event.currentTarget;

  if (navigator.clipboard)
  {
    navigator.clipboard.readText()
    .then(texte => { 
      if (isNaN(texte))
      {
        try {
          inputCode.value = texte.match(/(solaire\/systeme\/)(.+)/)[2];
        }
        catch(error) {
          inputCode.value = '';
        }
      }
      else
        inputCode.value = texte;
    });
  }

  inputCode.addEventListener('paste', event => {
    event.preventDefault();
    let texte = (event.clipboardData || window.clipboardData).getData('text');
    if (isNaN(texte))
    {
      try {
        texte = texte.match(/(solaire\/systeme\/)(.+)/)[2];
      }
      catch(error) {
        texte = '';
      }
    }
    inputCode.value = texte;
  });
});

document.getElementById('bouton-code-saisi').addEventListener('click', () => visiterSaisie());

Array.from(document.querySelectorAll('.onglet')).forEach(onglet => {
  onglet.addEventListener('click', event => ongletCarnet(event.currentTarget.id));
})



//////////////////
// Bouton explorer
document.getElementById('bouton-explorer').addEventListener('click', event => {
  pulseBouton(event)
  .then(() => visiter(null));
}, {passive: true});



/////////////////////
// Bouton découvertes
document.getElementById('bouton-decouvertes').addEventListener('click', event => {
  togglePop('decouvertes')
  .then(() => {
    const onglet = document.getElementById('pop-decouvertes').classList.contains('on-decouvertes') ? 'onglet-decouvertes' : 
                   document.getElementById('pop-decouvertes').classList.contains('on-navigation') ? 'onglet-navigation' : '';
    ongletCarnet(onglet);
  });
});

// Bouton supprimer découvertes
document.getElementById('supprimer-decouvertes').addEventListener('click', () => {
  localStorage.removeItem('solaire/decouvertes');
  initDecouvertes();
  peuplerDecouvertes();
})



////////////////////////
// Bouton redimensionner
document.getElementById('bouton-redimensionner').addEventListener('click', event => {
  pulseBouton(event)
  .then(() => {
    visiter(history.state.systeme);
    const boutonRedim = document.getElementById('bouton-redimensionner');
    boutonRedim.classList.remove('needed');
    boutonRedim.disabled = true;
    boutonRedim.tabIndex = -1;
  });
}, {passive: true});



////////////////////////
// Bouton interface
document.getElementById('bouton-interface').addEventListener('click', event => {
  closePops()
  .then(() => {
    const hideInterface = !document.documentElement.classList.contains('no-interface');
    changeParametre('interface');
    Array.from(document.querySelectorAll('.boutons-groupe>button')).forEach(b => {
      if (b.id != 'bouton-explorer' && b.id != 'bouton-interface')
        b.tabIndex = hideInterface ? -1 : 0;
    });
    document.querySelector('.reset-zoom').tabIndex = hideInterface ? -1 : (document.querySelector('.reset-zoom').classList.contains('on') ? 0 : -1);
  });
}, {passive: true});



//////////////////
// Bouton partager
function openPartage()
{
  const pop = document.getElementById('pop-partage');
  openPop(pop);
  setTimeout(() => pop.classList.remove('on'), 3000);
}

document.getElementById('bouton-partage').addEventListener('click', event => {
  const codeSysteme = history.state.systeme;
  const urlSysteme = window.location.href.includes(codeSysteme) ? window.location.href : window.location.href + 'systeme/' + codeSysteme;

  if (navigator.share)
  {
    navigator.share({
      title: 'Solaire',
      text: getString('partage-description'),
      url: urlSysteme
    })
    .then(() => console.log('[:)] Système partagé !'))
    .catch(error => console.log('[:(] Erreur de partage...', error));
  }

  else if (navigator.clipboard)
  {
    navigator.clipboard.writeText(urlSysteme)
    .then(() => openPartage())
    .catch(() => notify(getString('erreur-partage'), 'error'));
  }
  
  else
  {
    const input = document.getElementById('url-getter');
    input.innerHTML = urlSysteme;
    input.select();
    let copie = false;

    try {
      copie = document.execCommand('copy');
    } catch(error) {
      console.log('[:(] Copie impossible...');
      notify(getString('erreur-partage'), 'error');
    } finally {
      if (copie)
        openPartage();
    }
  }
});



////////////////////
// Bouton paramètres
document.getElementById('bouton-parametres').addEventListener('click', () => {
  togglePop('parametres');
});



/////////////////////////////////////
// Bouton recherche màj et bouton màj
document.querySelector('.bouton-check-maj').addEventListener('click', () => checkUpdate());
document.getElementById('bouton-maj').addEventListener('click', () => appUpdate(true));



///////////////////
// Bouton resetZoom
document.querySelector('.reset-zoom').addEventListener('click', () => resetWindow());



////////////////////////////
// Pop nouvelles découvertes
document.getElementById('pop-nouvelle-decouverte').addEventListener('click', () => closePops());



//////////////////////////////////////////////////////////////////
// Empêche les boutons de garder le focus si on utilise la souris,
// pour éviter le contour blanc.
Array.from(document.querySelectorAll('button')).forEach(e => {
  e.addEventListener('mouseleave', () => {
    e.blur();
  });
});



//////////////////////////
// Ouvre une section (pop)
let isPopOpen = 0;
function openPop(pop) {
  return closePops()
  .then(() => {
    const isOn = (pop.classList.contains('on'));
    if (!isOn)
    {
      window.addEventListener('keydown', window.cp = event => {
        const key = event.which || event.keyCode;
        if (key == 27) closePops();
      });

      pop.classList.add('on');
      conteneurSysteme.addEventListener('click', closePops);
      if (!['pop-notification', 'pop-nouvelle-decouverte', 'pop-parametres'].includes(pop.id))
        isPopOpen = 1;

      if (pop.id == 'pop-parametres' || pop.id == 'pop-decouvertes')
      {
        // On désactive le focus des boutons en-dehors du pop (et de son bouton d'ouverture)
        Array.from(document.querySelectorAll('.boutons-groupe>button')).forEach(b => {
          if (!b.id.includes(pop.id.replace('pop-', '')))
            b.tabIndex = -1;
        });
        document.querySelector('.reset-zoom').tabIndex = -1;
      }

      // On active les boutons présents dans le pop
      Array.from(pop.querySelectorAll('button, input')).forEach(b => {
        b.disabled = false;
        b.tabIndex = 0;
      });
      Array.from(pop.querySelectorAll('.focusable')).forEach(b => {
        b.tabIndex = 0;
      });
    }
    return wait(100);
  });
}



///////////////////////////////////////////
// Ferme toutes les sections (pop) ouvertes
function closePops() {
  return new Promise(resolve => {
    clearTimeout(popTimeout);
    let open = 0;
    Array.from(document.getElementsByClassName('minipop')).forEach(pop => {
      if (pop.classList.contains('on'))
      {
        pop.classList.remove('on');
        
        // On active les boutons en-dehors des pops
        Array.from(document.querySelectorAll('.boutons-groupe>button')).forEach(b => {
          b.tabIndex = 0;
        });
        document.querySelector('.reset-zoom').tabIndex = document.querySelector('.reset-zoom').classList.contains('on') ? 0 : -1;

        // On désactive les boutons dans les pops
        Array.from(pop.querySelectorAll('button, input')).forEach(b => {
          b.disabled = true;
          b.tabIndex = -1;
        });
        Array.from(pop.querySelectorAll('.focusable')).forEach(b => {
          b.tabIndex = -1;
        });
        open++;
      }
    });
    const elementsToBlur = [document.getElementById('code-saisi')];
    elementsToBlur.forEach(e => {
      if (e != null)
      {
        e.blur();
        e.value = '';
      }
    });
    let delay = (open > 0) ? 200 : 0;
    document.getElementById('systeme').removeEventListener('click', closePops);
    window.removeEventListener('keydown', window.cp);
    isPopOpen = 0;
    setTimeout(() => resolve(open), delay);
  });
}



/////////////////////////////
// Toggle la section (pop) id
function togglePop(id) {
  const pop = document.getElementById('pop-' + id);
  const bouton = document.getElementById('bouton-' + id);
  bouton.blur();
  const isOn = (pop.classList.contains('on'));
  if (isOn)
    return closePops();
  else
    return openPop(pop);
}



///////////////////////////////////////////////////
// Affiche l'effet d'onde autour d'un bouton cliqué
function pulseBouton(event)
{
  return new Promise(resolve => {
    const that = event.currentTarget;
    clearTimeout(pulseTimeout);
    that.classList.add('on');
    pulseTimeout = setTimeout(() => {
      that.classList.remove('on');
      resolve();
    }, 200);
  });
}



/////////////////////////////////////////
// Change d'onglet dans le carnet de bord
function ongletCarnet(ongletId)
{
  const id = ongletId.replace('onglet-', '');
  const onglets = ['decouvertes', 'navigation'];
  const pop = document.getElementById('pop-decouvertes');
  onglets.forEach(e => {
    if (e != ongletId)
    {
      pop.classList.remove('on-' + e);
      document.getElementById('onglet-' + e).classList.remove('on');
    }
  });
  pop.classList.add('on-' + id);
  document.getElementById('onglet-' + id).classList.add('on');

  if (id == 'navigation' && pop.classList.contains('on'))
  {
    document.getElementById('code-saisi').disabled = false;
    document.getElementById('code-saisi').tabIndex = 0;
    document.getElementById('bouton-code-saisi').disabled = false;
    document.getElementById('bouton-code-saisi').tabIndex = 0;
    Array.from(pop.querySelector('.liste-decouvertes').querySelectorAll('button, input, .focusable')).forEach(b => {
      b.tabIndex = -1;
    });
    Array.from(pop.querySelector('.liste-navigation').querySelectorAll('button, input, .focusable')).forEach(b => {
      b.tabIndex = 0;
    });
    document.getElementById('supprimer-decouvertes').tabIndex = -1;
  }
  else if (id == 'decouvertes' && pop.classList.contains('on'))
  {
    document.getElementById('code-saisi').disabled = true;
    document.getElementById('code-saisi').tabIndex = -1;
    document.getElementById('bouton-code-saisi').disabled = true;
    document.getElementById('bouton-code-saisi').tabIndex = -1;
    Array.from(pop.querySelector('.liste-decouvertes').querySelectorAll('button, input, .focusable')).forEach(b => {
      b.tabIndex = 0;
    });
    Array.from(pop.querySelector('.liste-navigation').querySelectorAll('button, input, .focusable')).forEach(b => {
      b.tabIndex = -1;
    });
    document.getElementById('supprimer-decouvertes').tabIndex = 0;
  }
}



/////////////////////////////////////////////
// Affiche une notification en bas de l'écran
function notify(message, type = null, duree = 5000, boutons = false)
{
  const icone = document.querySelector('.notification-icone');
  const notification = document.querySelector('.notification-message');
  const actions = document.querySelector('.notification-actions');
  icone.innerHTML = '';
  notification.innerHTML = '';
  actions.innerHTML = '';
  const types = ['error'];

  return new Promise(resolve => {
    closePops()
    .then(() => {
      // Icône de notification, si un type est fourni
      types.forEach(t => { notification.parentElement.classList.remove(t); });
      if (type != null)
      {
        notification.parentElement.classList.add(type);
        icone.innerHTML += '<i class="material-icons">' + type + '</i>';
      }

      // Message de notification
      notification.innerHTML += message;

      // Boutons de la notification, si des actions sont fournies :
      //// "boutons" est un array d'objets de la forme { texte: '', action: fonction, type: 'normal'/'icone' }
      if (boutons)
      {
        boutons.forEach(e => {
          const bouton = document.createElement('button');
          if (e.type == 'icone')
            bouton.innerHTML = '<i class="material-icons">' + e.texte + '</i>';
          else
            bouton.innerHTML = e.texte;
          bouton.onclick = () => { e.action() };
          actions.appendChild(bouton);
        });
      }

      // Ouverture puis fermeture de la notification
      openPop(notification.parentElement);
      popTimeout = setTimeout(() => {
        closePops()
        .then(() => {
          icone.innerHTML = '';
          notification.innerHTML = '';
          actions.innerHTML = '';
          return resolve();
        });
      }, duree);
    })
  })
  .catch(error => console.log(error));
}



///////////////////////////////////////////////////////////////////////
// Gère le focus sur les éléments non-boutons, avec la classe focusable

// Spécifie quel objet est en focus
let focused = false;
function iFocus(element)
{
  if (focused != element)
    focused = element;
}

// Quand un objet est en focus, on surveille les appuis sur entrée et on simule un clic dessus
function createFocusability(parent)
{
  const focusable = Array.from(parent.getElementsByClassName('focusable'));
  focusable.forEach(e => {
    // Quand le focus est placé sur un élément, on le met dans la variable focused
    e.addEventListener('focusin', () => {
      iFocus(e);
    });

    // Quand on appuie sur entrée alors qu'un élément est en focus, on simule un clic dessus
    // sauf si c'est un a avec attribut href.
    e.addEventListener('keypress', event => {
      if (e.tagName.toLowerCase() != 'button')
      {
        const key = event.which || event.keyCode;
        if (key === 13 || key == 32)
        {
          if (!e.getAttribute('href'))
            simulateClick(e);
        }
      }
    });

    // On perd le focus après avoir cliqué sur l'élément, sinon il garde son style :focus
    e.addEventListener('mouseleave', () => {
      e.blur();
    });
  });
}
createFocusability(document);



/////////////////////////////////
// Simule un click sur un élément
function simulateClick(elem, x = 0, y = 0) {
	const event = new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
    view: window,
    clientX: x,
    clientY: y
  });
  elem.dispatchEvent(event);
};





/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! ADAPTATION DE L'APPLI À L'ÉCRAN !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/


const conteneurSysteme = document.querySelector('.conteneur-systeme');

///////////////////////////////////////////
// Adapte le système à la taille de l'écran
function resetWindow()
{
  minZoom = 1.01 * Math.max(window.fenetre.largeur, window.fenetre.hauteur) / window.bodySize;
  const coeff = (minZoom > 1) ? minZoom : 1;
  const posX = 0.5 * (coeff * window.bodySize - window.fenetre.largeur);
  const posY = 0.5 * (coeff * window.bodySize - window.fenetre.hauteur);
  /*document.querySelector('.zoom-percent').innerHTML = '100%';
  document.querySelector('.reset-zoom>i').innerHTML = 'zoom_in';*/
  div_systeme.style.setProperty('--zoom', coeff);
  ancienZoom = coeff;
  document.querySelector('.reset-zoom').classList.remove('on');
  document.querySelector('.reset-zoom').tabIndex = -1;
  conteneurSysteme.customScroll(posX, posY);
}



/////////////////////////////////////////////////////////////////////
// Scrolle avec une méthode différente selon le support du navigateur
HTMLElement.prototype.customScroll = function(x, y) {
  if (typeof this.scrollTo === 'undefined') {
    this.scrollLeft = x;
    this.scrollTop = y;
  } else {
    this.scrollTo(x, y);
  }
}



///////////////////////////////////////////////
// Recalcule ce qu'il faut au redimensionnement
function recalcOnResize() {
  Array.from(document.getElementsByClassName('minipop')).forEach((e, k) => {
    e.style.setProperty('--ordre', k);
    let id = e.id.replace('pop-', '');
    if (id == 'nouvelle-decouverte')
      id = 'decouvertes';
  });

  window.fenetre.largeur = window.innerWidth;
  window.fenetre.hauteur = window.innerHeight;
  window.taille_fenetre = Math.max(window.fenetre.largeur, window.fenetre.hauteur);
  if (typeof astre !== 'undefined')
    window.coeff_fenetre = Math.round(100 * window.taille_fenetre / astre.taille_fenetre) / 100;
  else
    window.coeff_fenetre = 1;
}



//////////////////////////////////
// On détecte le redimensionnement
function callResize() {
  clearTimeout(resizing);
  resizing = setTimeout(() => {
    recalcOnResize();
    const devraitRedimensionner = (window.taille_fenetre / window.taille_fenetre_pendant_generation > 1.2 || window.taille_fenetre / window.taille_fenetre_pendant_generation < 0.8);
    if (window.taille_fenetre != window.taille_fenetre_pendant_generation && devraitRedimensionner)
    {
      document.getElementById('bouton-redimensionner').classList.add('needed');
      document.getElementById('bouton-redimensionner').disabled = false;
      document.getElementById('bouton-redimensionner').tabIndex = 0;
    }
    else
    {
      document.getElementById('bouton-redimensionner').classList.remove('needed');
      document.getElementById('bouton-redimensionner').disabled = true;
      document.getElementById('bouton-redimensionner').tabIndex = -1;
    }
  }, 100);
}





/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! REPRODUCTION DES FONCTIONS DE NAVIGATEUR !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! (SCROLL, ZOOM ET HISTORIQUE)             !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/



/////////////////////////////////////////////////////////////////////////////
// Renvoie les coordonnées du scroll afin de ne pas scroller hors du système,
// avec en entrée coords = [left, top].
function scrollBound(coords)
{
  return [
    Math.max(0, Math.min(coords[0], ancienZoom * window.bodySize - window.fenetre.largeur)),
    Math.max(0, Math.min(coords[1], ancienZoom * window.bodySize - window.fenetre.hauteur))
  ];
}



///////////////////////////////
// Gestion du scrolling custom

let patience = 1;
let lastTouch;

function systemeScroll(event)
{
  if (patience)
  {
    patience = 0;
    let newTouch;
    if (typeof event.touches !== 'undefined')
      newTouch = [event.touches[0].clientX, event.touches[0].clientY];
    else
      newTouch = [event.clientX, event.clientY];
    const newScroll = [lastTouch[0] - newTouch[0], lastTouch[1] - newTouch[1]];
    lastTouch = newTouch;

    const newCoords = scrollBound([
      conteneurSysteme.scrollLeft + newScroll[0],
      conteneurSysteme.scrollTop + newScroll[1]]
    );
    conteneurSysteme.customScroll(newCoords[0], newCoords[1]);

    requestAnimationFrame(() => { patience = 1 });
  }
}



/////////////////////////
// Gestion du zoom custom

let minZoom = 1;
let maxZoom = 3;
let ancienZoom = 1;

function zoom(nouveauZoom, point = { clientX: window.fenetre.largeur / 2, clientY: window.fenetre.hauteur / 2 })
{
  if (ancienZoom == 1)
  {
    document.querySelector('.reset-zoom').classList.add('on');
    document.querySelector('.reset-zoom').tabIndex = 0;
  }
  if (nouveauZoom > 1)
    document.querySelector('.reset-zoom>i').innerHTML = 'zoom_in';
  else if (nouveauZoom < 1)
    document.querySelector('.reset-zoom>i').innerHTML = 'zoom_out';

  const Z = nouveauZoom / ancienZoom;
  document.getElementById('systeme').style.setProperty('--zoom', nouveauZoom);
  document.querySelector('.zoom-percent').innerHTML = Math.round(100 * nouveauZoom) + '%';

  const past = {
    scrollX: conteneurSysteme.scrollLeft,
    scrollY: conteneurSysteme.scrollTop
  };
  ancienZoom = nouveauZoom; // avant scrollBound pour qu'il calcule la limite selon le nouveau zoom

  const newCoords = scrollBound([
    Z * past.scrollX + point.clientX * (Z - 1),
    Z * past.scrollY + point.clientY * (Z - 1)
  ]);
  const futur = {
    scrollX: newCoords[0],
    scrollY: newCoords[1]
  };
  return futur;
}

let ancienEcart = -1;
let premierEcart = 0;
let premierPinchyZoom = 1;
let pointDeZoom = 0;

function pinch_move(event)
{
  event.preventDefault();
  if (event.touches.length == 2 && patience)
  {
    let doI = 0;
    let futur;
    patience = 0;

    const ecartX = Math.abs(Math.round(event.touches[0].clientX) - Math.round(event.touches[1].clientX));
    const ecartY = Math.abs(Math.round(event.touches[0].clientY) - Math.round(event.touches[1].clientY));
    const ecart = Math.sqrt(Math.pow(ecartX, 2) + Math.pow(ecartY, 2));

    const z = Math.max(minZoom, Math.min(premierPinchyZoom * Math.round(100 * ecart / premierEcart) / 100, maxZoom));
    if (z != ancienZoom)
    {
      doI = 1;
      futur = zoom(z, pointDeZoom);
    }

    ancienEcart = ecart;
    
    if (doI)
      conteneurSysteme.customScroll(futur.scrollX, futur.scrollY);
    
    requestAnimationFrame(() => { patience = 1 });
  }
}



////////////////////////////////////////////////////////////////
// On surveille les événements qui déclenchent le scroll ou zoom
let firstTouch;

// On surveille le scroll à la souris
div_systeme.addEventListener('mousedown', div_systeme.md = event => {
  if (patience && !isPopOpen)
  {
    patience = 0;

    event.preventDefault();
    firstTouch = [event.clientX, event.clientY];
    lastTouch = firstTouch;

    window.addEventListener('mouseup', div_systeme.mu = () => {
      div_systeme.removeEventListener('mousemove', systemeScroll);
      window.removeEventListener('mouseup', div_systeme.mu);
    });

    div_systeme.addEventListener('mousemove', systemeScroll);

    requestAnimationFrame(() => { patience = 1 });
  }
});

// On surveille le zoom à la molette
document.addEventListener('wheel', event => {
  event.preventDefault();
  if (patience && !isPopOpen)
  {
    patience = 0;
    const deltaY = Math.sign(event.deltaY);
    const z = Math.max(minZoom, Math.min(ancienZoom * (1 - .1 * deltaY), maxZoom));
    const point = {
      clientX: event.clientX,
      clientY: event.clientY
    };

    /*if (z != ancienZoom)
    {*/
      const futur = zoom(z, point);
      conteneurSysteme.customScroll(futur.scrollX, futur.scrollY);
    /*}*/

    requestAnimationFrame(() => { patience = 1 });
  }
}, {passive: false});

// On surveille le scroll et le zoom au toucher
div_systeme.addEventListener('touchstart', gestionTouch);
div_systeme.addEventListener('touchend', gestionTouch);

let isClick, isClickTimer;
function gestionTouch(event)
{
  if (isPopOpen)
    return;

  // Zoom
  if (event.touches.length == 2)
  {
    event.preventDefault();
    pointDeZoom = {
      clientX: 0.5 * (event.touches[0].clientX + event.touches[1].clientX),
      clientY: 0.5 * (event.touches[0].clientY + event.touches[1].clientY)
    };
    premierPinchyZoom = ancienZoom;
    const ecartX = Math.abs(Math.round(event.touches[0].clientX) - Math.round(event.touches[1].clientX));
    const ecartY = Math.abs(Math.round(event.touches[0].clientY) - Math.round(event.touches[1].clientY));
    const ecart = Math.sqrt(Math.pow(ecartX, 2) + Math.pow(ecartY, 2));
    premierEcart = ecart;
    ancienEcart = premierEcart;
    
    div_systeme.addEventListener('touchmove', pinch_move);
  }
  else
  {
    div_systeme.removeEventListener('touchmove', pinch_move);
    ancienEcart = -1;
    pointDeZoom = 0;
  }

  // Scrolling
  if (event.touches.length == 1)
  {
    event.preventDefault();
    firstTouch = [event.touches[0].clientX, event.touches[0].clientY];
    lastTouch = firstTouch;

    div_systeme.addEventListener('touchmove', systemeScroll);
  }
  else
  {
    div_systeme.removeEventListener('touchmove', systemeScroll);
  }

  // Fermeture des menus ouverts
  if (event.type == 'touchstart')
  {
    isClick = 1;
    clearTimeout(isClickTimer);
    isClickTimer = setTimeout(() => { isClick = 0; }, 400);
  }

  if (event.type == 'touchend' && event.touches.length == 0)
  {
    clearTimeout(isClickTimer);
    if (isClick)
      closePops();
    else
      event.preventDefault();
  }
}

// On grab le bouton de zoom pour le tirer vers le haut ou bas

/*const resetZoom = document.querySelector('.reset-zoom');
const rzConteneur = document.getElementById('zoom-manuel');
resetZoom.addEventListener('mouseenter', event => {
  rzConteneur.classList.add('track-visible');
});
rzConteneur.addEventListener('mouseleave', event => {
  rzConteneur.classList.remove('track-visible');
});
resetZoom.addEventListener('mousedown', resetZoom.md = event => {
  const firstY = event.clientY;
  const rzSize = resetZoom.clientHeight;

  window.addEventListener('mousemove', resetZoom.mm = moveEvent => {
    if (patience)
    {
      patience = 0;
      const moveY = Math.min(rzSize, Math.max(-1 * rzSize, Math.round(moveEvent.clientY - firstY)));
      resetZoom.style.setProperty('--move-y', moveY);
      requestAnimationFrame(() => { patience = 1; });
    }
  });

  window.addEventListener('mouseup', resetZoom.mu = () => {
    resetZoom.style.setProperty('--move-y', 0);
    window.removeEventListener('mousemove', resetZoom.mm);
    window.removeEventListener('mouseup', resetZoom.mu);
  })
});*/



////////////////////
// Gère l'historique
window.addEventListener('popstate', event => {
  const codeSysteme = event.state.systeme;
  try {
    if (codeSysteme != null)
      queLaLumiereSoit(codeSysteme, event.state.date);
    else
      queLaLumiereSoit();
  } catch(error) {
    notify(getString('erreur-systeme-non-atteint'), 'error');
    throw 'Erreur de génération';
  }

  const boutonSuivant = document.getElementById('bouton-suivant');
  if (event.state.date != window.derniereGeneration)
  {
    boutonSuivant.disabled = false;
    boutonSuivant.tabIndex = 0;
  }
  else
  {
    boutonSuivant.disabled = true;
    boutonSuivant.tabIndex = -1;
  }
}, false);





/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! LANCEMENT DE L'APPLICATION !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/



/////////////////////////////////////////////////////
// On enregistre le service worker
// et on le met à jour si la version du site a changé
window.onload = function()
{
  let nouvelUnivers;

  const warning = document.querySelector('.warning');
  if (getComputedStyle(warning).display == 'none')
  {
    warning.remove();
    document.getElementById('warning-edge').remove();
  }
  else
  {
    const bouton = document.getElementById('bouton-pause');
    bouton.querySelector('i').innerHTML = 'play_arrow';
    bouton.disabled = true;
    bouton.tabIndex = -1;
    bouton.title = 'Microsoft Edge supporte mal la présence de certaines variables CSS dans les animations de Solaire. Par conséquent, elles sont désactivées. Désolé pour ce désagrément !';
  }

  Promise.resolve()
  .then(textualiser)
  .then(() => {
    peuplerDecouvertes();
    peuplerFavoris();
    ongletCarnet('onglet-decouvertes');
    document.getElementById('code-saisi').placeholder = getString('saisie-placeholder');
    if (navigator.share || navigator.clipboard)
      document.getElementById('url-getter').remove();
    return queLaLumiereSoit(seed, window.derniereGeneration);
  })
  .catch(error => {
    notify(getString('erreur-' + error), 'error');
    return queLaLumiereSoit();
  })
  .then(decouvertesDansCeSysteme => {
    nouvelUnivers = comparerVersionUnivers();
    requestAnimationFrame(() => {
      setTimeout(() => {
        if (document.querySelector('#welcome') != null)
          document.getElementById('welcome').remove();
        window.addEventListener('resize', callResize);
        window.addEventListener('orientationchange', callResize);
        //div_systeme.addEventListener('touchstart', pinch_start);
        
        favoriActuel();
        nouvellesDecouvertes(Array.from(decouvertesDansCeSysteme), (nouvelUnivers === 'notify'));
      }, 100);
    });
  });

  if ('serviceWorker' in navigator)
  {
    if (navigator.serviceWorker.controller != null)
    {
      currentWorker = navigator.serviceWorker.controller;
      isStarted = 1;
      console.log('[sw] Démarrage...');
      appStart();
    }

    navigator.serviceWorker.register('/solaire/service-worker.js')
    .then(registration => {
      console.log('Le service worker a été enregistré', registration);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state == 'activated')
          {
            console.log('[sw] Service worker mis à jour');
            currentWorker = newWorker;
            /*const actions = [
              { texte: 'refresh', action: (() => location.reload(true)), type: 'icone' },
              { texte: 'close', action: closePops, type: 'icone' }
            ];
            notify('Une mise à jour a été installée.', null, 20000, actions);*/
          }
        });
      });
      return registration.installing || navigator.serviceWorker.controller || registration.active;
    })
    .then(sw => {
      currentWorker = sw;
      if (!isStarted)
      {
        console.log('[sw] Démarrage...');
        appStart();
      }
      else if (appChargee === true)
        checkUpdate();
    })
    .catch(error => {
      console.error(error);
      if (!isStarted)
      {
        console.log('[non-sw] Démarrage...');
        noStart();
      }
    })
  }
  else
  {
    console.log('[non-sw:not-in-navigator] Démarrage...');
    noStart();
  }
}