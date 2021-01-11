import { Menu } from './Menu.js';
import { wait } from './Params.js';



export class Notification {
  constructor() {}

  static async create(message, type = null, duree = 5000, boutons = false) {
    await Menu.closeAll();
    
    const icone = document.querySelector('.notification-icone');
    const notification = document.querySelector('.notification-message');
    const actions = document.querySelector('.notification-actions');
    icone.innerHTML = '';
    notification.innerHTML = '';
    actions.innerHTML = '';
    const types = ['error'];

    // Icône de notification, si un type est fourni
    types.forEach(t => notification.parentElement.classList.remove(t));
    if (type != null) {
      notification.parentElement.classList.add(type);
      icone.innerHTML += `<i class="material-icons">${type}</i>`;
    }

    // Message de notification
    notification.innerHTML += message;

    // Boutons de la notification, si des actions sont fournies :
    //// "boutons" est un array d'objets de la forme { texte: '', action: fonction, type: 'normal'/'icone' }
    if (boutons)
    {
      boutons.forEach(e => {
        const bouton = document.createElement('button');
        if (e.type == 'icone')
          bouton.innerHTML = `<i class="material-icons">${e.texte}</i>`;
        else
          bouton.innerHTML = e.texte;
        bouton.onclick = () => { e.action() };
        actions.appendChild(bouton);
      });
    }

    Menu.openId('notification');
    await wait(duree);
    Menu.closeAll();

    icone.innerHTML = '';
    notification.innerHTML = '';
    actions.innerHTML = '';

    return;
  }
}