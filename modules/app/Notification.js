import { Menu } from './Menu.js';
import { wait } from './Params.js';



export class Notification {
  ///////////////////////////////////
  // Crée et affiche une notification
  static async create(message, type = null, duree = 5000, boutons = []) {
    Notification.reset();
    await Menu.closeAll();
    
    const icone = document.querySelector('.notification-icone');
    const notification = document.querySelector('.notification-message');
    const actions = document.querySelector('.notification-actions');
    const types = ['error'];

    // Icône de notification, si un type est fourni
    types.forEach(t => notification.parentElement.classList.remove(t));
    if (type != null) {
      notification.parentElement.classList.add(type);
      icone.innerHTML += `<i class="material-icons" aria-hidden="true">${type}</i>`;
    }

    // Message de notification
    notification.innerHTML += message;

    // Boutons de la notification, si des actions sont fournies :
    //// "boutons" est un array d'objets de la forme { texte: '', action: fonction, type: 'normal'/'icone' }
    for (const e of boutons) {
      const bouton = document.createElement('button');
      if (e.type == 'icone')  bouton.innerHTML = `<i class="material-icons" aria-hidden="true">${e.texte}</i>`;
      else                    bouton.innerHTML = e.texte;
      bouton.addEventListener('click', () => { e.action() });
      actions.appendChild(bouton);
    }

    // Affichage de la notification
    const menu = Menu.get('notification');
    await menu.open();
    await wait(duree);
    await menu.close();

    Notification.reset();
    return;
  }


  ///////////////////////////////
  // Réinitialise la notification
  static reset() {
    const icone = document.querySelector('.notification-icone');
    const notification = document.querySelector('.notification-message');
    const actions = document.querySelector('.notification-actions');

    icone.innerHTML = '';
    notification.innerHTML = '';
    actions.innerHTML = '';
  }

  static get maxDelay() {
    return 2147483000;
  }
}