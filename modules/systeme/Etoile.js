import { mt } from './Seed.js';
import { Planete } from './Planete.js';
import { Fenetre } from '../app/Params.js';

export class Etoile {
  constructor(taille = 0.1) {
    // Type de l'étoile : normal, neutron ou trounoir
    const r = Math.floor(1 + (40 * mt.rnd()));
    switch (r)
    {
      case 1:
        this.type = 'trounoir';
        break;
      case 2:
        this.type = 'trounoir-anneau';
        break;
      case 3:
      case 4:
        this.type = 'etoile-neutrons';
        break;
      case 5:
      case 6:
        this.type = 'etoile-binaire';
        break;
      /*case 7:
        this.type = 'sphere-dyson';
        break;*/
      default:
        this.type = 'normal';
    }

    // Taille de l'étoile en % de largeur de page
    // et en px
    this.taille = Math.round(1000 * taille * Math.round(100 * (0.5 + 0.5 * mt.rnd())) / 100) / 1000;
    this.taille_px = Math.round(this.taille * Fenetre.taille);

    // Couleur : valeur entre 0 et 360 de la teine de l'étoile
    this.couleur = Math.floor(360 * mt.rnd());

    // Planètes : nombre de planètes telluriques et gazeuses
    this.nombre_planetes_telluriques = Math.round(3 + 2 * mt.rnd());
    this.nombre_planetes_gazeuses = Math.round(4 + 2 * mt.rnd());
    
    // Création des planètes
    const nombre_planetes = this.nombre_planetes_telluriques + this.nombre_planetes_gazeuses;
    let distance_precedente = this.taille_px / 1.7;
    this.planetes = Array();
    for (let j = 1; j <= nombre_planetes; j++)
    {
      const planete = new Planete(j, this, distance_precedente);
      distance_precedente = planete.distance + planete.distance_suivante_ajust;
      this.planetes.push(planete);
    }

    this.taille_fenetre = Fenetre.taille;
  }

  static get types() {
    return ['trounoir', 'etoile-neutrons', 'etoile-binaire', 'trounoir-anneau', 'sphere-dyson', 'normal'];
  }
}