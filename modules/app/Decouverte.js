import dataStorage from './localForage.js';
import { Menu } from './Menu.js';
import { getString } from './traduction.js';



//////////////////////////////////////////////////////////////
//
// Les découvertes sont localement stockées dans localForage,
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
    if (adresse == null) return 0;
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


  /////////////////////////////////////////////
  // Ajoute la découverte aux listes concernées
  populate() {
    const liste = document.getElementById('pop-decouvertes').querySelector('.liste-decouvertes');
    const listeNew = document.getElementById('pop-nouvelle-decouverte').querySelector('.liste-nouvelle-decouverte');

    // Ajout à la liste du carnet
    let html = ``;
    if (this.unlocked) {
      html += `
        <div class="decouverte" data-decouverte="${this.id}">
          <i class="material-icons icon">bookmark</i>
          <span class="decouverte-titre" data-string="decouverte-${this.id}-titre">
            ${getString('decouverte-' + this.id + '-titre')}
          </span>
          <span class="decouverte-description" data-string="decouverte-${this.id}-description">
            ${getString('decouverte-' + this.id + '-description')}
          </span>
          <button type="button" class="decouverte-lien" tabindex="-1" disabled>
            <i class="material-icons">explore</i>
            <span data-string="bouton-revisiter">
              ${getString('bouton-revisiter')}
            </span>
          </button>
        </div>
      `;
    }
    else {
      html += `
        <div class="decouverte non">
          <i class="material-icons icon">bookmark_border</i>
          <span class="decouverte-titre">???</span>
          <span class="decouverte-description"></span>
        </div>
      `;
    }
    const temp = document.createElement('template');
    temp.innerHTML = html;
    liste.appendChild(temp.content.cloneNode(true));
    const lien = this.element?.querySelector('.decouverte-lien');
    if (lien) lien.addEventListener('click', () => this.go());

    // Ajout à la notification de nouvelle découverte
    if (this.new) {
      this.new = false;
      let html = `
        <div class="decouverte new">
          <i class="material-icons icon">bookmark</i>
          <span class="decouverte-titre" data-string="decouverte-${this.id}-titre">
            ${getString('decouverte-' + this.id + '-titre')}
          </span>
          <span class="decouverte-description" data-string="decouverte-${this.id}-description">
            ${getString('decouverte-' + this.id + '-description')}
          </span>
        </div>
      `;
      const temp = document.createElement('template');
      temp.innerHTML = html;
      listeNew.appendChild(temp.content.cloneNode(true));
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


  /////////////////////////////
  // Initialise les découvertes
  static async init() {
    if (initialised) throw 'Découvertes déjà initialisées';
    
    const savedData = await dataStorage.getItem('decouvertes') || [];

    for (const d of data) {
      const dec = new Decouverte(d);

      const k = savedData.findIndex(s => s.id == d);
      if (k != -1) {
        dec.unlock(savedData[k].systeme);
        dec.new = false;
      }

      decouvertes.push(dec);
    }

    await Decouverte.save();
    initialised = true;
    return initialised;
  }


  /////////////////////////////////////////////////////
  // Affiche les découvertes dans le menu correspondant
  static updateList() {
    if (!initialised) throw 'Découvertes non initialisées';

    const liste = document.getElementById('pop-decouvertes').querySelector('.liste-decouvertes');
    const listeNew = document.getElementById('pop-nouvelle-decouverte').querySelector('.liste-nouvelle-decouverte');
    liste.innerHTML = '';
    listeNew.innerHTML = '';

    const nouvelles = Decouverte.nouvelles;

    for (const d of decouvertes) {
      d.populate();
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


  //////////////////////////////////////////////////////
  // Sauvegarde les découvertes dans les données locales
  static async save() {
    const savedData = [];
    for (const d of decouvertes) {
      if (d.unlocked) savedData.push({ id: d.id, systeme: d.systeme });
    }
    return await dataStorage.setItem('decouvertes', savedData);
  }


  /////////////////////////////////////////
  // Supprime la sauvegarde des découvertes
  static async clearAll() {
    for (const d of Decouverte.connues) {
      d.lock();
    }
    Decouverte.updateList();
    await Decouverte.save();
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
}