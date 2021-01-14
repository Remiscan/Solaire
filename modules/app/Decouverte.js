import { getString } from './traduction.js';
import { Menu } from './Menu.js';



//////////////////////////////////////////////////////////////
//
// Les découvertes sont localement stockées dans localStorage,
// sous l'id 'solaire/decouvertes' contenant un array d'objets
// de la forme { id: 'planete-anneau', systeme: 9865645 } pour
// chaque découverte connue.
//
//////////////////////////////////////////////////////////////

const data = [
  'planete-anneaux',
  'lune-interanneaux',
  'planete-lunes',
  'etoile-binaire',
  'etoile-neutrons',
  'trounoir',
  'trounoir-anneau'/*,
  'sphere-dyson'*/
];

const decouvertes = [];
let initialised = false;



export class Decouverte {
  constructor(id) {
    this.id = id;
    this.unlocked = false;
    this.systeme = null;
    this.new = false;
  }


  /////////////////////////
  // Débloque la découverte
  unlock(adresse) {
    if (this.unlocked) return 0;
    this.unlocked = true;
    this.systeme = adresse;
    this.new = true;
    return 1;
  }


  ///////////////////////
  // Bloque la découverte
  lock() {
    if (!this.unlocked) return;
    this.unlocked = false;
    this.systeme = null;
    this.new = false;
  }


  ///////////////////////////////////////////////////
  // Vérifie si une découverte (id) est connue ou non
  static check(id) {
    if (!initialised) throw 'Découvertes non initialisées';
    
    const k = decouvertes.findIndex(d => d.id == id);
    if (k == -1)
      throw 'Découverte inexistante';
    const dec = decouvertes[k];
    return !dec.unlocked;
  }


  ////////////////////////////////////////////////////////
  // Débloque une découverte (id) et y associe son système
  static add(id, adresse) {
    if (!initialised) throw 'Découvertes non initialisées';
    
    const k = decouvertes.findIndex(d => d.id == id);
    if (k == -1) throw 'Découverte inexistante';
    const dec = decouvertes[k];
    return dec.unlock(adresse);
  }


  ////////////////////////////////////////////
  // Renvoie une liste des découvertes connues
  static get connues() {
    if (!initialised) throw 'Découvertes non initialisées';
    
    const c = [];
    for (const d of decouvertes) {
      if (d.unlocked) c.push(d);
    }
    return c;
  }


  //////////////////////////////////////////////
  // Renvoie une liste des découvertes nouvelles
  static get nouvelles() {
    if (!initialised) throw 'Découvertes non initialisées';
    
    const c = [];
    for (const d of decouvertes) {
      if (d.new) c.push(d.id);
    }
    return c;
  }


  ////////////////////////////////////////////////
  // Renvoie les données de toutes les découvertes
  static get all() {
    return data;
  }


  /////////////////////////////
  // Initialise les découvertes
  static init() {
    if (initialised) throw 'Découvertes déjà initialisées';
    
    const savedData = JSON.parse(localStorage.getItem('solaire/decouvertes')) || [];

    for (const d of data) {
      const dec = new Decouverte(d);

      const k = savedData.findIndex(s => s.id == d);
      if (k != -1) {
        dec.unlock(savedData[k].systeme);
        dec.new = false;
      }

      decouvertes.push(dec);
    }

    Decouverte.save();
    initialised = true;
  }


  //////////////////////////////////////////////////////
  // Sauvegarde les découvertes dans les données locales
  static save() {
    const savedData = [];
    for (const d of decouvertes) {
      if (d.unlocked) savedData.push({ id: d.id, systeme: d.systeme });
    }
    localStorage.setItem('solaire/decouvertes', JSON.stringify(savedData));
  }


  /////////////////////////////////////////
  // Supprime la sauvegarde des découvertes
  static clearAll() {
    for (const d of Decouverte.connues) {
      d.lock();
    }
    Decouverte.populate();
    Decouverte.save();
  }


  /////////////////////////////////////////////////////
  // Affiche les découvertes dans le menu correspondant
  static async populate() {
    if (!initialised) throw 'Découvertes non initialisées';

    const liste = document.getElementById('pop-decouvertes').querySelector('.liste-decouvertes');
    const listeNew = document.getElementById('pop-nouvelle-decouverte').querySelector('.liste-nouvelle-decouverte');
    liste.innerHTML = '';
    listeNew.innerHTML = '';

    const nouvelles = Decouverte.nouvelles;

    for (const d of decouvertes) {
      if (d.unlocked) {
        liste.innerHTML += `
          <div class="decouverte" data-decouverte="${d.id}">
            <i class="material-icons icon">bookmark</i>
            <span class="decouverte-titre" data-string="decouverte-${d.id}-titre">
              ${getString('decouverte-' + d.id + '-titre')}
            </span>
            <span class="decouverte-description" data-string="decouverte-${d.id}-description">
              ${getString('decouverte-' + d.id + '-description')}
            </span>
            <button class="decouverte-lien" tabindex="-1" disabled>
              <i class="material-icons">explore</i>
              <span data-string="bouton-revisiter">
                ${getString('bouton-revisiter')}
              </span>
            </button>
          </div>
        `;

        d.element.querySelector('.decouverte-lien').onclick = d.go;
      }
      else {
        liste.innerHTML += `
          <div class="decouverte non">
            <i class="material-icons icon">bookmark_border</i>
            <span class="decouverte-titre">
              ???
            </span>
            <span class="decouverte-description"></span>
          </div>
        `;
      }

      if (d.new) {
        d.new = false;
        listeNew.innerHTML += `
          <div class="decouverte new">
            <i class="material-icons icon">bookmark</i>
            <span class="decouverte-titre">
              ${getString('decouverte-' + d.id + '-titre')}
            </span>
            <span class="decouverte-description">
              ${getString('decouverte-' + d.id + '-description')}
            </span>
          </div>
        `;
      }
    }

    // Notification des nouvelles découvertes
    let texte;
    if (nouvelles.length <= 1)
      texte = getString('notification-une-decouverte');
    else
      texte = getString('notification-plusieurs-decouvertes');
    document.getElementById('pop-nouvelle-decouverte').querySelector('h3').innerHTML = texte;

    if (nouvelles.length > 0) {
      Menu.ongletCarnet('onglet-decouvertes');
      setTimeout(() => Menu.get('nouvelle-decouverte').open(), 500);
    }
  }


  ///////////////////////////////////////////
  // Voyage jusqu'au système de la découverte
  go() {
    const ev = new CustomEvent('voyage', { detail: { systeme: this.systeme } });
    window.dispatchEvent(ev);
  }


  //////////////////////////////////////
  // Récupère l'élément de la découverte
  get element() {
    return document.querySelector(`.decouverte[data-decouverte="${this.id}"]`);
  }
}