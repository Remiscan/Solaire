import { wait } from './Params.js';



const elements = [...document.querySelectorAll('.minipop')];
const manuels = ['parametres', 'partage', 'decouvertes'];
const menus = [];
let initialised = false;

let isOpen = 0;



export class Menu {
  constructor(id) {
    this.id = id;
    this.element = document.getElementById('pop-' + id);
    if (!manuels.includes(id)) return;

    this.bouton = document.getElementById('bouton-' + id);
    this.bouton.addEventListener('click', event => {
      if (id == 'partage') {
        Menu.open(this.id);
        setTimeout(() => pop.classList.remove('on'), 3000);
      }
      else {
        this.toggle();
      }
    });
  }

  async open() {
    await Menu.closeAll();
    const isOn = this.element.classList.contains('on');
    if (!isOn) {
      window.addEventListener('keydown', window.cp = event => {
        const key = event.which || event.keyCode;
        if (key == 27) Menu.closeAll();
      });

      this.element.classList.add('on');
      document.querySelector('.conteneur-systeme').addEventListener('click', Menu.closeAll);
      if (!['pop-notification', 'pop-nouvelle-decouverte', 'pop-parametres'].includes(this.element.id))
        isOpen = 1;

      if (['pop-decouvertes', 'pop-parametres'].includes(this.element.id)) {
        // On désactive le focus des boutons en-dehors du menu (et de son bouton d'ouverture)
        for (const b of [...document.querySelectorAll('.boutons-groupe>button')]) {
          if (!b.id.includes(this.element.id.replace('pop-', '')))
            b.tabIndex = -1;
        }
        document.querySelector('.reset-zoom').tabIndex = -1;
      }

      // On active les boutons présents dans le menu
      for (const b of [...this.element.querySelectorAll('button, input')]) {
        b.disabled = false;
        b.tabIndex = 0;
      }
      for (const b of [...this.element.querySelectorAll('.focusable')]) {
        b.tabIndex = 0;
      }
    }

    await wait(100);
    return;
  }

  async close() {
    const isOn = this.element.classList.contains('on');
    if (!isOn) return false;

    this.element.classList.remove('on');

    // On active les boutons en-dehors des menus
    for (const b of [...document.querySelectorAll('.boutons-groupe>button')]) {
      b.tabIndex = 0;
    }
    document.querySelector('.reset-zoom').tabIndex = document.querySelector('.reset-zoom').classList.contains('on') ? 0 : -1;

    // On désactive les boutons dans les menus
    for (const b of [...this.element.querySelectorAll('button, input')]) {
      b.disabled = true;
      b.tabIndex = -1;
    }
    for (const b of [...this.element.querySelectorAll('.focusable')]) {
      b.tabIndex = -1;
    }

    return true;
  }

  async toggle() {
    this.bouton.blur();
    const isOn = this.element.classList.contains('on');
    if (isOn) await Menu.closeAll();
    else      await this.open();
  }

  static async openId(id) {
    if (!initialised) throw 'Menus non initialisés';
    
    const k = menus.findIndex(m => m.id == id);
    if (k == -1) throw 'Menu inexistant';
    const menu = menus[k];
    menu.open();
  }

  static async toggleId(id) {
    if (!initialised) throw 'Menus non initialisés';
    
    const k = menus.findIndex(m => m.id == id);
    if (k == -1) throw 'Menu inexistant';
    const menu = menus[k];
    menu.toggle();
  }

  static async closeAll() {
    if (!initialised) throw 'Menus non initialisés';
    
    let wereOpen = 0
    for (const menu of menus) {
      const wasOpen = await menu.close();
      if (wasOpen) wereOpen++;
    }

    const elementsToBlur = [document.getElementById('code-saisi')];
    elementsToBlur.forEach(e => {
      if (e != null)
      {
        e.blur();
        e.value = '';
      }
    });

    let delay = (wereOpen > 0) ? 200 : 0;
    document.getElementById('systeme').removeEventListener('click', Menu.closeAll);
    window.removeEventListener('keydown', window.cp);
    isOpen = 0;
    await wait(delay);

    return;
  }

  static init() {
    if (initialised) throw 'Menus déjà initialisés';
    
    for (const el of elements) {
      const id = el.id.replace('pop-', '');
      const menu = new Menu(id);
      menus.push(menu);
    }

    initialised = true;
  }

  // Change d'onglet dans le carnet de bord
  static ongletCarnet(ongletId) {
    const id = ongletId.replace('onglet-', '');
    const onglets = ['decouvertes', 'navigation'];
    const pop = document.getElementById('pop-decouvertes');
    onglets.forEach(e => {
      if (e != ongletId)
      {
        pop.classList.remove('on-' + e);
        document.getElementById('onglet-' + e).classList.remove('on');
      }
    });
    pop.classList.add('on-' + id);
    document.getElementById('onglet-' + id).classList.add('on');

    if (id == 'navigation' && pop.classList.contains('on'))
    {
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
    else if (id == 'decouvertes' && pop.classList.contains('on'))
    {
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

  static get open() {
    return !!isOpen;
  }
}