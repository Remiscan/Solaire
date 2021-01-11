import { Systeme } from '../systeme/Systeme.js';
import { getString } from './traduction.js';
import { Notification } from './Notification.js';
import { Menu } from './Menu.js';



/////////////////////////////////////////////
// Voyage vers le système indiqué par le code
export class Voyage {
  static async go(code) {
    const boutonRedim = document.getElementById('bouton-redimensionner');

    try {
      await Menu.closeAll();
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
        new Notification(getString('erreur-systeme-non-atteint'), 'error');
      else if (raison == 'Code invalide')
        new Notification(getString('erreur-adresse-invalide'), 'error');
    }
  }

  static saisie() {
    let i_kc = 0;
    const codeSaisi = document.getElementById('code-saisi').value;
    if (codeSaisi != '')
    {
      document.getElementById('code-saisi').readonly = true;
      document.getElementById('code-saisi').blur();
      const isKeyboardClosed = () => {
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
        Voyage.go(codeSaisi);
      });
    }
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