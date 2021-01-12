import { Seed } from './Seed.js';
import { Etoile } from './Etoile.js';
import { Planete } from './Planete.js';
import { Lune } from './Lune.js';
import { even, px, Fenetre } from '../app/Params.js';
import { Decouverte } from '../app/Decouverte.js';
import { resetWindow } from '../app/custom-scroll-zoom.js';



const versionUnivers = 2;



export function getInitialSystemCode() {
  let URLcode;
  try {
    URLcode = window.location.href.match(/(solaire\/systeme\/)(.+)/)[2];
    if (isNaN(URLcode)) throw 'NaN';
    console.log('Code détecté :', URLcode);
  } catch(error) {}
  return URLcode;
}



export class Systeme {
  constructor(code) {
    new Seed(code);
    this.seed = Seed.get();
    this.etoile = new Etoile();
    this.decouvertes = new Set();
  }


  // Crée le HTML du système
  populate() {
    if (!this.correctSystem) {
      console.error('Système différent.', `this.seed == ${this.seed}`, `Seed.get() == ${Seed.get()}`);
      throw 'systeme-different';
    }
    const conteneur = document.getElementById('systeme');

    // Adaptation à la taille de l'écran
    window.taille_fenetre_pendant_generation = Fenetre.taille;
    window.coeff_fenetre = Math.round(100 * Fenetre.taille / this.etoile.taille_fenetre) / 100;

    // On efface le système précédent
    conteneur.innerHTML = '';
    document.documentElement.classList.remove(...Etoile.types);

    // On crée le nouveau système
    const conteneurOrbites = document.createElement('div');
    conteneurOrbites.id = 'toutes-orbites';

    const conteneurOmbres = document.createElement('div');
    conteneurOmbres.id = 'toutes-ombres';

    // Étoile
    const etoile = this.etoile;
    document.documentElement.classList.add(etoile.type);

    if (etoile.type != 'normal') this.decouvertes.add(etoile.type);

    document.documentElement.style.setProperty('--largeur-etoile', Math.round(etoile.taille * Fenetre.taille) + 'px');
    document.documentElement.style.setProperty('--largeur-eff-etoile-nu', this.tailleEtoile);
    document.documentElement.style.setProperty('--etoile-couleur', etoile.couleur);

    const etoileTemplate = document.createElement('template');
    etoileTemplate.innerHTML = `
      <div id="etoile" class="corps ${this.etoile.type}" 
           style="
            --size: ${Math.round(etoile.taille * Fenetre.taille)};
            --couleur: ${etoile.couleur};
           "
      ></div>
    `;

    conteneur.appendChild(etoileTemplate.content.cloneNode(true));

    // Planètes
    for (const [k, planete] of etoile.planetes.entries()) {
      const p = k + 1;
      const ombre = this.longueurOmbre(planete);

      const planeteTemplate = document.createElement('template');
      planeteTemplate.innerHTML = `
        <div id="planete${p}" class="corps planete animee ${planete.type}" 
             style="
              --size: ${px(planete.taille_px)};
              --distance-x: ${Math.round(-1 * px(planete.distance))}px;
              --couleur: ${planete.couleur};
              --periode-ms: ${planete.periode_ms};
              --delai: ${planete.delai}ms;
              --jours-par-an: ${planete.jours};
              --ordre: ${p};
              --texture: ${planete.texture ? `url('/solaire/textures/${planete.texture}.svg')` : 'none'};
              --largeur-planete: ${px(planete.taille_px)}px;
              --largeur-planete-nu: ${px(planete.taille_px)};
              --distance-nu: ${planete.distance};
             ">

          <div class="ombre ${ombre.classe}" style="--longueur: ${ombre.longueur};"></div>

          <div class="coeur ${Planete.texturesNonSymetriques.includes(planete.texture) ? 'animee' : ''}"></div>
      `;

      // Lunes de la planète
      if (planete.lunes.length > 1)
        this.decouvertes.add('planete-lunes');

      for (const [k, lune] of planete.lunes.entries()) {
        if (lune.interanneaux)
          this.decouvertes.add('lune-interanneaux');
        const ombre = this.longueurOmbre(lune);

        planeteTemplate.innerHTML += `
          <div class="lune animee"
               style="
                --divide-vitesse: ${lune.divise_vitesse};
                --delai: ${lune.delai}ms;
                --couleur: ${lune.couleur};
                --lune-taille: ${px(lune.taille_px)}px;
                --lune-taille-nu: ${px(lune.taille_px)};
                --distance-lune: ${px(lune.distance_planete)};
                --ordre: ${k};
               ">
            <div class="ombre ${ombre.classe}"
                 style="
                  --longueur: ${ombre.longueur};
                  --scale-max: ${ombre.scaleMax};
                  --scale-min: ${ombre.scaleMin};
                 ">
            </div>
            <div class="coeur_lune animee"></div>
          </div>

          <div class="orbite lunaire"
               style="
                --distance: ${Math.round(2 * px(lune.distance_planete))}px;
                --couleur: ${lune.couleur};
               ">
          </div>
        `;
      }

      // Anneaux de la planète
      if (planete.anneaux.length > 0)
        this.decouvertes.add('planete-anneaux');
      planeteTemplate.innerHTML += `<div class="anneaux">`;

      for (const anneau of planete.anneaux) {
        planeteTemplate.innerHTML += `
          <div class="anneau"
               style="
                --anneau-taille: ${px(even(anneau.taille / 100 * 1.3 * planete.taille_px))}px;
                --epaisseur-ombre: ${px(planete.taille_px * anneau.epaisseur)}px;
               ">
          </div>
        `;
      }

      planeteTemplate.innerHTML += `
        </div>
      `;

      // Orbite de la planète
      const nombrePlanetes = etoile.planetes.length;
      if (p == nombrePlanetes - 1)
        window['beforeOrbitSize'] = Math.round(2 * px(planete.distance));
      if (p == nombrePlanetes)
        window['lastOrbitSize'] = Math.round(2 * px(planete.distance));
      conteneurOrbites.innerHTML += `
        <div class="orbite"
             style="
              --distance: ${Math.round(2 * px(planete.distance))}px;
              --couleur: ${planete.couleur};
              --ordre: ${p};
             ">
        </div>
      `;

      conteneur.appendChild(planeteTemplate.content.cloneNode(true));
    }

    // Ombres non-additives
    const ombres = conteneur.cloneNode(true);
    const enfants = Array.from(ombres.getElementsByTagName('*'));
    const aGarder = enfants.filter(e =>
      e.className.includes('planete') ||
      e.className.includes('ombre') ||
      e.className.includes('lune')
    );
    enfants.forEach(e => {
      if (aGarder.includes(e) && !e.classList.contains('coeur_lune'))
        e.removeAttribute('id');
      else e.remove();
    });

    conteneurOmbres.innerHTML = ombres.innerHTML;
    conteneur.appendChild(conteneurOmbres);
    conteneur.appendChild(conteneurOrbites);
    
    // Gestion de la fenêtre
    let saturation, luminosite;
    if (etoile.type == 'etoile-neutrons') {
      saturation = 0; luminosite = 5;
    } else if (etoile.type == 'trounoir') {
      saturation = 0; luminosite = 0;
    } else {
      saturation = 30; luminosite = 5;
    }
    const themeColor = `hsl(${etoile.couleur}, ${saturation}%, ${luminosite}%)`;
    document.querySelector('meta[name=theme-color]').setAttribute('content', themeColor);

    window['bodySize'] = 2 * window['lastOrbitSize'] - window['beforeOrbitSize'];
    document.body.style.setProperty('--taille', window.bodySize + 'px');
    resetWindow();

    return;
  }


