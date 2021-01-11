import { Menu } from './Menu.js';



const conteneurSysteme = document.querySelector('.conteneur-systeme');
const divSysteme = document.getElementById('systeme');

let patience = 1;
let firstTouch;
let lastTouch;

let minZoom = 1;
let maxZoom = 3;
let ancienZoom = 1;



/////////////////////////////////////////////////////////////////////
// Scrolle avec une méthode différente selon le support du navigateur
HTMLElement.prototype.customScroll = function(x, y) {
  if (typeof this.scrollTo === 'undefined') {
    this.scrollLeft = x;
    this.scrollTop = y;
  } else {
    this.scrollTo(x, y);
  }
}



/////////////////////////////////////////////////////////////////////////////
// Renvoie les coordonnées du scroll afin de ne pas scroller hors du système,
// avec en entrée coords = [left, top].
function scrollBound(coords) {
  return [
    Math.max(0, Math.min(coords[0], ancienZoom * window.bodySize - window.fenetre.largeur)),
    Math.max(0, Math.min(coords[1], ancienZoom * window.bodySize - window.fenetre.hauteur))
  ];
}



///////////////////////////////
// Gestion du scrolling custom
function systemeScroll(event) {
  if (patience) {
    patience = 0;
    let newTouch;
    if (typeof event.touches !== 'undefined')
      newTouch = [event.touches[0].clientX, event.touches[0].clientY];
    else
      newTouch = [event.clientX, event.clientY];
    const newScroll = [lastTouch[0] - newTouch[0], lastTouch[1] - newTouch[1]];
    lastTouch = newTouch;

    const newCoords = scrollBound([
      conteneurSysteme.scrollLeft + newScroll[0],
      conteneurSysteme.scrollTop + newScroll[1]]
    );
    conteneurSysteme.customScroll(newCoords[0], newCoords[1]);

    requestAnimationFrame(() => { patience = 1 });
  }
}



/////////////////////////
// Gestion du zoom custom
function zoom(nouveauZoom, point = { clientX: window.fenetre.largeur / 2, clientY: window.fenetre.hauteur / 2 })
{
  if (ancienZoom == 1) {
    document.querySelector('.reset-zoom').classList.add('on');
    document.querySelector('.reset-zoom').tabIndex = 0;
  }
  if (nouveauZoom > 1)
    document.querySelector('.reset-zoom>i').innerHTML = 'zoom_in';
  else if (nouveauZoom < 1)
    document.querySelector('.reset-zoom>i').innerHTML = 'zoom_out';

  const Z = nouveauZoom / ancienZoom;
  document.getElementById('systeme').style.setProperty('--zoom', nouveauZoom);
  document.querySelector('.zoom-percent').innerHTML = Math.round(100 * nouveauZoom) + '%';

  const past = {
    scrollX: conteneurSysteme.scrollLeft,
    scrollY: conteneurSysteme.scrollTop
  };
  ancienZoom = nouveauZoom; // avant scrollBound pour qu'il calcule la limite selon le nouveau zoom

  const newCoords = scrollBound([
    Z * past.scrollX + point.clientX * (Z - 1),
    Z * past.scrollY + point.clientY * (Z - 1)
  ]);
  const futur = {
    scrollX: newCoords[0],
    scrollY: newCoords[1]
  };
  return futur;
}

let ancienEcart = -1;
let premierEcart = 0;
let premierPinchyZoom = 1;
let pointDeZoom = 0;

