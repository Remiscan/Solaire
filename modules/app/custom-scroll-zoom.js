import { Menu } from './Menu.js';
import { Fenetre } from './Params.js';



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
    Math.max(0, Math.min(coords[0], ancienZoom * Fenetre.tailleBody - window.innerWidth)),
    Math.max(0, Math.min(coords[1], ancienZoom * Fenetre.tailleBody - window.innerHeight))
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
function zoom(nouveauZoom, point = { clientX: window.innerWidth / 2, clientY: window.innerHeight / 2 }) {
  const Z = nouveauZoom / ancienZoom;
  document.getElementById('systeme').style.setProperty('--zoom', nouveauZoom);

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


////////////////
// Pinch to zoom
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


///////////////////////////////////////////
// Adapte le système à la taille de l'écran
export function resetWindow() {
  const conteneurSysteme = document.querySelector('.conteneur-systeme');
  const divSysteme = document.getElementById('systeme');

  minZoom = 1.01 * Math.max(window.innerWidth, window.innerHeight) / Fenetre.tailleBody;
  const coeff = (minZoom > 1) ? minZoom : 1;
  const posX = 0.5 * (coeff * Fenetre.tailleBody - window.innerWidth);
  const posY = 0.5 * (coeff * Fenetre.tailleBody - window.innerHeight);
  divSysteme.style.setProperty('--zoom', coeff);
  ancienZoom = coeff;
  conteneurSysteme.customScroll(posX, posY);
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


// On surveille le double clic
let lastPointerUp = 0;
let pointerUpCount = 0;
const maxDoubleClickDelay = 500;
const movedThreshold = 10;
divSysteme.addEventListener('pointerdown', event => {
  let hasMoved = false;

  const startPoint = {
    clientX: event.clientX,
    clientY: event.clientY
  };

  const onPointerMove = event => {
    const moveDistance = Math.sqrt((startPoint.clientX - event.clientX) ** 2 + (startPoint.clientY - event.clientY) ** 2);
    if (moveDistance > movedThreshold) {
      hasMoved = true;
    }
  };

  const onPointerUp = event => {
    pointerUpCount++;
    const now = Date.now();

    if (pointerUpCount === 2 && now - lastPointerUp < maxDoubleClickDelay && !hasMoved) {
      pointerUpCount = 0;
      divSysteme.dispatchEvent(new CustomEvent('double-pointerup', { detail: { clientX: event.clientX, clientY: event.clientY }}));
    } else if (hasMoved) {
      pointerUpCount = 0;
    }

    divSysteme.removeEventListener('pointermove', onPointerMove);
    divSysteme.removeEventListener('pointerup', onPointerUp);

    lastPointerUp = now;
  };

  divSysteme.addEventListener('pointermove', onPointerMove);
  divSysteme.addEventListener('pointerup', onPointerUp);
});


// On surveille le zoom au double clic
divSysteme.addEventListener('double-pointerup', async event => {
  if (patience) {
    patience = 0;

    const zoomDuration = 400; //ms
    const start = Date.now();

    const point = {
      clientX: event.detail.clientX,
      clientY: event.detail.clientY
    };

    const z = Math.max(minZoom, Math.min(ancienZoom * 1.7, maxZoom));

    while (Date.now() - start < zoomDuration) {
      const tempZ = ancienZoom + (z - ancienZoom) * (Date.now() - start) / zoomDuration;
      const futur = zoom(tempZ, point);
      conteneurSysteme.customScroll(futur.scrollX, futur.scrollY);
      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    const futur = zoom(z, point);
    conteneurSysteme.customScroll(futur.scrollX, futur.scrollY);

    requestAnimationFrame(() => { patience = 1 });
  }
});


// On surveille le scroll et le zoom au toucher
divSysteme.addEventListener('touchstart', gestionTouch);
divSysteme.addEventListener('touchend', gestionTouch);

let isClick, isClickTimer;
function gestionTouch(event) {
  if (Menu.open) return;

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