  // Calcule la longueur de l'ombre d'un astre en fonction de sa position par rapport à l'étoile
  longueurOmbre(objet, distanceAEtoile = false) {
    const comparaison = this.compareEtoile(objet);
    const tailleEtoile = this.tailleEtoile;
    const distance = Math.round(px(distanceAEtoile || objet.distance));
    const tailleObjet = px(objet.taille_px);
    const max = Fenetre.taille;
    let longueur, longueurAttenuee;

    if (comparaison.classe == 'plus-grande-que-etoile') {
      longueur = 4 * (distance + tailleEtoile * distance / (tailleObjet - tailleEtoile)); // tq fin de ombre = 5x plus large que début ombre
      longueurAttenuee = Math.min(10 * tailleObjet, longueur);
    }
    else if (comparaison.classe == 'meme-taille-que-etoile') {
      longueur = 3 * max;
      longueurAttenuee = Math.min(10 * tailleObjet, longueur);
    }
    else {
      longueur = tailleObjet * distance / (tailleEtoile - tailleObjet);
      longueurAttenuee = Math.min(20 * tailleObjet, longueur);
    }

    longueur = Math.min(max, Math.round(longueur));

    const resultat = {
      longueur: longueur,
      longueurAttenuee: longueurAttenuee,
      classe: comparaison.classe
    };

    if (objet instanceof Lune && !distanceAEtoile) {
      resultat.scaleMax = this.longueurOmbre(objet, distance + px(objet.distance_planete)).longueur / longueur;
      resultat.scaleMin = this.longueurOmbre(objet, distance - px(objet.distance_planete)).longueur / longueur;
    }
    return resultat;
  }


  // Détermine si un astre est plus petit ou grand que son étoile
  compareEtoile(objet) {
    const tailleEtoile = this.tailleEtoile;
    const tailleObjet = px(objet.taille_px);
    const difference = tailleEtoile - tailleObjet;
    const ratio = tailleObjet / tailleEtoile;
    const signe = Math.sign(difference);
    const classe  = (signe == -1) ? 'plus-grande-que-etoile'
                  : (signe == 0) ? 'meme-taille-que-etoile'
                  : 'plus-petite-que-etoile';
    return { difference, ratio, classe };
  }

  get correctSystem() {
    return Seed.get() == this.seed;
  }

  get tailleEtoile() {
    let taille = Math.round(this.etoile.taille * Fenetre.taille);
    const type = this.etoile.type;
    if (type == 'etoile-neutrons')
      taille = Math.round(.1 * taille);
    else if (type == 'normal')
      taille = Math.round(.8 * taille);
    return taille;
  }

  get planetes() {
    return this.etoile.planetes;
  }

  static get universObsolete() {
    const versionLocale = localStorage.getItem('solaire/version-univers');
    return versionLocale != versionUnivers;
  }

  static get versionUnivers() {
    return versionUnivers;
  }
}