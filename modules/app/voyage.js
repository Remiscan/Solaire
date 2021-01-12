import { Systeme } from '../systeme/Systeme.js';
import { getString } from './traduction.js';
import { Notification } from './Notification.js';
import { Menu } from './Menu.js';
import { Decouverte } from './Decouverte.js';
import { resetWindow } from './custom-scroll-zoom.js';
import { Seed } from '../systeme/Seed.js';



let derniereGeneration = 0;



export class Voyage {
  constructor(code, date = Date.now()) {
    this.date = date;

    try {
      if (!Seed.validate(code))           throw 'Code invalide';
      if (code == history.state.systeme)  throw 'Système actuel';
      
      this.systeme = new Systeme(code);
    }

    catch(raison) {
      if (raison == 'Système actuel')
        this.systeme = new Systeme(code, history.state.date);
      else if (raison == 'Code invalide')
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
        history.replaceState( { systeme: this.systeme.seed, date: this.systeme.date }, '', '/solaire/'/* + 'systeme/' + this.seed*/);
      else if (this.seed != history.state.systeme)
        history.pushState( { systeme: this.ysteme.seed, date: this.systeme.date }, '', '/solaire/'/* + 'systeme/' + this.seed*/);

      // On met à jour le carnet de bord avec les découvertes du système visité
      this.systeme.decouvertes.forEach(d => Decouverte.add(d, this.seed));
      Decouverte.save();
      Decouverte.populate();
    }

    catch(error) {
      console.error(error);
    }
  }


  //////////////////////////////////////////////////////////////////////////
  // Prépare et effectue un voyage à partir de l'adresse saisie manuellement
  static saisie() {
    let i_kc = 0;
    const codeSaisi = document.getElementById('code-saisi').value;
    if (codeSaisi != '')
    {
      document.getElementById('code-saisi').readonly = true;
      document.getElementById('code-saisi').blur();
      const isKeyboardClosed = () => {
        i_kc++;
        return new Promise((resolve, reject) => {
          if (document.getElementById('bouton-redimensionner').classList.contains('needed') && i_kc < 50)
            return wait(100).then(reject);
          else {
            i_kc = 0;
            return resolve();
          }
        })
        .catch(isKeyboardClosed);
      }

      isKeyboardClosed()
      .then(() => {
        document.getElementById('code-saisi').readonly = false;
        const voy = new Voyage(codeSaisi);
        voy.go();
      });
    }
  }
}