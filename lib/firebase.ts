import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, inMemoryPersistence } from 'firebase/auth';
import Constants from 'expo-constants';

const getEnvVar = (key: string): string => {
  return (Constants.expoConfig?.extra as any)?.[key] || (Constants.manifest?.extra as any)?.[key] || '';
};

const firebaseConfig = {
  apiKey: getEnvVar('EXPO_FIREBASE_API_KEY') || getEnvVar('FIREBASE_API_KEY'),
  authDomain: getEnvVar('EXPO_FIREBASE_AUTH_DOMAIN') || getEnvVar('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('EXPO_FIREBASE_PROJECT_ID') || getEnvVar('FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('EXPO_FIREBASE_STORAGE_BUCKET') || getEnvVar('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('EXPO_FIREBASE_MESSAGING_SENDER_ID') || getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('EXPO_FIREBASE_APP_ID') || getEnvVar('FIREBASE_APP_ID'),
  measurementId: getEnvVar('EXPO_FIREBASE_MEASUREMENT_ID') || getEnvVar('FIREBASE_MEASUREMENT_ID'),
};

export let app: any = null;
export let storage: any = null;
export let db: any = null;
export let auth: any = null;
export let firebaseReady = false;

function hasRequiredConfig(cfg: typeof firebaseConfig) {
  return !!(cfg.apiKey && cfg.projectId && cfg.appId);
}

if (!hasRequiredConfig(firebaseConfig)) {
  console.warn('[firebase] Firebase no inicializado: faltan variables de entorno. Define EXPO_FIREBASE_API_KEY, EXPO_FIREBASE_PROJECT_ID y EXPO_FIREBASE_APP_ID');
} else {
  try {
    app = initializeApp(firebaseConfig);
    storage = getStorage(app);
    db = getFirestore(app);

    try {
      auth = initializeAuth(app, {
        persistence: inMemoryPersistence,
      });
    } catch (authErr) {
      console.warn('[firebase] initializeAuth no disponible o falló:', authErr);
      auth = null;
    }

    firebaseReady = true;
  } catch (err) {
    console.error('[firebase] Error inicializando Firebase:', err);
  }
}

export const uploadFile = async (uri: string, path: string): Promise<string> => {
  if (!storage) throw new Error('Firebase Storage no inicializado. Revisa tus variables de entorno.');
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
  if (!storage) throw new Error('Firebase Storage no inicializado. Revisa tus variables de entorno.');
  const { ref, deleteObject } = await import('firebase/storage');
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};
