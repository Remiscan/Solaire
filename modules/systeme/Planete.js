import { mt } from './Seed.js';
import { Anneau } from './Anneau.js';
import { Lune } from './Lune.js';
import { even, Fenetre } from '../app/Params.js';

export class Planete {
  constructor(ordre, etoile, distance_precedente = 0) {
    const vitesse_normale = 30000;

    // Type de la planète : tellurique ou gazeuse
    this.ordre = ordre; // ordre de la planète dans son système solaire
    if (this.ordre > etoile.nombre_planetes_telluriques)
      this.type = 'gazeuse';
    else
      this.type = 'tellurique';

    // Taille de la planète en % de largeur de l'étoile
    // et en px
    let taille;
    if (this.type == 'tellurique')
      taille = 0.01 * Math.round(3 + 8 * mt.rnd());
    else
      taille = 0.01 * Math.round(30 + 40 * mt.rnd());
    this.taille_px = Math.round(taille * etoile.taille_px);

    // Couleur : valeur entre 0 et 360 de la teine de la planète
    this.couleur = Math.floor(360 * mt.rnd());

    // Texture : numéro de la texture de la planète
    let textures;
    if (this.type == 'gazeuse')
    {
      textures = [1, 2, 3, 4];
    }
    else
    {
      textures = [0];
    }
    const t = Math.round(1 + (textures.length - 1) * mt.rnd());
    this.texture = textures[t - 1];

    // Anneaux et lunes : leur nombre
    let nombre_anneaux = 0;
    let nombre_lunes = 0;
    if (this.type == 'gazeuse')
    {
      const r = Math.round(mt.rnd());
      if (r > 0)
        nombre_anneaux = Math.round(1 + 5 * mt.rnd());
      else
        nombre_lunes = Math.round(3 * mt.rnd());
    }
    else
      nombre_lunes = Math.round(1 * mt.rnd());

    // Distance au centre en px, dépend de l'ordre et la taille de la planète
    // + distance de sécurité entre 2 planètes (dépend des lunes et anneaux)
    let ajust;
    if (nombre_anneaux > 0)
      ajust = 0.8 * this.taille_px;
    else if (nombre_lunes > 0)
      ajust = (0.4 + 0.2 * nombre_lunes) * this.taille_px;
    else
      ajust = (this.type == 'tellurique') ? 0.5 * this.taille_px : 0;
    this.distance = Math.round(distance_precedente + 2 * this.taille_px + ajust);
    this.distance_suivante_ajust = Math.round(100 * ajust) / 100;

    // Vitesse : durée d'une année en ms (dépend de la distance, donc des lunes et anneaux)
    this.periode_ms = Math.round(this.distance * vitesse_normale / etoile.taille_px);
    //this.periode_ms = Math.round(Math.round(this.distance * vitesse_normale / etoile.taille_px) / 1000) * 1000;

    // Position de départ : délai de l'animation en s, négatif pour que l'animation commence "en avance"
    // (dépend de la période, donc de la distance, donc des lunes et anneaux)
    this.delai = -1 * Math.round(this.periode_ms * mt.rnd());

    // Durée d'une année en jours
    if (this.type == 'tellurique')
      this.jours = 5 + Math.round(5 * mt.rnd());
    else
      this.jours = 15 + Math.round(30 * mt.rnd());

    // Création des anneaux de la planète
    this.anneaux = Array();
    const anneaux_debut_px = Array();
    const anneaux_fin_px = Array();
    const anneaux_pos_px = Array();
    for (let j = 1; j <= nombre_anneaux; j++)
    {
      const anneau = new Anneau(this);
      anneaux_debut_px.push(anneau.debut);
      anneaux_fin_px.push(anneau.fin);
      anneaux_pos_px.push( { debut: anneau.debut, fin: anneau.fin } );
      this.anneaux.push(anneau);
    }

    // Peut-on mettre une lune dans les anneaux ?
    const interLunes = Array();
    if (nombre_anneaux > 0)
    {
      //## On récupère l'intervalle de positions contenant les anneaux
      const debut_global = Math.min.apply(null, anneaux_debut_px);
      const fin_globale = Math.max.apply(null, anneaux_fin_px);
      const trous = Array();

      //  Lune entre la planète et le premier anneau
      //if (debut_global - this.taille_px / 2 > 13)
      //trous.push( { debut: this.taille_px / 2, fin: debut_global, type: 'proche' } ); // pas possible à cause des forces de marée, voir "Limite de Roche"

      //  Lune au milieu des anneaux
      //## Calculons les "franges" d'anneaux, c'est-à-dire le début et la fin (en px) de chaque zone sans trou dans les anneaux.
      //## Chaque trou sera donc situé de la fin d'une frange au début de la frange suivante.
      const franges = anneaux_pos_px.sort((anneau1, anneau2) => {
        //## On range anneaux_pos_px par debut croissant (et si débuts égaux, par fin croissante)
        return anneau1.debut - anneau2.debut || anneau1.fin - anneau2.fin;
      })
      //## Les anneaux étant rangés par debut croissant, il reste à calculer l'union des intervalles math. [debut, fin]
      .reduce((anneaux_pos_tries, anneau_actuel) => {
        const i = anneaux_pos_tries.length - 1;
        const anneau_precedent = anneaux_pos_tries[i] || [];
        if (anneau_precedent.debut <= anneau_actuel.debut && anneau_actuel.debut <= anneau_precedent.fin)
        {
            if (anneau_precedent.fin < anneau_actuel.fin)
              anneau_precedent.fin = anneau_actuel.fin;
            return anneaux_pos_tries;
        }
        return anneaux_pos_tries.concat(anneau_actuel);
      }, []);

      franges.forEach((f, i) => {
        if (franges[i + 1] != null)
          trous.push( { debut: f.fin, fin: franges[i + 1].debut, type: 'moyen' } );
      });

      //  Lune après le dernier anneau
      trous.push( { debut: fin_globale, fin: fin_globale + Math.round(this.taille_px / 4), type: 'loin' } );

      /*this.franges = franges;
      this.trous = trous;*/

      // On détermine si chaque trou est assez large pour une lune, + hasard
      trous.forEach(trou => {
        const taille_trou = trou.fin - trou.debut;
        const distance_lune = trou.debut + taille_trou / 2;
        const taille_lune_min = 4;
        let taille_lune_max;
        let r, condition;
        if (trou.type == 'proche')
        {
          taille_lune_max = Math.round(taille_trou * 1 / 2);
          r = Math.round(2 * mt.rnd());
          condition = (r == 0); // 1 chance sur 3
        }
        else if (trou.type == 'moyen')
        {
          taille_lune_max = Math.round(taille_trou * 2 / 3);
          r = Math.round(2 * mt.rnd());
          condition = (r == 0); // 1 chance sur 3
        }
        else if (trou.type == 'loin')
        {
          taille_lune_max = Math.round(taille_trou * 2 / 3);
          r = Math.round(3 * mt.rnd());
          condition = (r == 0); // 1 chance sur 4
        }
        const taille_lune = even(taille_lune_min + Math.round(mt.rnd() * (taille_lune_max - taille_lune_min)));
        if (taille_trou >= Math.floor(0.0032 * Fenetre.taille) && condition && taille_lune < taille_trou)
        {
          interLunes.push({
            distance: distance_lune,
            taille: taille_lune,
            type: trou.type
          });
        }
      });
    }

    // Création des lunes de la planète
    this.lunes = Array();
    for (let j = 1; j <= nombre_lunes; j++)
    {
      const lune = new Lune(this, j, nombre_lunes);
      this.lunes.push(lune);
    }
    interLunes.forEach((interLune, j) => {
      const lune = new Lune(this, j + 1, interLunes.length, true, interLune.taille, interLune.distance);
      this.lunes.push(lune);
    });
  }

  static get texturesNonSymetriques() {
    return [3, 5];
  }
}