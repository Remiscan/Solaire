import { Systeme } from '../systeme/Systeme.js';
import { getString } from './traduction.js';
import { closePops } from './interface.js';
import { notify } from './notification.js';
import { favoriActuel } from './favoris.js';
import { nouvellesDecouvertes } from './decouvertes.js';



/////////////////////////////////////////////
// Voyage vers le système indiqué par le code
export async function visiter(code)
{
  const boutonRedim = document.getElementById('bouton-redimensionner');

  try {
    await closePops();
    if (isNaN(code))
      throw 'Code invalide';

    if (code == history.state.systeme)
      throw 'Système actuel';

    window.derniereGeneration = Date.now();
    const boutonSuivant = document.getElementById('bouton-suivant');
    boutonSuivant.disabled = true;
    boutonSuivant.tabIndex = -1;
    boutonRedim.classList.remove('needed');
    boutonRedim.disabled = true;
    boutonRedim.tabIndex = -1;

    const systeme = new Systeme(code);
    systeme.populate();

    favoriActuel();
    nouvellesDecouvertes(Array.from(systeme.decouvertes));
  }

  catch(raison) {
    if (raison == 'Système actuel')
    {
      const systeme = new Systeme(code, history.state.date);
      systeme.populate();

      boutonRedim.classList.remove('needed');
      boutonRedim.disabled = true;
      boutonRedim.tabIndex = -1;
    }
    else if (raison == 'Mauvais système')
      notify(getString('erreur-systeme-non-atteint'), 'error');
    else if (raison == 'Code invalide')
      notify(getString('erreur-adresse-invalide'), 'error');
  }
}



/////////////////////////////////////////
// Voyage vers le code saisi manuellement
let i_kc = 0;
export function visiterSaisie()
{
  const codeSaisi = document.getElementById('code-saisi').value;
  if (codeSaisi != '')
  {
    document.getElementById('code-saisi').readonly = true;
    document.getElementById('code-saisi').blur();
    function isKeyboardClosed()
    {
      i_kc++;
      return new Promise((resolve, reject) => {
        if (document.getElementById('bouton-redimensionner').classList.contains('needed') && i_kc < 50)
          return wait(100).then(reject);
        else {
          i_kc = 0;
          return resolve();
        }
      })
      .catch(isKeyboardClosed);
    }

    isKeyboardClosed()
    .then(() => {
      document.getElementById('code-saisi').readonly = false;
      visiter(codeSaisi);
    });
  }
}