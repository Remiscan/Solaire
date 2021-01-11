import { Systeme } from './modules/systeme/Systeme.js';
import { Notification } from './modules/app/Notification.js';
import { App } from './modules/app/App.js';
import './modules/app/custom-scroll-zoom.js';



window.onload = App.onLaunch();

// Gère l'historique
window.addEventListener('popstate', event => {
  const codeSysteme = event.state.systeme;
  try {
    let systeme;
    if (codeSysteme != null)
      systeme = new Systeme(codeSysteme, event.state.date);
    else
      systeme = new Systeme();
    systeme.populate();
  } catch(error) {
    new Notification(getString('erreur-systeme-non-atteint'), 'error');
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