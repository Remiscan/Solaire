import { Menu } from './Menu.js';
import { wait } from './Params.js';



const parametresData = [
  { id: 'animation', classe: 'paused', classType: 'negative', bouton: 'bouton-pause', default: 1 },
  { id: 'interface', classe: 'no-interface', classType: 'negative', bouton: 'bouton-interface', default: 1},
  { id: 'fond', classe: 'no-bg', classType: 'negative', switch: 'switch-bg', default: 1 },
  { id: 'planetesTexturees', classe: 'no-textures', classType: 'negative', switch: 'switch-textures', default: 1 },
  { id: 'orbites', classe: 'no-orbits', classType: 'negative', switch: 'switch-orbites', default: 1 },
  { id: 'orbitesLunaires', classe: 'no-lunar-orbits', classType: 'negative', switch: 'switch-orbites-lunaires', default: 1 },
  { id: 'orbitesColorees', classe: 'orbites-blanches', classType: 'negative', switch: 'switch-orbites-colorees', default: 1 },
  { id: 'ombresExagerees', classe: 'ombres-exagerees', classType: 'positive', switch: 'switch-ombres-exagerees', default: 0 },
  { id: 'ombres', classe: 'no-shadows', classType: 'negative', switch: 'switch-ombres', default: 1 },
  { id: 'ombresNonAdditives', classe: 'ombres-non-additives', classType: 'positive', switch: 'switch-ombres-na', default: 1 }
];

const parametres = [];
let initialised = false;



export class Parametre {
  constructor(id, value) {
    const k = parametresData.findIndex(p => p.id == id);
    if (k == -1) throw 'Paramètre inexistant';

    const data = parametresData[k];
    this.id = id;
    this.classe = data.classe;
    this.classType = data.classType;
    this.button = !!data.bouton ? document.getElementById(data.bouton) : false;
    this.switch = !!data.switch ? document.getElementById(data.switch) : false;
    this.value = (typeof value != 'undefined') ? Number(!!value) : Number(!!data.default);
  }

  async change() {
    this.value = Number(!this.value);
    await this.apply();
    Parametre.save();
    return;
  }

  async apply() {
    if (!!this.button) {
      const bouton = this.button.querySelector('.material-icons');
      const state = !!this.value ? 'on' : 'off';
      bouton.innerHTML = bouton.parentElement.dataset[state];
    }
    else if (!!this.switch) {
      this.switch.checked = !!this.value;
    }
    await wait(200);
    if (
      (!this.value && this.classType == 'negative')
      || (this.value && this.classType == 'positive')
    )     document.documentElement.classList.add(this.classe);
    else  document.documentElement.classList.remove(this.classe);
    return;
  }

  // Initialise les paramètres à partir du stockage local
  static init() {
    if (initialised) throw 'Paramètres déjà initialisés';

    const savedData = JSON.parse(localStorage.getItem('solaire/parametres')) || [];
    for (const p of parametresData) {
      const k = savedData.findIndex(d => d.id == p.id);
      const value = (k != -1) ? savedData[k].valeur : p.default;
      const param = new Parametre(p.id, value);
      parametres.push(param);

      if (!!param.switch) {
        param.switch.addEventListener('click', () => {
          param.change();
        }, {passive: true});
      }
      else if (!!param.button) {
        if (param.button.id == 'bouton-pause') {
          param.button.addEventListener('click', async () => {
            await Menu.closeAll();
            param.change();
          }, {passive: true});
        }
        else if (param.button.id == 'bouton-interface') {
          param.button.addEventListener('click', async () => {
            await Menu.closeAll();
            const hideInterface = !document.documentElement.classList.contains('no-interface');
            param.change();
            for (const b of [...document.querySelectorAll('.boutons-groupe>button')]) {
              if (b.id != 'bouton-explorer' && b.id != 'bouton-interface')
                b.tabIndex = hideInterface ? -1 : 0;
            }
          });
        }
      }

      param.apply();
    }

    initialised = true;
    Parametre.save();
  }

  // Sauvegarde les paramètres dans le stockage local
  static save() {
    if (!initialised) throw 'Paramètres non initialisés';

    const savedData = [];
    for (const p of parametres) {
      savedData.push({ id: p.id, valeur: p.value });
    }
    localStorage.setItem('solaire/parametres', JSON.stringify(savedData));
  }
}