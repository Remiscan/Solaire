const dataStorage = localforage.createInstance({
  name: 'solaire',
  storeName: 'data',
  driver: localforage.INDEXEDDB
});

export default dataStorage;