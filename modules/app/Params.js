///////////////////////////////////////////
// Adapte le système à la taille de l'écran
export function resetWindow()
{
  const conteneurSysteme = document.querySelector('.conteneur-systeme');

  minZoom = 1.01 * Math.max(window.fenetre.largeur, window.fenetre.hauteur) / window.bodySize;
  const coeff = (minZoom > 1) ? minZoom : 1;
  const posX = 0.5 * (coeff * window.bodySize - window.fenetre.largeur);
  const posY = 0.5 * (coeff * window.bodySize - window.fenetre.hauteur);
  /*document.querySelector('.zoom-percent').innerHTML = '100%';
  document.querySelector('.reset-zoom>i').innerHTML = 'zoom_in';*/
  div_systeme.style.setProperty('--zoom', coeff);
  ancienZoom = coeff;
  document.querySelector('.reset-zoom').classList.remove('on');
  document.querySelector('.reset-zoom').tabIndex = -1;
  conteneurSysteme.customScroll(posX, posY);
}

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
function recalcOnResize() {
  Array.from(document.getElementsByClassName('minipop'))
  .forEach((e, k) => {
    e.style.setProperty('--ordre', k);
    let id = e.id.replace('pop-', '');
    if (id == 'nouvelle-decouverte')
      id = 'decouvertes';
  });

  window.fenetre.largeur = window.innerWidth;
  window.fenetre.hauteur = window.innerHeight;
  window.taille_fenetre = Math.max(window.fenetre.largeur, window.fenetre.hauteur);
  if (typeof astre !== 'undefined')
    window.coeff_fenetre = Math.round(100 * window.taille_fenetre / astre.taille_fenetre) / 100;
  else
    window.coeff_fenetre = 1;
}

//////////////////////////////////
// On détecte le redimensionnement
function callResize() {
  clearTimeout(resizing);
  resizing = setTimeout(() => {
    recalcOnResize();
    const devraitRedimensionner = (window.taille_fenetre / window.taille_fenetre_pendant_generation > 1.2 || window.taille_fenetre / window.taille_fenetre_pendant_generation < 0.8);
    if (window.taille_fenetre != window.taille_fenetre_pendant_generation && devraitRedimensionner)
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

export function wait(time) { return new Promise(resolve => setTimeout(resolve, time)); }