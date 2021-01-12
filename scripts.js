import { Systeme } from './modules/systeme/Systeme.js';
import { Notification } from './modules/app/Notification.js';
import { App } from './modules/app/App.js';
import './modules/app/custom-scroll-zoom.js';
import { Voyage } from './modules/app/Voyage.js';



window.onload = App.onLaunch();

// Gère l'historique
window.addEventListener('popstate', event => {
  const code = event.state.systeme;
  try {
    let voy;
    if (code != null) voy = new Voyage(code, event.state.date);
    else              voy = new Voyage();
    voy.go();
  }
  
  catch(error) {
    new Notification(getString('erreur-systeme-non-atteint'), 'error');
    throw 'Erreur de génération';
  }
}, false);