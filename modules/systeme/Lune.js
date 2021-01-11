import { mt } from './Seed.js';

export class Lune {
  constructor(planete, j, jmax, interanneaux = false, lune_taille = 0, lune_distance = 0) {
    const coeff_delai = -1 * Math.round(100 * mt.rnd()) / 100;
    this.delai = Math.round(coeff_delai * planete.periode_ms);
    this.interanneaux = interanneaux;
    if (!interanneaux)
    {
      let taille, coeff_dist;
      if (planete.type == 'tellurique')
      {
        taille = j * Math.round(15 + 6 * mt.rnd());
        coeff_dist = 0.45 + 0.35 * j;
      }
      else
      {
        taille = j * Math.round(3 + 7 * mt.rnd());
        coeff_dist = 0.45 + 0.35 * j;
      }
      if (planete.anneaux > 0)
      {
        taille = Math.round(12 + 13 * mt.rnd());
        coeff_dist = 1.5;
      }

      if (planete.type == 'tellurique')
      {
        this.taille_px = Math.ceil(0.01 * taille * planete.taille_px); // pas de even pour éviter les lunes trop grosses sur mobile
        this.distance_planete = Math.round(coeff_dist * planete.taille_px) + 1; // éloigne les lunes de leur planète pour éviter une superposition sur mobile
      }
      else
      {
        this.taille_px = even(Math.ceil(0.01 * taille * planete.taille_px));
        this.distance_planete = Math.round(coeff_dist * planete.taille_px);
      }
      this.type = 'normale';
    }
    else
    {
      this.taille_px = lune_taille;
      this.distance_planete = lune_distance;
      this.type = 'interanneaux';
    }
    this.distance = planete.distance;
    this.couleur = Math.round(360 * mt.rnd());
    this.divise_vitesse = 4 * Math.pow(2, jmax) / Math.pow(2, j); // résonance 1, 1:2 ou 1:2:4
  }
}