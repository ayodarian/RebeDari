import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, inMemoryPersistence } from 'firebase/auth';

// Intentamos usar persistencia nativa de React Native (AsyncStorage).
// Si por alguna razón no está disponible, caeremos a inMemoryPersistence.
let nativePersistence: any = null;
try {
  // import dinámico para evitar romper builds web donde el adaptador no exista
  // @ts-ignore
  const { getReactNativePersistence } = require('firebase/auth/react-native');
  // @ts-ignore
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  if (getReactNativePersistence && AsyncStorage) {
    nativePersistence = getReactNativePersistence(AsyncStorage);
  }
} catch (e) {
  // No hacemos nada; usaremos inMemoryPersistence como respaldo
}

// Leer configuración desde variables de entorno. Mantén .env con estas claves.
const firebaseConfig = {
  apiKey: process.env.EXPO_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || '',
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);

export const auth = initializeAuth(app, {
  persistence: nativePersistence || inMemoryPersistence,
});

export const uploadFile = async (uri: string, path: string): Promise<string> => {
  const { ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
  
  const storageRef = ref(storage, path);
  
  const blob = await new Promise<Blob>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.onload = () => {
      if (xhr.status === 200) {
        resolve(xhr.response as Blob);
      } else {
        reject(new Error(`Network request failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => {
      reject(new Error('Network request failed'));
    };
    xhr.send();
  });
  
  // Determinar contentType basado en la extensión del path
  const ext = path.split('.').pop()?.toLowerCase() || '';
  let contentType = 'application/octet-stream';
  if (ext === 'mp4' || ext === 'mov') contentType = 'video/mp4';
  else if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
  else if (ext === 'png') contentType = 'image/png';
  else if (ext === 'pdf') contentType = 'application/pdf';
  else if (ext === 'webm') contentType = 'video/webm';

  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType,
    cacheControl: 'public, max-age=31536000',
  });
  
  await new Promise((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {},
      (error) => reject(error),
      () => resolve(null)
    );
  });
  
  return await getDownloadURL(storageRef);
};

export const deleteFile = async (path: string): Promise<void> => {
  const { ref, deleteObject } = await import('firebase/storage');
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};
