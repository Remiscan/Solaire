import { mt } from './Seed.js';

export class Anneau {
  constructor(planete) {
    this.taille = Math.round(90 + 70 * mt.rnd());
    this.epaisseur = 0.01 * Math.round(1 + 29 * mt.rnd());
    this.pos = -0.5 * (this.taille - 100);
    this.debut = Math.round(1.3 * this.taille * 0.01 * planete.taille_px * 0.5);
    this.fin = Math.round(this.debut + this.epaisseur * planete.taille_px);
  }
}