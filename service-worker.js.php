/* <?php
$cacheFiles = json_decode(file_get_contents(__DIR__.'/cache.json'), true)['files'];

$fileVersions = [];
foreach ($cacheFiles as $file) {
  $fileVersions[$file] = version([$file]);
}

$maxVersion = max($fileVersions);
?> */

importScripts('./ext/localforage.min.js');

const dataStorage = localforage.createInstance({
  name: 'solaire',
  storeName: 'data',
  driver: localforage.INDEXEDDB
});

const cachePrefix = 'solaire-sw';
const currentCacheName = `${cachePrefix}-<?=$maxVersion?>`;
const liveFileVersions = JSON.parse(`<?=json_encode($fileVersions, JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES)?>`);



///// EVENTS


// INSTALL
self.addEventListener('install', function(event) {
  console.log('[install] Installing service worker...');
  event.waitUntil(
    installFiles(event)
    .catch(raison => console.log('[install] ' + raison))
    .then(() => {
      console.log('[install] Service worker installed!');
      return true;
    })
    .catch(error => console.error(error))
  )
});


// ACTIVATE
self.addEventListener('activate', function(event) {
  console.log('[activate] Activating service worker...');
  event.waitUntil(self.clients.claim()); // makes the service worker take control of all clients
  console.log('[activate] Service worker active!');
});


// FETCH
self.addEventListener('fetch', function(event) {
  const ignore = ['find.php', 'service-worker.js.php'];
  if (event.request.url.match(ignore.join('|'))) return;

  const fetchIndex = (event.request.mode === 'navigate' || (event.request.method === 'GET' && event.request.headers.get('accept').includes('text/html')));

  event.respondWith(
    caches.open(currentCacheName)
    .then(cache => {
      const request = fetchIndex ? 'index.php' : event.request;
      return cache.match(request)
    })
    .then(matching => {
      return matching || fetch(event.request);
    })
    .catch(error => console.error(error))
  )
});


// MESSAGE
self.addEventListener('message', async function(event) {
  console.log('[sw] Message reçu :', event.data);
  const action = event.data?.action;

  switch (action) {
    case 'force-update': {
      const source = event.ports[0];

      try {
        await self.skipWaiting();
        source.postMessage({ ready: true });
      } catch (error) {
        source.postMessage({ ready: false, error });
      }
    }
  }
});



///// FUNCTIONS


/**
 * Installs all app files.
 * @param {Event|null} event - The event that caused the file installation.
 */
async function installFiles(event = null) {
  const localFileVersions = (await dataStorage.getItem('file-versions')) ?? {};
  const filesQuantity = Object.keys(liveFileVersions).length;

  const newCache = await caches.open(currentCacheName);

  const source = event?.source || null;
  const action = event?.data?.action || 'install';

  try {
    console.log(`[${action}] Installing files...`);

    await Promise.all(Object.keys(liveFileVersions).map(async file => {
      const oldVersion = localFileVersions[file] ?? 0;
      const newVersion = liveFileVersions[file];

      let response;
      const request = new Request(file, { cache: 'no-store' });

      // If the online file is more recent than the locally installed file
      if (newVersion > oldVersion || oldVersion === 0) {
        response = await fetch(request);
        console.log(`File ${file} updated (${oldVersion} => ${newVersion})`);
      }

      // If the locally installed file is already the most recent version
      else {
        response = (await caches.match(new Request(file))) ?? (await fetch(request));
      }

      if (!response.ok) throw Error(`[${action}] File download failed: (${request.url})`);
      await newCache.put(request, response);

      if (source) source.postMessage({ action: 'update-files', loaded: true, total: filesQuantity, url: file });
      return;
    }));

    console.log(`[${action}] File installation complete!`);
    deleteOldCaches(currentCacheName, action);
    dataStorage.setItem('file-versions', liveFileVersions);
  }

  // If there was an error while installing the new files, delete them
  // and keep the old cache.
  catch (error) {
    await caches.delete(newCache);
    console.log(`[${action}] File installation cancelled.`);
    throw error;
  }

  return;
}


/**
 * Deletes old caches.
 * @param {string} newCacheName - The new cache's name.
 * @param {'install'|'update'} action - The action during which the caches were removed.
 */
async function deleteOldCaches(newCacheName, action) {
  try {
    const allCaches = await caches.keys();
    if (allCaches.length <= 1) throw 'no-cache';

    console.log(`[${action}] Deleting old cached files`);
    await Promise.all(
      allCaches.map(cache => {
        if (cache.startsWith(cachePrefix) && newCacheName != cache) return caches.delete(cache);
        else return Promise.resolve();
      })
    );
    
    console.log(`[${action}] Cache cleanup complete!`);
  } catch (error) {
    if (error === 'no-cache') console.log('No old cache to delete');
    else                      console.error(error);
  }

  return;
}