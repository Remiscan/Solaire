import { Menu } from './Menu.js';
import { wait } from './Params.js';
import { getString } from './traduction.js';



export class Partage {
  constructor() {
    const codeSysteme = history.state.systeme;
    const urlSysteme = window.location.href.includes(codeSysteme) ? window.location.href : window.location.href + 'systeme/' + codeSysteme;

    if (navigator.share) {
      navigator.share({
        title: 'Solaire',
        text: getString('partage-description'),
        url: urlSysteme
      })
      .then(() => console.log('[:)] Système partagé !'))
      .catch(error => console.log('[:(] Erreur de partage...', error));
    }

    else if (navigator.clipboard) {
      navigator.clipboard.writeText(urlSysteme)
      .then(() => Partage.notify())
      .catch(() => notify(getString('erreur-partage'), 'error'));
    }
    
    else {
      const input = document.getElementById('url-getter');
      input.innerHTML = urlSysteme;
      input.select();
      let copie = false;

      try {
        copie = document.execCommand('copy');
      }
      catch(error) {
        console.log('[:(] Copie impossible...');
        notify(getString('erreur-partage'), 'error');
      }
      finally {
        if (copie) Partage.notify();
      }
    }
  }


  ///////////////////////////////////
  // Ouvre la notification de partage
  static async notify() {
    const menu = Menu.get('partage');
    await menu.open();
    await wait(3000);
    await menu.close();
  }
}