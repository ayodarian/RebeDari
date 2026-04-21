import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, inMemoryPersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAc2KbGat-UmdAMKbuspFMWGeTdoC7Udl4",
  authDomain: "rebedari-a80a7.firebaseapp.com",
  projectId: "rebedari-a80a7",
  storageBucket: "rebedari-a80a7.firebasestorage.app",
  messagingSenderId: "633589150602",
  appId: "1:633589150602:web:0082e96e092945d278ce73",
  measurementId: "G-RWN5C7P0PF"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: inMemoryPersistence
});

export const uploadFile = async (uri: string, path: string): Promise<string> => {
  const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
};

export const deleteFile = async (path: string): Promise<void> => {
  const { ref, deleteObject } = await import('firebase/storage');
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
};