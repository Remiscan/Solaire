import * as App from './app/App.js';
import { Voyage } from './app/Voyage.js';
import './app/custom-scroll-zoom.js';



App.launch();

// Gère l'historique
window.addEventListener('popstate', event => {
  const code = event.state.systeme;
  let voy;
  if (code != null) voy = new Voyage(code, event.state.date);
  else              voy = new Voyage();
  voy.go();
}, false);