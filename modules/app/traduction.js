import dataStorage from './localForage.js';
import { recalcOnResize, wait } from './Params.js';



let langage;
const Textes = {};

///////////////////////////////////////////////////////
// Place le texte français ou anglais aux bons endroits
export async function textualiser()
{
  const localLang = await dataStorage.getItem('langage');
  const httpLang = document.documentElement.dataset.httpLang;
  const navLang = navigator.language;
  if (localLang != null)
    langage = (localLang == 'fr') ? 'fr' : 'en';
  else if (httpLang)
    langage = (httpLang == 'fr') ? 'fr' : 'en';
  else if (navLang != null)
    langage = navLang.includes('fr') ? 'fr' : 'en';
  else
    langage = 'fr';

  document.documentElement.lang = langage;
  const version = document.documentElement.dataset.version;

  return new Promise((resolve, reject) => {
    if (Object.keys(Textes).length === 0 && Textes.constructor === Object)
    {
      fetch('/solaire/strings--' + version + '.json')
      .then(response => {
        if (response.status == 200)
          return response;
        else
          throw '[:(] Erreur ' + response.status + ' lors de la requête';
      })
      .then(response => response.json())
      .then(response => {
        Textes.fr = response.fr;
        Textes.en = response.en;
        Object.freeze(Textes);
        Object.freeze(Textes.fr);
        Object.freeze(Textes.en);
        return resolve();
      })
      .catch(error => reject(error));
    }
    else resolve();
  })
  .then(() => {
    Array.from(document.querySelectorAll('[data-string]')).forEach(e => {
      e.innerHTML = getString(e.dataset.string);
    });
    return;
  })
  .catch(error => console.error(error));
}



///////////////////////////////////////////////////////////////////////////
// Récupère un string dans la langue choisie, et en français si non-traduit
export function getString(id, lang = langage)
{
  const t = Textes[lang][id] || Textes['fr'][id];
  const temp = document.createElement('div');
  temp.textContent = t;
  return temp.innerHTML;
}



//////////////////////////////////
// Change la langue entre FR et EN
export async function switchLangage()
{
  langage = (langage == 'fr') ? 'en' : 'fr';
  await dataStorage.setItem('langage', langage);
  document.querySelector('.bouton-langage').removeEventListener('click', switchLangage);
  document.querySelector('.bouton-langage').innerHTML = '•••';
  return wait(50)
  .then(textualiser)
  .then(() => {
    recalcOnResize();
    document.getElementById('code-saisi').placeholder = getString('saisie-placeholder');
    document.querySelector('.bouton-langage').addEventListener('click', switchLangage);
  });
}



///////////////////////////////////////////
// Active le bouton de changement de langue
document.querySelector('.bouton-langage').addEventListener('click', switchLangage);