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

export function wait(time) { return new Promise(resolve => setTimeout(resolve, time)); }