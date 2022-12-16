<style>
  html {
    color-scheme: light dark;
  }
</style>

<button type="button" id="finder">Trouver</button>

<script src="/solaire/ext/MersenneTwister.js"></script>
<script defer src="/solaire/ext/localforage.min.js"></script>
<script type="module">
  import { Systeme } from '/solaire/modules/systeme/Systeme.js?d=<?=time()?>';

  function find(verification, maxIterations) {
    console.log('Début de recherche...');
    const s = Systeme.find(verification, 1000);
    console.log('Fin de recherche. Trouvé :', s?.seed);
    const p = document.createElement('p');
    p.innerHTML = s.seed ? `<a href="/solaire/systeme/${s.seed}" target="_blank">${s.seed}</a>`
                         : 'Aucun système trouvé';
    document.body.appendChild(p);
  }
  
  // Pour trouver un système en cliquant sur le bouton
  const button = document.querySelector('#finder');
  button.addEventListener('click', () => {
    const verification = s => s?.etoile?.couleur == 300;
    const maxIterations = 1000;
    find(verification, maxIterations);
  });

  // Pour trouver un système à partir d'un event lancé dans la console
  window.addEventListener('find', event => {
    const verification = event?.detail?.verification;
    const maxIterations = event?.detail?.iterations;
    find(verification, maxIterations);
  });

console.log(`Pour trouver un système, copier-coller:

  window.dispatchEvent(new CustomEvent('find', { detail: {
    verification: s => s?.etoile?.couleur == 300,
    iterations: 1000
  } }));
  
Exemples :

- Trouver une étoile de couleur 300 :
    verification: s => s?.etoile?.couleur == 300,

- Trouver un système à 7 planètes :
    verification: s => s?.etoile?.planetes?.length == 7,

- Trouver un système avec une planète à 3 lunes :
    verification: s => {
      const planetes = s?.etoile?.planetes || [];
      for (const p of planetes) {
        if (p?.lunes?.length == 3) return true;
      }
      return false;
    },
`);
</script>