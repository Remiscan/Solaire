import { App } from './modules/app/App.js';
import { Voyage } from './modules/app/Voyage.js';
import './modules/app/custom-scroll-zoom.js';



window.onload = App.launch();

// Gère l'historique
window.addEventListener('popstate', event => {
  const code = event.state.systeme;
  let voy;
  if (code != null) voy = new Voyage(code, event.state.date);
  else              voy = new Voyage();
  voy.go();
}, false);