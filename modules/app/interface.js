import { Decouverte } from './Decouverte.js';
import { Menu } from './Menu.js';
import { Partage } from './Partage.js';
import { getString } from './traduction.js';



//////////////////////////////////////////////////
// Affiche un effet d'animation autour des boutons
let pulseTimeout;
function pulseBouton(event) {
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
  champ.addEventListener('focus', event => {
    const inputCode = event.currentTarget;

    if (navigator.clipboard) {
      navigator.clipboard.readText()
      .then(texte => { 
        if (isNaN(texte)) {
          try {
            inputCode.value = texte.match(/(solaire\/systeme\/)(.+)/)[2];
          }
          catch(error) {
            inputCode.value = '';
          }
        }
        else inputCode.value = texte;
      });
    }

    inputCode.addEventListener('paste', event => {
      event.preventDefault();
      let texte = (event.clipboardData || window.clipboardData).getData('text');
      if (isNaN(texte)) {
        try {
          texte = texte.match(/(solaire\/systeme\/)(.+)/)[2];
        }
        catch(error) {
          texte = '';
        }
      }
      inputCode.value = texte;
    });
  });

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


///////////////////////////////////////////////////////////////////////
// Gère le focus sur les éléments non-boutons, avec la classe focusable

// Spécifie quel objet est en focus
let focused = false;

// Quand un objet est en focus, on surveille les appuis sur entrée et on simule un clic dessus
export function createFocusability(parent)
{
  const iFocus = element => { if (focused != element) focused = element; }
  const focusable = [...parent.getElementsByClassName('focusable')];
  focusable.forEach(e => {
    // Quand le focus est placé sur un élément, on le met dans la variable focused
    e.addEventListener('focusin', () => {
      iFocus(e);
    });

    // Quand on appuie sur entrée alors qu'un élément est en focus, on simule un clic dessus
    // sauf si c'est un a avec attribut href.
    e.addEventListener('keypress', event => {
      if (e.tagName.toLowerCase() != 'button')
      {
        const key = event.which || event.keyCode;
        if (key === 13 || key == 32)
        {
          if (!e.getAttribute('href'))
            simulateClick(e);
        }
      }
    });

    // On perd le focus après avoir cliqué sur l'élément, sinon il garde son style :focus
    e.addEventListener('mouseleave', () => {
      e.blur();
    });
  });
}