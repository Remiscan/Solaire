import { Decouverte } from './Decouverte.js';
import { getString } from './traduction.js';
import { Seed } from '../systeme/Seed.js';
import { createFocusability } from './interface.js';



const favoris = new Set();
const favSystemes = new Set();
let initialised = false;



export class Favoris {
  constructor(seed, init = false) {
    if (favSystemes.has(seed)) return;

    this.systeme = seed;

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

    if (!init)  this.displayed = false;

    favoris.add(this);
    favSystemes.add(this.systeme);

    if (!init)  Favoris.updateList();
  }

  add() {
    if (this.displayed) return;

    const element = document.getElementById(`favori-${this.systeme}`);
    element.querySelector('.icon').classList.add('yes');
    element.querySelector('.icon').innerHTML = 'star';

    this.displayed = true;

    Favoris.save();
  }

  remove() {
    if (!this.displayed)  return;

    const element = document.getElementById(`favori-${this.systeme}`);
    element.querySelector('.icon').classList.remove('yes');
    element.querySelector('.icon').innerHTML = 'star_border';

    this.displayed = false;

    Favoris.save();
  }

  toggle() {
    if (favSystemes.has(this.systeme))  this.remove();
    else                                this.add();
  }

  // Crée l'élément HTML du favoris
  populate() {
    const liste = document.getElementById('pop-decouvertes').querySelector('.liste-navigation');
    liste.innerHTML += `
      <div class="decouverte favori" id="favori-${this.systeme}">
        <i class="material-icons icon yes focusable" style="--couleur: ${this.couleur};">star</i>
        <span class="decouverte-titre">${this.titre}</span>
        <span class="decouverte-description">${getString('adresse') + e.systeme}</span>
        <button class="decouverte-lien ${isHere ? 'off' : ''}" tabindex="-1" disabled>
          <i class="material-icons">explore</i>
          <span data-string="bouton-revisiter">Revisiter</span>
        </button>
        <div class="vous-etes-ici">
          <i class="material-icons">place</i>
          <span data-string="bouton-revisiter">${getString('favori-actuel')}</span>
        </div>
      </div>
    `;

    const element = document.getElementById(`favori-${this.systeme}`);

    element.querySelector('.decouverte-lien').addEventListener('click', () => visiter(this.systeme));
    element.querySelector('.icon').addEventListener('click', this.toggle);
    this.highlight();
  }

  // Change l'icône d'étoile au survol de la souris selon qu'il soit en favori ou non
  highlight() {
    const element = document.getElementById(`favori-${this.systeme}`);
    const etoile = element.querySelector('.icon');
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

  // Initialise les favoris à partir du stockage local
  static init() {
    if (initialised) throw 'Favoris déjà initialisés';
    
    const savedData = JSON.parse(localStorage.getItem('solaire/favoris')) || [];

    for (const f of savedData) {
      const fav = new Favoris(f, true);
    }

    initialised = true;
  }

  // Met à jour la liste des favoris
  static updateList() {
    if (!initialised) throw 'Favoris non initialisés';
    
    for (const f of favoris) {
      let element = document.getElementById(`favori-${this.systeme}`);
      if (f.displayed == true) {
        if (!element) {
          f.populate();
          element = document.getElementById(`favori-${this.systeme}`);
        }
      }
      else if (f.systeme != Seed.current) {
        favoris.delete(this);
        favSystemes.delete(this.systeme);
      }

      if (f.systeme == Seed.current)  element.classList.add('actuel');
      else                            element.classList.remove('actuel');
    }

    const liste = document.getElementById('pop-decouvertes').querySelector('.liste-navigation');
    createFocusability(liste);
  }

  // Sauvegarde les favoris dans le stockage local
  static save() {
    const savedData = [];
    for (const f of favoris) {
      if (f.displayed)  savedData.push(f.systeme);
    }
    localStorage.setItem('solaire/favoris', JSON.stringify(savedData));
  }

  // Efface tous les favoris
  static clearAll() {
    favoris.clear();
    Favoris.populateAll();
    Favoris.save();
  }
}