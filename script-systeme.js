"use strict";

const versionUnivers = 2;

/////////////////////////////////////////////
// Récupère le code dans l'URL s'il y en a un
let URLcode;
window.derniereGeneration = Date.now();
let seed;
let mt;

try {
  URLcode = window.location.href.match(/(solaire\/systeme\/)(.+)/)[2];
  if (isNaN(URLcode))
    throw 'NaN';
  console.log('Code détecté :', URLcode);
  upSeed(URLcode);
} catch(error) {
  URLcode = null;
  upSeed();
  console.log('Code généré :', seed);
}

function randSeed() {
  return Math.floor(Number.MAX_SAFE_INTEGER * Math.random());
}
function upSeed(number = randSeed())
{
  seed = number;
  mt = new MersenneTwister(number);
}





/*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!! GÉNÉRATION DU SYSTÈME !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!*/



window.fenetre = { largeur: window.innerWidth, hauteur: window.innerHeight };
window.taille_fenetre = Math.max(window.fenetre.largeur, window.fenetre.hauteur);
window.taille_fenetre_pendant_generation = window.taille_fenetre;
function even (nombre) { return 2 * Math.round(nombre / 2); } // arrondit au nombre pair le plus proche



////////////////////////
// Constructeur d'Étoile
class Etoile {
  constructor(code = null, taille = 0.1) {
    if (code != null)
      upSeed(code);
    else {
      upSeed();
    }

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
    this.taille_px = Math.round(this.taille * window.taille_fenetre);

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

    this.taille_fenetre = window.taille_fenetre;
  }
}



//////////////////////////
// Constructeur de Planète
class Planete {
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
        if (taille_trou >= Math.floor(0.0032 * window.taille_fenetre) && condition && taille_lune < taille_trou)
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
}



////////////////////////
// Constructeur d'Anneau
class Anneau {
  constructor(planete) {
    this.taille = Math.round(90 + 70 * mt.rnd());
    this.epaisseur = 0.01 * Math.round(1 + 29 * mt.rnd());
    this.pos = -0.5 * (this.taille - 100);
    this.debut = Math.round(1.3 * this.taille * 0.01 * planete.taille_px * 0.5);
    this.fin = Math.round(this.debut + this.epaisseur * planete.taille_px);
  }
}



