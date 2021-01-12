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
    let id = e.id.replace('pop-', '');
    if (id == 'nouvelle-decouverte')
      id = 'decouvertes';
  });

  if (typeof astre !== 'undefined')
    window.coeff_fenetre = Math.round(100 * Fenetre.taille / astre.taille_fenetre) / 100;
  else
    window.coeff_fenetre = 1;
}

//////////////////////////////////
// On détecte le redimensionnement
export function callResize() {
  clearTimeout(resizing);
  resizing = setTimeout(() => {
    recalcOnResize();
    const devraitRedimensionner = (Fenetre.taille / window.taille_fenetre_pendant_generation > 1.2 || Fenetre.taille / window.taille_fenetre_pendant_generation < 0.8);
    if (Fenetre.taille != window.taille_fenetre_pendant_generation && devraitRedimensionner)
    {
      document.getElementById('bouton-redimensionner').classList.add('needed');
      document.getElementById('bouton-redimensionner').disabled = false;
      document.getElementById('bouton-redimensionner').tabIndex = 0;
    }
    else
    {
      document.getElementById('bouton-redimensionner').classList.remove('needed');
      document.getElementById('bouton-redimensionner').disabled = true;
      document.getElementById('bouton-redimensionner').tabIndex = -1;
    }
  }, 100);
}

export class Fenetre {
  static get largeur() { return window.innerWidth; }
  static get hauteur() { return window.innerHeight; }
  static get taille() { return Math.max(window.innerWidth, window.innerHeight); }
}

export function wait(time) { return new Promise(resolve => setTimeout(resolve, time)); }
export function px(longueur) { return Math.round(window.coeff_fenetre * longueur); } // adapte à la taille de la fenêtre
export function even(nombre) { return 2 * Math.round(nombre / 2); } // arrondit au nombre pair le plus proche