function pinch_move(event) {
  event.preventDefault();
  if (event.touches.length == 2 && patience) {
    let doI = 0;
    let futur;
    patience = 0;

    const ecartX = Math.abs(Math.round(event.touches[0].clientX) - Math.round(event.touches[1].clientX));
    const ecartY = Math.abs(Math.round(event.touches[0].clientY) - Math.round(event.touches[1].clientY));
    const ecart = Math.sqrt(Math.pow(ecartX, 2) + Math.pow(ecartY, 2));

    const z = Math.max(minZoom, Math.min(premierPinchyZoom * Math.round(100 * ecart / premierEcart) / 100, maxZoom));
    if (z != ancienZoom) {
      doI = 1;
      futur = zoom(z, pointDeZoom);
    }

    ancienEcart = ecart;
    
    if (doI)
      conteneurSysteme.customScroll(futur.scrollX, futur.scrollY);
    
    requestAnimationFrame(() => { patience = 1 });
  }
}



////////////////////////////////////////////////////////////////
// On surveille les événements qui déclenchent le scroll ou zoom


// On surveille le scroll à la souris
divSysteme.addEventListener('mousedown', divSysteme.md = event => {
  if (patience && !Menu.open) {
    patience = 0;

    event.preventDefault();
    firstTouch = [event.clientX, event.clientY];
    lastTouch = firstTouch;

    window.addEventListener('mouseup', divSysteme.mu = () => {
      divSysteme.removeEventListener('mousemove', systemeScroll);
      window.removeEventListener('mouseup', divSysteme.mu);
    });

    divSysteme.addEventListener('mousemove', systemeScroll);

    requestAnimationFrame(() => { patience = 1 });
  }
});

// On surveille le zoom à la molette
document.addEventListener('wheel', event => {
  event.preventDefault();
  if (patience && !Menu.open)
  {
    patience = 0;
    const deltaY = Math.sign(event.deltaY);
    const z = Math.max(minZoom, Math.min(ancienZoom * (1 - .1 * deltaY), maxZoom));
    const point = {
      clientX: event.clientX,
      clientY: event.clientY
    };

    /*if (z != ancienZoom)
    {*/
      const futur = zoom(z, point);
      conteneurSysteme.customScroll(futur.scrollX, futur.scrollY);
    /*}*/

    requestAnimationFrame(() => { patience = 1 });
  }
}, {passive: false});

// On surveille le scroll et le zoom au toucher
divSysteme.addEventListener('touchstart', gestionTouch);
divSysteme.addEventListener('touchend', gestionTouch);

let isClick, isClickTimer;
function gestionTouch(event) {
  if (Menu.open)
    return;

  // Zoom
  if (event.touches.length == 2) {
    event.preventDefault();
    pointDeZoom = {
      clientX: 0.5 * (event.touches[0].clientX + event.touches[1].clientX),
      clientY: 0.5 * (event.touches[0].clientY + event.touches[1].clientY)
    };
    premierPinchyZoom = ancienZoom;
    const ecartX = Math.abs(Math.round(event.touches[0].clientX) - Math.round(event.touches[1].clientX));
    const ecartY = Math.abs(Math.round(event.touches[0].clientY) - Math.round(event.touches[1].clientY));
    const ecart = Math.sqrt(Math.pow(ecartX, 2) + Math.pow(ecartY, 2));
    premierEcart = ecart;
    ancienEcart = premierEcart;
    
    divSysteme.addEventListener('touchmove', pinch_move);
  }
  else {
    divSysteme.removeEventListener('touchmove', pinch_move);
    ancienEcart = -1;
    pointDeZoom = 0;
  }

  // Scrolling
  if (event.touches.length == 1) {
    event.preventDefault();
    firstTouch = [event.touches[0].clientX, event.touches[0].clientY];
    lastTouch = firstTouch;

    divSysteme.addEventListener('touchmove', systemeScroll);
  }
  else {
    divSysteme.removeEventListener('touchmove', systemeScroll);
  }

  // Fermeture des menus ouverts
  if (event.type == 'touchstart') {
    isClick = 1;
    clearTimeout(isClickTimer);
    isClickTimer = setTimeout(() => { isClick = 0; }, 400);
  }

  if (event.type == 'touchend' && event.touches.length == 0) {
    clearTimeout(isClickTimer);
    if (isClick)
      Menu.closeAll();
    else
      event.preventDefault();
  }
}