///////////////////////
// Constructeur de Lune
class Lune {
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



////////////////////////////////////
// Construisons le système solaire !
const div_systeme = document.getElementById('systeme');

function queLaLumiereSoit(code = null, date = Date.now())
{
  const decouvertesDansCeSysteme = new Set();

  // Génération de l'étoile
  let etoile;
  try          { etoile = new Etoile(code, 0.1); }
  catch(error) { etoile = new Etoile(null, 0.1); }
  window.astre = etoile;

  const codeSysteme = seed;
  if (code != null && code != codeSysteme)
    throw 'systeme-different';

  //// Adaptation à la taille de l'écran
  window.taille_fenetre = Math.max(window.innerWidth, window.innerHeight);
  window.taille_fenetre_pendant_generation = window.taille_fenetre;
  window.coeff_fenetre = Math.round(100 * window.taille_fenetre / astre.taille_fenetre) / 100;
  const px = longueur => { return Math.round(window.coeff_fenetre * longueur) }; // adapte à la taille de la fenêtre

  //// Vérifie si un astre est plus petit ou plus grand que son étoile
  function compareEtoile(objet, tailleEtoile)
  {
    const taille = px(objet.taille_px);
    const difference = tailleEtoile - taille;
    const ratio = taille / tailleEtoile;
    let classe;
    switch (Math.sign(difference))
    {
      case -1:
        classe = 'plus-grande-que-etoile';
        break;
      case 0:
        classe = 'meme-taille-que-etoile';
        break;
      default:
        classe = 'plus-petite-que-etoile';
    }
    return {
      difference: difference,
      ratio: ratio,
      classe: classe
    };
  }

  //// Calcule la longueur de l'ombre d'un astre en fonction de sa taille
  //// et de sa position par rapport à l'étoile
  function longueurOmbre(objet, tailleEtoile, distanceAEtoile = false)
  {
    const comparaison = compareEtoile(objet, tailleEtoile);
    const distance = Math.round(px(distanceAEtoile || objet.distance));
    const largeur = px(objet.taille_px);
    let max = window.taille_fenetre;
    let longueur, longueurAttenuee;

    if (comparaison.classe == 'plus-grande-que-etoile')
    {
      longueur = 4 * (distance + tailleEtoile * distance / (largeur - tailleEtoile)); // tq fin de ombre = 5x plus large que début ombre
      longueurAttenuee = Math.min(10 * largeur, longueur);
    }
    else if (comparaison.classe == 'meme-taille-que-etoile')
    {
      longueur = 3 * max;
      longueurAttenuee = Math.min(10 * largeur, longueur);
    }
    else
    {
      longueur = largeur * distance / (tailleEtoile - largeur);
      longueurAttenuee = Math.min(20 * largeur, longueur);
    }

    longueur = Math.min(max, Math.round(longueur));

    const resultat = {
      longueur: longueur,
      longueurAttenuee: longueurAttenuee,
      classe: comparaison.classe
    };

    if (objet instanceof Lune && !distanceAEtoile)
    {
      resultat.scaleMax = longueurOmbre(objet, tailleEtoile, distance + px(objet.distance_planete)).longueur / longueur;
      resultat.scaleMin = longueurOmbre(objet, tailleEtoile, distance - px(objet.distance_planete)).longueur / longueur;
    }
    return resultat;
  }

  //// On efface le système précédent
  div_systeme.innerHTML = '';

  const div_toutes_orbites = document.createElement('div');
  div_toutes_orbites.id = 'toutes-orbites';

  const div_toutes_ombres = document.createElement('div');
  div_toutes_ombres.id = 'toutes-ombres';

  //// Et on commence à peupler le nouveau système !
  let largeur_effective_etoile = Math.round(etoile.taille * window.taille_fenetre);
  if (etoile.type == 'etoile-neutrons')
    largeur_effective_etoile = Math.round(0.1 * largeur_effective_etoile);
  else if (etoile.type == 'normal')
    largeur_effective_etoile = Math.round(0.8 * largeur_effective_etoile);

  document.documentElement.classList.remove('trounoir', 'etoile-neutrons', 'etoile-binaire', 'trounoir-anneau', 'sphere-dyson', 'normal');
  document.documentElement.classList.add(etoile.type);

  if (etoile.type != 'normal')
    decouvertesDansCeSysteme.add(etoile.type);

  const div_etoile = document.createElement('div');
  div_etoile.id = 'etoile';
  div_etoile.className = 'corps ' + etoile.type;
  div_etoile.style.setProperty('--size', Math.round(etoile.taille * window.taille_fenetre));
  div_etoile.style.setProperty('--couleur', etoile.couleur);
  document.documentElement.style.setProperty('--largeur-etoile', Math.round(etoile.taille * window.taille_fenetre) + 'px');
  document.documentElement.style.setProperty('--largeur-eff-etoile-nu', largeur_effective_etoile);
  document.documentElement.style.setProperty('--etoile-couleur', etoile.couleur);

  //// Effets spéciaux en cas de sphère de Dyson - work in progress
  if (etoile.type == 'sphere-dyson')
  {
    let imax = 4;
    for (let i = 1; i <= imax; i++)
    {
      const ligne = document.createElement('div');
      ligne.classList.add('dyson-ligne');
      ligne.style.setProperty('--n', i);
      /*if (i <= imax/2)
        ligne.style.animationDirection = 'reverse';*/
      div_etoile.appendChild(ligne);
    }
  }

  div_systeme.appendChild(div_etoile);
  const nombre_planetes = etoile.nombre_planetes_telluriques + etoile.nombre_planetes_gazeuses;
  div_systeme.style.setProperty('--ordre-max', nombre_planetes);

  // Génération des planètes
  etoile.planetes.forEach((planete, k) => {
    const p = k + 1;
    window['planete' + p] = planete;

    //// Génération d'une planète
    const div_planete = document.createElement('div');
    div_planete.id = 'planete' + p;
    div_planete.className = 'corps planete animee';
    div_planete.classList.add(planete.type);
    div_planete.style.setProperty('--size', px(planete.taille_px));
    div_planete.style.setProperty('--distance-x', Math.round(-1 * px(planete.distance)) + 'px');
    div_planete.style.setProperty('--couleur', planete.couleur);
    div_planete.style.setProperty('--periode-ms', planete.periode_ms);
    //div_planete.style.setProperty('animation', 'rotation_annee ' + planete.periode_ms + 'ms linear ' + planete.delai + 'ms infinite');
    div_planete.style.setProperty('--delai', planete.delai + 'ms');
    div_planete.style.setProperty('--jours-par-an', planete.jours);
    div_planete.style.setProperty('--ordre', p);
    div_planete.style.setProperty('--texture', planete.texture ? 'url(\'/solaire/textures/' + planete.texture + '.svg\')' : 'none');
    div_planete.style.setProperty('--largeur-planete', px(planete.taille_px) + 'px');
    div_planete.style.setProperty('--largeur-planete-nu', px(planete.taille_px));
    div_planete.style.setProperty('--distance-nu', px(planete.distance));

    //// Ombre de la planète
    const div_ombre = document.createElement('div');
    div_ombre.className = 'ombre';
    const ombre = longueurOmbre(planete, largeur_effective_etoile);
    div_planete.classList.add(ombre.classe);
    div_ombre.style.setProperty('--longueur', ombre.longueur);
    div_planete.appendChild(div_ombre);

    //// Motif de la planète
    const div_coeur = document.createElement('div');
    div_coeur.className = 'coeur';
    //div_coeur.style.setProperty('animation', 'rotation_journee ' + String(planete.periode_ms / planete.jours) + 'ms linear 0s infinite');
    const texturesNonSymetriques = [3, 5];
    const textureSymetrie = texturesNonSymetriques.includes(planete.texture) ? false : true;
    if (textureSymetrie === false)
      div_coeur.classList.add('animee');
    div_planete.appendChild(div_coeur);

    // Génération des lunes de la planète
    if (planete.lunes.length > 1)
      decouvertesDansCeSysteme.add('planete-lunes');

    planete.lunes.forEach((lune, ord) => {
      if (lune.interanneaux)
        decouvertesDansCeSysteme.add('lune-interanneaux');
      
      const div_lune = document.createElement('div');
      div_lune.className = 'lune animee';
      div_lune.style.setProperty('--divise-vitesse', lune.divise_vitesse);
      div_lune.style.setProperty('--delai', lune.delai + 'ms');
      div_lune.style.setProperty('--couleur', lune.couleur);
      div_lune.style.setProperty('--lune-taille', px(lune.taille_px) + 'px');
      div_lune.style.setProperty('--lune-taille-nu', px(lune.taille_px));
      div_lune.style.setProperty('--distance-lune', px(lune.distance_planete));
      div_lune.style.setProperty('--ordre', ord);
      //div_lune.style.setProperty('animation', 'rotation_lune ' + String(planete.periode_ms / lune.divise_vitesse) + 'ms linear ' + lune.delai + ' infinite');

      //// Ombre de la lune
      const div_ombre = document.createElement('div');
      div_ombre.className = 'ombre';
      const ombre = longueurOmbre(lune, largeur_effective_etoile);
      div_lune.classList.add(ombre.classe);
      div_ombre.style.setProperty('--longueur', ombre.longueur);
      div_ombre.style.setProperty('--scale-max', ombre.scaleMax);
      div_ombre.style.setProperty('--scale-min', ombre.scaleMin);
      //div_ombre.style.setProperty('animation', 'rotation_lune_opposee ' + String(planete.periode_ms / lune.divise_vitesse) + 'ms linear ' + lune.delai + ' infinite');
      div_lune.appendChild(div_ombre);

      const div_coeur_lune = document.createElement('div');
      div_coeur_lune.className = 'coeur_lune animee';

      div_lune.appendChild(div_coeur_lune);
      div_planete.appendChild(div_lune);

      //// Génération de l'orbite de la lune
      const div_orbite = document.createElement('div');
      div_orbite.className = 'orbite lunaire';
      div_orbite.style.setProperty('--distance', Math.round(2 * px(lune.distance_planete)) + 'px');
      div_orbite.style.setProperty('--couleur', lune.couleur);
      div_planete.appendChild(div_orbite);
    });

    // Génération des anneaux de la planète
    if (planete.anneaux.length > 0)
    {
      decouvertesDansCeSysteme.add('planete-anneaux');

      const div_anneaux = document.createElement('div');
      div_anneaux.className = 'anneaux';

      planete.anneaux.forEach(anneau => {
        const div_anneau = document.createElement('div');
        div_anneau.className = 'anneau';
        div_anneau.style.setProperty('--anneau-taille', px(even(anneau.taille / 100 * 1.3 * planete.taille_px)) + 'px');
        div_anneau.style.setProperty('--epaisseur-ombre', px(planete.taille_px * anneau.epaisseur) + 'px');
        div_anneaux.appendChild(div_anneau);
      });

      div_planete.appendChild(div_anneaux);
    }

    // Génération de l'orbite de la planète
    const div_orbite = document.createElement('div');
    div_orbite.className = 'orbite';
    div_orbite.style.setProperty('--distance', Math.round(2 * px(planete.distance)) + 'px');
    div_orbite.style.setProperty('--couleur', planete.couleur);
    div_orbite.style.setProperty('--ordre', p);
    if (p == nombre_planetes - 1)
      window['beforeOrbitSize'] = Math.round(2 * px(planete.distance));
    if (p == nombre_planetes)
      window['lastOrbitSize'] = Math.round(2 * px(planete.distance));

    /*const bordOrbite = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rayon = Math.round(2 * px(planete.distance)) + 2;
    bordOrbite.setAttribute('width', Math.round(rayon + 4) + 'px');
    bordOrbite.setAttribute('height', Math.round(rayon + 4) + 'px');
    bordOrbite.setAttribute('viewBox', '0 0 ' + Math.round(rayon + 4) + ' ' + Math.round(rayon + 4));
    const cercle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    cercle.setAttribute('cx', Math.round(2 + rayon / 2) + 'px');
    cercle.setAttribute('cy', Math.round(2 + rayon / 2) + 'px');
    cercle.setAttribute('r', Math.round(rayon / 2) + 'px');
    cercle.setAttribute('fill', 'none');
    cercle.setAttribute('stroke', 'hsl(' + planete.couleur + ', 10%, calc(var(--luminosite-fond) + 15%))');
    cercle.setAttribute('stroke-width', '2px');
    cercle.setAttribute('stroke-dasharray', '0, 5px');
    cercle.setAttribute('stroke-linecap', 'round');
    bordOrbite.appendChild(cercle);
    div_toutes_orbites.appendChild(bordOrbite);*/

    // On place la planère et l'orbite dans le système
    div_systeme.appendChild(div_planete);
    div_toutes_orbites.appendChild(div_orbite);
  });

  // Gestion des ombres avancées
  //const exToutesOmbres = document.getElementById('toutes-ombres');
  
  const toutesOmbres = div_systeme.cloneNode(true);
  const enfants = Array.from(toutesOmbres.getElementsByTagName('*'));
  const aGarder = enfants.filter(e =>
    e.className.includes('planete') ||
    e.className.includes('ombre') ||
    e.className.includes('lune')
  );
  enfants.forEach(e => {
    if (aGarder.includes(e) && !e.className.includes('coeur_lune'))
      e.id = '';
    else
      e.remove();
  });

  //exToutesOmbres.innerHTML = toutesOmbres.innerHTML;
  div_toutes_ombres.innerHTML = toutesOmbres.innerHTML;
  div_systeme.appendChild(div_toutes_ombres);
  div_systeme.appendChild(div_toutes_orbites);

  const themeColor = document.querySelector('meta[name=theme-color]');
  if (etoile.type == 'etoile-neutrons')
    themeColor.setAttribute('content', 'hsl(' + etoile.couleur + ', 0%, 5%)');
  else if (etoile.type == 'trounoir')
    themeColor.setAttribute('content', 'hsl(' + etoile.couleur + ', 0%, 0%)');
  else
    themeColor.setAttribute('content', 'hsl(' + etoile.couleur + ', 30%, 5%)');

  window['bodySize'] = 2 * window['lastOrbitSize'] - window['beforeOrbitSize'];
  document.body.style.setProperty('--taille', window.bodySize + 'px');
  resetWindow();

  if (document.querySelector('#welcome') != null || typeof history.state.systeme == 'undefined' || history.state.systeme == null)
    history.replaceState( { systeme: codeSysteme, date: date }, '', '/solaire/'/* + 'systeme/' + codeSysteme*/);
  else if (codeSysteme != history.state.systeme)
    history.pushState( { systeme: codeSysteme, date: date }, '', '/solaire/'/* + 'systeme/' + codeSysteme*/);

  return decouvertesDansCeSysteme;
}