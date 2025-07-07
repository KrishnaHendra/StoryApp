const DATABASE_NAME = 'dicoding-story-app-db';
const DATABASE_VERSION = 1;
const OBJECT_STORE_NAME = 'bookmarks';

const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      db.createObjectStore(OBJECT_STORE_NAME, { keyPath: 'id' });
    };

    request.onsuccess = event => {
      resolve(event.target.result);
    };

    request.onerror = event => {
      reject(event.target.error);
    };
  });
};

const addBookmark = async story => {
  if (story.photoUrl) {
    const base64 = await toBase64(story.photoUrl);
    if (base64) {
      story.photoBase64 = base64;
    }
  }

  const db = await openDatabase();
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  const store = tx.objectStore(OBJECT_STORE_NAME);

  store.add(story);
  return tx.complete;
};

const getBookmark = async id => {
  const db = await openDatabase();
  const tx = db.transaction(OBJECT_STORE_NAME, 'readonly');
  const store = tx.objectStore(OBJECT_STORE_NAME);
  const request = store.get(id);

  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

const getAllBookmarks = async () => {
  const db = await openDatabase();
  const tx = db.transaction(OBJECT_STORE_NAME, 'readonly');
  const store = tx.objectStore(OBJECT_STORE_NAME);
  const request = store.getAll();

  return new Promise((resolve, reject) => {
    request.onsuccess = event => {
      resolve(event.target.result);
    };
    request.onerror = event => {
      reject(event.target.error);
    };
  });
};

const deleteBookmark = async id => {
  const db = await openDatabase();
  const tx = db.transaction(OBJECT_STORE_NAME, 'readwrite');
  const store = tx.objectStore(OBJECT_STORE_NAME);
  store.delete(id);
  return tx.complete;
};

const toBase64 = async url => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('toBase64 failed for url:', url, error);
    return null;
  }
};

export { addBookmark, getBookmark, getAllBookmarks, deleteBookmark };
