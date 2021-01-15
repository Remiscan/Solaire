import { Systeme } from '../systeme/Systeme.js';
import { getString } from './traduction.js';
import { Notification } from './Notification.js';
import { Menu } from './Menu.js';
import { Decouverte } from './Decouverte.js';
import { Favoris } from './Favoris.js';
import { resetWindow } from './custom-scroll-zoom.js';



let derniereGeneration = 0;
let premiereGeneration = 0;



export class Voyage {
  constructor(code, date = Date.now()) {
    this.date = date;

    try {
      if (history.state != null && code == history.state.systeme) throw 'Système actuel';
      
      this.systeme = new Systeme(code);
    }

    catch(raison) {
      if (raison == 'Système actuel')
        this.systeme = new Systeme(code, history.state.date);
      else if (raison == 'Bad seed')
        new Notification(getString('erreur-adresse-invalide'), 'error');
      else if (raison == 'Mauvais système')
        new Notification(getString('erreur-systeme-non-atteint'), 'error');
      else
        console.error(raison);
    }
  }


  /////////////////////
  // Effectue le voyage
  async go() {
    try {
      derniereGeneration = Math.max(derniereGeneration, this.date);
      if (!premiereGeneration) premiereGeneration = this.date;
      await Menu.closeAll();

      // On (dés)active le bouton "suivant"
      const boutonSuivant = document.getElementById('bouton-suivant');
      if (this.date != derniereGeneration) {
        boutonSuivant.disabled = false;
        boutonSuivant.tabIndex = 0;
      } else {
        boutonSuivant.disabled = true;
        boutonSuivant.tabIndex = -1;
      }

      // On (dés)active le bouton "précédent"
      const boutonPrecedent = document.getElementById('bouton-precedent');
      if (this.date > premiereGeneration) {
        boutonPrecedent.disabled = false;
        boutonPrecedent.tabIndex = 0;
      } else {
        boutonPrecedent.disabled = true;
        boutonPrecedent.tabIndex = -1;
      }

      // On masque le bouton "redimensionner"
      const boutonRedim = document.getElementById('bouton-redimensionner');
      boutonRedim.classList.remove('needed');
      boutonRedim.disabled = true;
      boutonRedim.tabIndex = -1;

      // On affiche le système visité
      this.systeme.populate();
      resetWindow();

      // On met à jour l'entrée de l'historique
      if (document.querySelector('#welcome') != null || typeof history.state.systeme == 'undefined' || history.state.systeme == null)
        history.replaceState( { systeme: this.systeme.seed, date: this.date }, '', '/solaire/'/* + 'systeme/' + this.seed*/);
      else if (this.seed != history.state.systeme && this.date != history.state.date)
        history.pushState( { systeme: this.systeme.seed, date: this.date }, '', '/solaire/'/* + 'systeme/' + this.seed*/);

      // On met à jour le carnet de bord avec les découvertes du système visité
      let newDecouvertes = 0;
      this.systeme.decouvertes.forEach(d => {
        const isNew = Decouverte.add(d, this.systeme.seed);
        if (isNew) newDecouvertes++;
      });
      if (newDecouvertes > 0) {
        Decouverte.save();
        Decouverte.updateList();
      }
      new Favoris(this.systeme.seed);
      Favoris.updateList();
    }

    catch(error) {
      new Notification(getString('erreur-systeme-non-atteint'), 'error');
      console.error(error);
    }
  }


  //////////////////////////////////////////////////////////////////////
  // Compte le nombre de nouvelles découvertes dans le système à visiter
  get countDecouvertes() {
    let count = 0;
    for (const dec of this.systeme.decouvertes) {
      if (Decouverte.check(dec))  count++;
    }
    return count;
  }
}


////////////////////////////
// Écoute les event 'voyage'
window.addEventListener('voyage', event => {
  const voy = new Voyage(event.detail.systeme);
  voy.go();
});