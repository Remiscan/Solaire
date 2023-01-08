import { Decouverte } from './Decouverte.js';
import { Menu } from './Menu.js';
import { Partage } from './Partage.js';
import { getString } from './traduction.js';



//////////////////////////////////////////////////
// Affiche un effet d'animation autour des boutons
let pulseTimeout;
export function pulseBouton(event) {
  return new Promise(resolve => {
    const target = event.currentTarget;
    clearTimeout(pulseTimeout);
    target.classList.add('on');
    pulseTimeout = setTimeout(() => {
      target.classList.remove('on');
      resolve();
    }, 200);
  });
}


////////////////////////////////////////
// Initialise les boutons de l'interface
export function initInterface() {
  // Boutons précédent et suivant
  document.getElementById('bouton-precedent').addEventListener('click', event => {
    Menu.closeAll();
    history.back();
  });

  document.getElementById('bouton-suivant').addEventListener('click', event => {
    Menu.closeAll();
    history.forward();
  });

  // Champ de saisie d'adresse
  const champ = document.getElementById('code-saisi');
  champ.placeholder = getString('saisie-placeholder');

  document.getElementById('bouton-code-saisi').addEventListener('click', () => {
    let i_kc = 0;
    const champ = document.getElementById('code-saisi');
    const codeSaisi = champ.value;
    if (codeSaisi != '')
    {
      champ.readonly = true;
      champ.blur();
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
        const ev = new CustomEvent('voyage', { detail: { systeme: codeSaisi } });
        window.dispatchEvent(ev);
      });
    }
  });

  // Onglets du menu découvertes
  for (const onglet of [...document.querySelectorAll('.onglet')]) {
    onglet.addEventListener('click', event => Menu.ongletCarnet(event.currentTarget.id));
  }

  // Bouton explorer
  document.getElementById('bouton-explorer').addEventListener('click', async event => {
    await pulseBouton(event);
    const ev = new CustomEvent('voyage', { detail: { systeme: undefined } });
    window.dispatchEvent(ev);
  }, {passive: true});

  // Bouton découvertes
  document.getElementById('bouton-decouvertes').addEventListener('click', async () => {
    const menuNouv = Menu.get('nouvelle-decouverte');
    if (menuNouv.on) await menuNouv.close();
    const menu = Menu.get('decouvertes');
    await menu.toggle();
    const onglet =  document.getElementById('pop-decouvertes').classList.contains('on-decouvertes') ? 'onglet-decouvertes' : 
                    document.getElementById('pop-decouvertes').classList.contains('on-navigation') ? 'onglet-navigation' : '';
    Menu.ongletCarnet(onglet);
  });

  // Bouton supprimer découvertes
  document.getElementById('supprimer-decouvertes').addEventListener('click', Decouverte.clearAll);

  // Bouton redimensionner
  document.getElementById('bouton-redimensionner').addEventListener('click', event => {
    pulseBouton(event)
    .then(() => {
      const ev = new CustomEvent('voyage', { detail: { systeme: history.state.systeme } });
      window.dispatchEvent(ev);
    });
  }, {passive: true});

  // Bouton partager
  document.getElementById('bouton-partage').addEventListener('click', () => new Partage());

  // Pop nouvelles découvertes
  document.getElementById('pop-nouvelle-decouverte').addEventListener('click', Menu.closeAll);

  // Bouton recherche màj et bouton màj
  document.querySelector('.bouton-check-maj').addEventListener('click', () => window.dispatchEvent(new Event('check-update')));
  document.getElementById('bouton-maj').addEventListener('click', () => window.dispatchEvent(new Event('app-update')));
}