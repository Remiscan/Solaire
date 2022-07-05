import { wait } from './Params.js';



const menus = [];
let initialised = false;

let isOpen = 0;



export class Menu {
  constructor(id) {
    this.id = id;
    this.element = document.getElementById('pop-' + id);
    this.on = false;

    this.bouton = document.querySelector(`button[data-menu='${id}']`);
    if (!this.bouton) return;
    this.bouton.addEventListener('click', event => {
      this.toggle();
    });
  }


  ////////////////
  // Ouvre le menu
  async open(delay = true) {
    if (this.on) return;

    isOpen++;
    this.on = true;
    this.element.classList.add('on');
    document.querySelector('.conteneur-systeme').addEventListener('click', Menu.closeAll);
    window.addEventListener('keydown', window.cp = event => {
      const key = event.which || event.keyCode;
      if (key == 27) Menu.closeAll();
    });

    if (['pop-decouvertes', 'pop-parametres'].includes(this.element.id)) {
      // On désactive le focus des boutons en-dehors du menu (et de son bouton d'ouverture)
      for (const b of [...document.querySelectorAll('.boutons-groupe>button')]) {
        if (!b.id.includes(this.element.id.replace('pop-', '')))
          b.tabIndex = -1;
      }
    }

    // On active les boutons présents dans le menu
    for (const b of [...this.element.querySelectorAll('button, input')]) {
      b.disabled = false;
      b.tabIndex = 0;
    }
    for (const b of [...this.element.querySelectorAll('.focusable')]) {
      b.tabIndex = 0;
    }

    if (delay)  await wait(100);
    return;
  }


  ////////////////
  // Ferme le menu
  async close(delay = true) {
    if (!this.on) return;

    isOpen--;
    this.on = false;
    this.element.classList.remove('on');
    if (isOpen <= 0) {
      document.querySelector('.conteneur-systeme').removeEventListener('click', Menu.closeAll);
      window.removeEventListener('keydown', window.cp);
    }

    if (this.id === 'nouvelle-decouverte' && document.querySelector('.nouvel-univers').classList.contains('on')) {
      document.querySelector('.nouvel-univers').classList.remove('on');
    }

    // On active les boutons en-dehors des menus
    for (const b of [...document.querySelectorAll('.boutons-groupe>button')]) {
      b.tabIndex = 0;
    }

    // On désactive les boutons dans les menus
    for (const b of [...this.element.querySelectorAll('button, input')]) {
      b.disabled = true;
      b.tabIndex = -1;
    }
    for (const b of [...this.element.querySelectorAll('.focusable')]) {
      b.tabIndex = -1;
    }
    document.getElementById('code-saisi').blur();

    if (delay)  await wait(100);
    return;
  }


  ////////////////////////////////////////
  // Ouvre ou ferme le menu selon son état
  async toggle() {
    if (this.on)  await this.close();
    else          await this.open();
  }


  //////////////////////////////////
  // Récupère un menu d'après son id
  static get(id) {
    const k = menus.findIndex(m => m.id == id);
    if (k == -1) throw 'Menu inexistant';
    const menu = menus[k];
    return menu;
  }


  ///////////////////////
  // Ferme tous les menus
  static async closeAll() {
    if (!initialised) throw 'Menus non initialisés';
    
    let delay = (isOpen > 0) ? 200 : 0;
    for (const menu of menus) {
      await menu.close(false);
    }

    await wait(delay);
    return;
  }


  ////////////////////
  // Prépare les menus
  static init() {
    if (initialised) throw 'Menus déjà initialisés';

    const elements = [...document.querySelectorAll('.minipop[data-menu]')];
    
    for (const el of elements) {
      const id = el.dataset.menu;
      const menu = new Menu(id);
      menus.push(menu);
    }

    initialised = true;
  }


  /////////////////////////////////////////
  // Change d'onglet dans le carnet de bord
  static ongletCarnet(ongletId) {
    const id = ongletId.replace('onglet-', '');
    const onglets = ['decouvertes', 'navigation'];
    const pop = document.getElementById('pop-decouvertes');
    onglets.forEach(e => {
      if (e != ongletId) {
        pop.classList.remove('on-' + e);
        document.getElementById('onglet-' + e).classList.remove('on');
      }
    });
    pop.classList.add('on-' + id);
    document.getElementById('onglet-' + id).classList.add('on');

    if (id == 'navigation' && pop.classList.contains('on')) {
      document.getElementById('code-saisi').disabled = false;
      document.getElementById('code-saisi').tabIndex = 0;
      document.getElementById('bouton-code-saisi').disabled = false;
      document.getElementById('bouton-code-saisi').tabIndex = 0;
      Array.from(pop.querySelector('.liste-decouvertes').querySelectorAll('button, input, .focusable')).forEach(b => {
        b.tabIndex = -1;
      });
      Array.from(pop.querySelector('.liste-navigation').querySelectorAll('button, input, .focusable')).forEach(b => {
        b.tabIndex = 0;
      });
      document.getElementById('supprimer-decouvertes').tabIndex = -1;
    }
    else if (id == 'decouvertes' && pop.classList.contains('on')) {
      document.getElementById('code-saisi').disabled = true;
      document.getElementById('code-saisi').tabIndex = -1;
      document.getElementById('bouton-code-saisi').disabled = true;
      document.getElementById('bouton-code-saisi').tabIndex = -1;
      Array.from(pop.querySelector('.liste-decouvertes').querySelectorAll('button, input, .focusable')).forEach(b => {
        b.tabIndex = 0;
      });
      Array.from(pop.querySelector('.liste-navigation').querySelectorAll('button, input, .focusable')).forEach(b => {
        b.tabIndex = -1;
      });
      document.getElementById('supprimer-decouvertes').tabIndex = 0;
    }
  }


  /////////////////////////////////////////////////
  // Répond à la question "un menu est-il ouvert ?"
  static get open() {
    return !!isOpen;
  }
}