// REV 3
const PRE_CACHE = 'solaire-sw';





///// EVENTS


// INSTALLATION
self.addEventListener('install', event => {
  console.log('[install] Début de l\'installation du service worker...');
  event.waitUntil(
    caches.open(PRE_CACHE)
    .then(cache => json2cache(cache))
    .then(() => {
      console.log('[install] Tous les fichiers sont dans le cache !');
      return deleteOldCaches(PRE_CACHE, 'install');
    })
    .catch(raison => console.log('[install] ' + raison))
    .then(() => {
      console.log('[install] Le service worker est bien installé !');
      return self.skipWaiting(); // force l'activation du service worker
    })
    .catch(error => console.error(error))
  )
});


// ACTIVATION
self.addEventListener('activate', event => {
  console.log('[activate] Activation du service worker');
  console.log('[activate] Définition de ce service worker comme service worker actif de cette page');
  event.waitUntil(self.clients.claim());
});


// FETCH
self.addEventListener('fetch', event => {
  //console.log('[fetch] Le service worker récupère l\'élément ' + event.request.url);

  const ignore = ['find.php'];
  if (event.request.url.match(ignore.join('|'))) return;

  // Si on demande index.php via n'importe quel lien qui y mène,
  // On récupère index.php dans le cache, et s'il n'y est pas, sur le réseau
  if (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html')))
  {
    event.respondWith(
      getDBversion()
      .then(version => caches.match('index--' + version + '.php'))
      .then(matching => {
        return matching || fetch(event.request);
      })
      .catch(error => console.error(error))
    )
  }

  // Sinon,
  // On récupère le contenu dans le cache, et s'il n'y est pas, sur le réseau
  else
  {
    event.respondWith(
      caches.match(event.request)
      .then(matching => {
        return matching || fetch(event.request);
      })
      .catch(error => console.error(error))
    )
  }
});


// MESSAGE
self.addEventListener('message', event => {
  const source = event.source; // client source du message

  // UPDATE
  if (event.data.action == 'update')
  {
    const newCACHE = PRE_CACHE + '-' + event.data.version;
    const responsePORT = event.ports[0];
    console.log('[update] Mise à jour du cache demandée...');
    event.waitUntil(
      caches.open(newCACHE)
      .then(cache => json2cache(cache, source))
      .then(() => {
        console.log('[update] Mise à jour du cache terminée !');
        // Supprimons les vieux caches
        return deleteOldCaches(newCACHE, 'update')
        .catch(raison => console.log('[update] ' + raison))
        .then(() => {
          responsePORT.postMessage({message: '[update] Nettoyage terminé !'});
        });
      })
      .catch(error => {
        source.postMessage({loaded: false, erreur: true});
        console.error(error);
        return caches.delete(newCACHE)
        .then(() => 
          console.log('[:(] Mise à jour annulée')
        );
      })
    );
  }
});





///// FONCTIONS


// Supprimer tous les caches qui ne sont pas newCache
async function deleteOldCaches(newCache, action) {
  try {
    const allCaches = await caches.keys();
    if (allCaches.length <= 1) throw 'aucun-redondant';

    console.log(`[${action}] Nettoyage des anciennes versions du cache`);
    await Promise.all(allCaches.map(ceCache => {
      if (ceCache.startsWith(PRE_CACHE) && newCache != ceCache)
        return caches.delete(ceCache);
    }));

    return console.log(`[${action}] Nettoyage terminé !`);
  }
  catch(error) {
    if (error != 'aucun-redondant')
      return console.error(error);
  }
}


// Place les fichiers du cache.json en cache, puis prévient source
async function json2cache(cache, source = false) {
  const extToBust = /\.(css|json|js|php|html)$/;
  const action = source ? 'update' : 'install';

  // On récupère le contenu du fichier cache.json
  let jsondata = await fetch(`cache.json?${Date.now()}`);
  if (jsondata.status != 200)
    throw 'Erreur ' + jsondata.status + ' lors de la requête de cache.json';
  jsondata = await jsondata.json();

  // Ensuite, on ajoute au cache la liste des fichiers du cache.json
  console.log(`[${action}] Mise en cache des fichiers listés dans cache.json : `, jsondata.fichiers);
  const totalFichiers = jsondata.fichiers.length;
  const version = jsondata.version;

  await updateDBversion(version);
  await Promise.all(jsondata.fichiers.map(async url => {
    let request = new Request(url.replace(extToBust, '--' + version + '.$1'), {cache: 'no-store'});
    const response = await fetch(request);
    if (!response.ok) throw Error(`[${action}] Le fichier n\'a pas pu être récupéré...`);
    if (source)       source.postMessage({ loaded: true, total: totalFichiers, url: request.url });
    return cache.put(request, response);
  }));
  return;
}


// Met à jour la version dans indedexDB
async function updateDBversion(ver) {
  try {
    const result = await new Promise((resolve, reject) => {
      const ouvertureDB = indexedDB.open('solaire', 1);

      // Si la DBB n'existe pas, on la crée et on stocke la version dedans
      ouvertureDB.onupgradeneeded = event => {
        const db = event.target.result;
        const store = db.createObjectStore('version', { keyPath: 'id' });
        store.createIndex('id', 'id', { unique: true });

        store.transaction.oncomplete = () => {
          const store_1 = db.transaction('version', 'readwrite')
                            .objectStore('version');
          store_1.add({ id: 'version', version: ver });
          resolve('[bdd-install] Numéro de version stocké');
        };
      };

      // On met à jour la version stockée dans la BDD
      ouvertureDB.onsuccess = event_1 => {
        const db_1 = event_1.target.result;
        const store_2 = db_1.transaction('version', 'readwrite')
                            .objectStore('version');
        const getVersion = store_2.get('version');

        getVersion.onsuccess = () => {
          const data = getVersion.result;
          data.version = ver;

          const maj = store_2.put(data);

          maj.onsuccess = () => resolve('[bdd-update] Numéro de version mis à jour');
          maj.onerror = () => reject('[bdd-update] Numéro de version périmé');
        };

        getVersion.onerror = () => reject('[bdd-check] Numéro de version indisponible');
      };

      ouvertureDB.onerror = () => reject('[bdd] Indisponible');
    });
    return console.log(result);
  }
  catch (error) {
    console.error(error);
    return 0;
  }
}


// Récupère le numéro de version dans la BDD
async function getDBversion() {
  try {
    const version = await new Promise((resolve, reject) => {
      const ouvertureDB = indexedDB.open('solaire', 1);

      ouvertureDB.onsuccess = event => {
        const db = event.target.result;
        const getVersion = db.transaction('version', 'readwrite')
                             .objectStore('version')
                             .get('version');

        getVersion.onsuccess = () => resolve(getVersion.result.version);
        getVersion.onerror = () => reject('[bdd-check] Numéro de version indisponible');
      };

      ouvertureDB.onerror = () => reject('[bdd] Indisponible');
    });
    return version;
  }
  catch (error) {
    console.error(error);
    return 0;
  }
}