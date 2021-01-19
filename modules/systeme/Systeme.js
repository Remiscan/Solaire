import { Seed } from './Seed.js';
import { Etoile } from './Etoile.js';
import { Planete } from './Planete.js';
import { Lune } from './Lune.js';
import { even, px, Fenetre } from '../app/Params.js';



const versionUnivers = 2;



export class Systeme {
  constructor(code) {
    new Seed(code);
    this.seed = Seed.current;
    this.etoile = new Etoile();
    this.decouvertes = new Set();
  }


  //////////////////////////
  // Crée le système en HTML
  populate() {
    if (!this.correctSystem) {
      console.error('Système différent.', `this.seed == ${this.seed}`, `Seed.current == ${Seed.current}`);
      throw 'Mauvais système';
    }
    const conteneur = document.getElementById('systeme');

    // Adaptation à la taille de l'écran
    Fenetre.updateTaille(Fenetre.taille);
    Fenetre.updateCoeff(this.etoile.taille_fenetre);
    document.documentElement.dataset.tailleFenetreGen = this.etoile.taille_fenetre;

    // On efface le système précédent
    conteneur.innerHTML = '';
    document.documentElement.classList.remove(...Etoile.types);

    // On crée le nouveau système
    const conteneurOrbites = document.createElement('div');
    conteneurOrbites.id = 'toutes-orbites';

    const conteneurOmbres = document.createElement('div');
    conteneurOmbres.id = 'toutes-ombres';

    let previousOrbitSize, lastOrbitSize;

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

      let planeteHTML = `
        <div id="planete${p}" class="corps planete animee ${planete.type} ${ombre.classe}" 
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

          <div class="ombre" style="--longueur: ${ombre.longueur}; --scale: ${ombre.scale};"></div>

          <div class="coeur ${Planete.texturesNonSymetriques.includes(planete.texture) ? 'animee' : ''}"></div>
      `;

      // Lunes de la planète
      if (planete.lunes.length > 1)
        this.decouvertes.add('planete-lunes');

      for (const [k, lune] of planete.lunes.entries()) {
        if (lune.interanneaux)
          this.decouvertes.add('lune-interanneaux');
        const ombre = this.longueurOmbre(lune);

        planeteHTML += `
          <div class="lune animee ${ombre.classe}"
               style="
                --divise-vitesse: ${lune.divise_vitesse};
                --delai: ${lune.delai}ms;
                --couleur: ${lune.couleur};
                --lune-taille: ${px(lune.taille_px)}px;
                --lune-taille-nu: ${px(lune.taille_px)};
                --distance-lune: ${px(lune.distance_planete)};
                --ordre: ${k};
               ">
            <div class="ombre"
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
      planeteHTML += `
          <div class="anneaux">
      `;

      for (const anneau of planete.anneaux) {
        planeteHTML += `
            <div class="anneau"
                style="
                  --anneau-taille: ${px(even(anneau.taille / 100 * 1.3 * planete.taille_px))}px;
                  --epaisseur-ombre: ${px(planete.taille_px * anneau.epaisseur)}px;
                ">
            </div>
        `;
      }

      planeteHTML += `
          </div>
        </div>
      `;

      // Orbite de la planète
      const nombrePlanetes = etoile.planetes.length;
      conteneur.style.setProperty('--ordre-max', nombrePlanetes);
      conteneurOrbites.innerHTML += `
        <div class="orbite"
             style="
              --distance: ${Math.round(2 * px(planete.distance))}px;
              --couleur: ${planete.couleur};
              --ordre: ${p};
             ">
        </div>
      `;

      const planeteTemplate = document.createElement('template');
      planeteTemplate.innerHTML = planeteHTML;
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

    const tailleBody = this.tailleBody;
    document.body.style.setProperty('--taille', tailleBody + 'px');
    Fenetre.updateBody(tailleBody);

    return;
  }


  //////////////////////////////////////////////////////////////////////////////////////////////
  // Calcule la longueur de l'ombre d'un astre en fonction de sa position par rapport à l'étoile
  longueurOmbre(objet, distanceAEtoile = false) {
    const comparaison = this.compareEtoile(objet);
    const tailleEtoile = this.tailleEtoile;
    const distance = Math.round(px(distanceAEtoile || objet.distance));
    const tailleObjet = px(objet.taille_px);
    let longueur, longueurAttenuee, scale = 1;
    const rayonSysteme = .51 * Math.sqrt(2) * this.tailleBody;

    if (comparaison.classe == 'plus-grande-que-etoile') {
      scale = Math.ceil(rayonSysteme / distance);
      longueur = distance * (scale - 1);

      //longueur = 4 * (distance + tailleEtoile * distance / (tailleObjet - tailleEtoile)); // tq fin de ombre = 5x plus large que début ombre
      longueurAttenuee = Math.min(10 * tailleObjet, longueur);
    }
    else if (comparaison.classe == 'meme-taille-que-etoile') {
      longueur = rayonSysteme;
      longueurAttenuee = Math.min(10 * tailleObjet, longueur);
    }
    else {
      longueur = tailleObjet * distance / (tailleEtoile - tailleObjet);
      longueurAttenuee = Math.min(20 * tailleObjet, longueur);
    }

    longueur = Math.min(rayonSysteme, Math.round(longueur));

    const resultat = {
      longueur,
      longueurAttenuee,
      scale,
      classe: comparaison.classe
    };

    if (objet instanceof Lune && !distanceAEtoile) {
      resultat.scaleMax = this.longueurOmbre(objet, distance + px(objet.distance_planete)).longueur / longueur;
      resultat.scaleMin = this.longueurOmbre(objet, distance - px(objet.distance_planete)).longueur / longueur;
    }
    return resultat;
  }


  ///////////////////////////////////////////////////////////////
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


  //////////////////////////////////////////
  // Calcule la taille effective de l'étoile
  get tailleEtoile() {
    let taille = Math.round(this.etoile.taille * Fenetre.taille);
    const type = this.etoile.type;
    if (type == 'etoile-neutrons')
      taille = Math.round(.1 * taille);
    else if (type == 'normal')
      taille = Math.round(.8 * taille);
    return taille;
  }


  /////////////////////////////////////////
  // Calcule la taille en pixels du système
  get tailleBody() {
    const nombrePlanetes = this.etoile.planetes.length;
    const tailleAvantDerniereOrbite = Math.round(2 * px(this.etoile.planetes[nombrePlanetes - 2].distance));
    const tailleDerniereOrbite = Math.round(2 * px(this.etoile.planetes[nombrePlanetes - 1].distance));
    const tailleBody = 2 * tailleDerniereOrbite - tailleAvantDerniereOrbite;
    return tailleBody;
  }


  get correctSystem() {
    return Seed.current == this.seed;
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


  //////////////////////////////////////////////////////////////////
  // Génère des systèmes en boucle jusqu'à en trouver un qui vérifie
  // une caractéristique, fournie en tant que fonction {verification}
  // (ex: verification = s => s?.etoile?.couleur == 300)
  static find(verification, maxIterations = 1000) {
    if (typeof verification != 'function')
      throw 'Fonction de vérification incorrecte';

    let s;
    let i = 0;
    while (!verification(s) && i < maxIterations) {
      s = new Systeme();
      i++;
    }
    if (verification(s))  return s;
    else                  return false;
  }
}