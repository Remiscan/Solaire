export const Params = {
  easingStandard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  easingDecelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easingAccelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
};


/////////////////////////////////
// Simule un click sur un élément
export function simulateClick(elem, x = 0, y = 0) {
	const event = new MouseEvent('click', {
		bubbles: true,
		cancelable: true,
    view: window,
    clientX: x,
    clientY: y
  });
  elem.dispatchEvent(event);
};


///////////////////////////////////////////////
// Recalcule ce qu'il faut au redimensionnement
export function recalcOnResize() {
  Array.from(document.getElementsByClassName('minipop'))
  .forEach((e, k) => {
    e.style.setProperty('--ordre', k);
  });

  if (typeof astre !== 'undefined')
    Fenetre.updateCoeff(document.documentElement.dataset.tailleFenetreGen);
  else
    Fenetre.updateCoeff(Fenetre.taille); // coeff = 1
}


//////////////////////////////////
// On détecte le redimensionnement
let resizing;
export function callResize() {
  clearTimeout(resizing);
  resizing = setTimeout(() => {
    recalcOnResize();
    const devraitRedimensionner = (Fenetre.taille / Fenetre.tailleLastGen > 1.2 || Fenetre.taille / Fenetre.tailleLastGen < 0.8);
    if (Fenetre.taille != Fenetre.tailleLastGen && devraitRedimensionner) {
      document.getElementById('bouton-redimensionner').classList.add('needed');
      document.getElementById('bouton-redimensionner').disabled = false;
      document.getElementById('bouton-redimensionner').tabIndex = 0;
    } else {
      document.getElementById('bouton-redimensionner').classList.remove('needed');
      document.getElementById('bouton-redimensionner').disabled = true;
      document.getElementById('bouton-redimensionner').tabIndex = -1;
    }
  }, 100);
}


////////////////////////////////////////////////////
// Stocke et màj les données de taille de la fenêtre
let tailleLastGen;
let coeffFenetre;
let tailleBody;
export class Fenetre {
  static get largeur() { return window.innerWidth; }
  static get hauteur() { return window.innerHeight; }
  static get taille() { return Math.max(window.innerWidth, window.innerHeight); }

  static get tailleLastGen() { return tailleLastGen; }
  static updateTaille(size) { tailleLastGen = size; }

  static get coeff() { return coeffFenetre; }
  static updateCoeff(size) { coeffFenetre = Math.round(100 * Fenetre.taille / size) / 100; }

  static get tailleBody() { return tailleBody; }
  static updateBody(size) { tailleBody = size; }
}


export function wait(time) { return new Promise(resolve => setTimeout(resolve, time)); }
export function px(longueur) { return Math.round(Fenetre.coeff * longueur); } // adapte à la taille de la fenêtre
export function even(nombre) { return 2 * Math.round(nombre / 2); } // arrondit au nombre pair le plus proche