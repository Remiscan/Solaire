import { Decouverte } from './Decouverte.js';
import { getString } from './traduction.js';
import { Seed } from '../systeme/Seed.js';
import { createFocusability } from './interface.js';



const favoris = new Set();
const favSystemes = new Set();
let initialised = false;



export class Favoris {
  constructor(seed) {
    if (favSystemes.has(seed)) return;

    this.systeme = seed;
    this.saved = false;

    const temp = new MersenneTwister(this.systeme);
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

    temp.rnd(); // On saute les étapes inutiles ici

    this.couleur = Math.floor(360 * temp.rnd());
    this.nombrePlanetes = Math.round(3 + 2 * temp.rnd()) + Math.round(4 + 2 * temp.rnd());
    const titre = Decouverte.all.includes(type) ? getString('decouverte-' + type + '-titre') : '';
    this.titre = (titre != '' ? titre + ', ' : '')
               + this.nombrePlanetes
               + '<span data-string="favori-planetes"> ' + getString('favori-planetes') + '</span>';

    favoris.add(this);
    favSystemes.add(this.systeme);
  }


  ///////////////////////
  // Sauvegarde un favori
  add() {
    if (this.saved) return;

    this.element.querySelector('.icon').innerHTML = 'star';
    this.saved = true;
    Favoris.save();
  }


  ///////////////////
  // Oublie un favori
  remove() {
    if (!this.saved)  return;

    this.element.querySelector('.icon').innerHTML = 'star_border';
    this.saved = false;
    Favoris.save();
  }


  ////////////////////////////////////////////////
  // Sauvegarde ou oublie un favori selon son état
  toggle() {
    if (this.saved) this.remove();
    else            this.add();
  }


  ////////////////////////////////
  // Crée l'élément HTML du favori
  populate() {
    const liste = document.getElementById('pop-decouvertes').querySelector('.liste-navigation');

    // Ajout à la liste du carnet
    let html = `
      <div class="decouverte favori" id="favori-${this.systeme}">
        <i class="material-icons icon focusable" style="--couleur: ${this.couleur};">star_border</i>
        <span class="decouverte-titre">${this.titre}</span>
        <span class="decouverte-description"><span data-string="adresse">${getString('adresse')}</span>${this.systeme}</span>
        <button class="decouverte-lien" tabindex="-1" disabled>
          <i class="material-icons">explore</i>
          <span data-string="bouton-revisiter">Revisiter</span>
        </button>
        <div class="vous-etes-ici">
          <i class="material-icons">place</i>
          <span data-string="bouton-revisiter">${getString('favori-actuel')}</span>
        </div>
      </div>
    `;
    const temp = document.createElement('template');
    temp.innerHTML = html;
    liste.appendChild(temp.content.cloneNode(true));

    // Active le lien
    const element = this.element;
    const lien = element?.querySelector('.decouverte-lien');
    if (lien) lien.addEventListener('click', () => this.go());
    
    // Rend l'icône interactive
    const etoile = element?.querySelector('.icon');
    if (etoile) {
      etoile.addEventListener('click', () => this.toggle());
      etoile.addEventListener('mouseover', () => {
        if (this.saved) etoile.innerHTML = 'star_border';
        else            etoile.innerHTML = 'star';
      });
      etoile.addEventListener('mouseout', () => {
        if (this.saved) etoile.innerHTML = 'star';
        else            etoile.innerHTML = 'star_border';
      });
    }

    return element;
  }


  ////////////////////////////////////
  // Voyage jusqu'au système du favori
  go() {
    const ev = new CustomEvent('voyage', { detail: { systeme: this.systeme } });
    window.dispatchEvent(ev);
  }


  ///////////////////////////////
  // Récupère l'élément du favori
  get element() {
    return document.getElementById(`favori-${this.systeme}`);
  }


  ////////////////////////////////////////////////////
  // Initialise les favoris à partir du stockage local
  static init() {
    if (initialised) throw 'Favoris déjà initialisés';
    
    const savedData = JSON.parse(localStorage.getItem('solaire/favoris')) || [];

    for (const f of savedData) {
      const fav = new Favoris(f, true);
      fav.saved = true;
    }

    initialised = true;
  }


  //////////////////////////////////
  // Met à jour la liste des favoris
  static updateList() {
    if (!initialised) throw 'Favoris non initialisés';
    
    for (const f of favoris) {
      let element = f.element;
      if (f.saved || f.systeme == Seed.current) {
        if (!element) element = f.populate();
        if (f.systeme == Seed.current)  element.classList.add('actuel');
        else                            element.classList.remove('actuel');

        // Affiche l'icône correcte
        const etoile = element.querySelector('.icon');
        if (f.saved) etoile.innerHTML = 'star';
        else         etoile.innerHTML = 'star_border';
      }
      else {
        favoris.delete(this);
        favSystemes.delete(this.systeme);
        if (!!element) element.remove();
      }
    }

    const liste = document.getElementById('pop-decouvertes').querySelector('.liste-navigation');
    createFocusability(liste);
  }


  ////////////////////////////////////////////////
  // Sauvegarde les favoris dans le stockage local
  static save() {
    const savedData = [];
    for (const f of favoris) {
      if (f.saved)  savedData.push(f.systeme);
    }
    localStorage.setItem('solaire/favoris', JSON.stringify(savedData));
  }


  //////////////////////////
  // Efface tous les favoris
  static clearAll() {
    favoris.clear();
    Favoris.updateList();
    Favoris.save();
  }
}