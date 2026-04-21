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
  
  const uploadTask = uploadBytesResumable(storageRef, blob, {
    contentType: 'video/mp4',
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