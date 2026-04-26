import { create } from 'zustand';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, User } from 'firebase/auth';
import { auth, db, firebaseReady } from '../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, setDoc, runTransaction, updateDoc, deleteDoc } from 'firebase/firestore';

interface UserData {
  id: string;
  email: string;
  nombre: string;
}

interface AppState {
  user: UserData | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  partnerId: string | null;
  setUser: (user: UserData | null) => void;
  joinSession: () => Promise<void>;
  leaveSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  recoverPassword: (email: string) => Promise<boolean>;
  checkAuth: () => (() => void) | undefined;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  firebaseUser: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  sessionId: null,
  partnerId: null,

  joinSession: async () => {
    const firebaseUser = get().firebaseUser;
    if (!firebaseUser) throw new Error('Usuario no autenticado');
    const uid = firebaseUser.uid;

    if (!db) throw new Error('Firebase Firestore no inicializado');
    const sessionsRef = collection(db, 'sessions');
    // buscar sesión abierta con espacio (isOpen === true)
    const q = query(sessionsRef, where('isOpen', '==', true), orderBy('created_at'), limit(1));
    try {
      // intentamos buscar una sesión abierta (membersCount < 2)
      const docs = await getDocs(q);
      let joinedSessionId: string | null = null;

      for (const d of docs.docs) {
        // intentar unirse usando transacción
        await runTransaction(db, async (tx) => {
          const docRef = doc(db, 'sessions', d.id);
          const snap = await tx.get(docRef);
          const sdata = snap.data() as any;
          if (!sdata) return;
          if (!sdata.members) sdata.members = [];
          // si ya estoy en la sesión, simplemente retornamos
          if (sdata.members.includes(uid)) {
            joinedSessionId = d.id;
            return;
          }
          // si la sesión ya está completa, abortar
          if (sdata.members.length >= 2) return;
          const newMembers = [...sdata.members, uid];
          const isOpen = newMembers.length < 2;
          tx.update(docRef, { members: newMembers, isOpen });
          joinedSessionId = d.id;
        });
        if (joinedSessionId) break;
      }

      if (!joinedSessionId) {
        // crear nueva sesión abierta (isOpen true porque tiene 1 miembro)
        const newDoc = doc(sessionsRef);
        await setDoc(newDoc, { members: [uid], created_at: new Date().toISOString(), isOpen: true });
        joinedSessionId = newDoc.id;
      }

      // leer la sesión final para obtener partnerId si existe
      const sessionRef = doc(db, 'sessions', joinedSessionId);
      const sessionSnapFinal = await getDocs(query(collection(db, 'sessions')));
      // mejor leer el documento directamente
      const finalSnap = await (await import('firebase/firestore')).getDoc(sessionRef).catch(() => null);
      let partnerId: string | null = null;
      if (finalSnap && finalSnap.exists()) {
        const sdata: any = finalSnap.data();
        const members: string[] = sdata.members || [];
        partnerId = members.find(m => m !== uid) || null;
      }

      set({ sessionId: joinedSessionId, partnerId });
    } catch (e) {
      console.error('Error al unir sesión', e);
      throw e;
    }
  },

  leaveSession: async () => {
    const firebaseUser = get().firebaseUser;
    const sessionId = get().sessionId;
    if (!firebaseUser || !sessionId) return;
    const uid = firebaseUser.uid;
    if (!db) {
      console.warn('leaveSession: Firestore no inicializado, limpiando estado local');
      set({ sessionId: null, partnerId: null });
      return;
    }
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(sessionRef);
        if (!snap.exists()) return;
        const data: any = snap.data();
        const members: string[] = data.members || [];
        const remaining = members.filter(m => m !== uid);
        if (remaining.length === 0) {
          tx.delete(sessionRef);
        } else {
          // si queda 1 miembro, marcamos la sesión como abierta para que otro usuario pueda unirse
          const isOpen = remaining.length < 2;
          tx.update(sessionRef, { members: remaining, isOpen });
        }
      });
    } catch (e) {
      console.error('Error leaving session', e);
    } finally {
      set({ sessionId: null, partnerId: null });
    }
  },

  login: async (email, password) => {
    if (!auth) throw new Error('Firebase Auth no disponible');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      const userData: UserData = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        nombre: firebaseUser.displayName || email.split('@')[0],
      };
      
      set({ user: userData, firebaseUser: firebaseUser, isAuthenticated: true });
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      const errorMessage = error.message || 'Error al iniciar sesión';
      throw new Error(errorMessage);
    }
  },

  register: async (email, password) => {
    if (!auth) throw new Error('Firebase Auth no disponible');
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = result.user;
      
      const userData: UserData = {
        id: firebaseUser.uid,
        email: firebaseUser.email || email,
        nombre: email.split('@')[0],
      };
      
      set({ user: userData, firebaseUser: firebaseUser, isAuthenticated: true });
      return true;
    } catch (error: any) {
      console.error('Register error:', error);
      const errorMessage = error.message || 'Error al registrar';
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      set({ user: null, firebaseUser: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  recoverPassword: async (email: string) => {
    if (!auth) throw new Error('Firebase Auth no disponible');
    await sendPasswordResetEmail(auth, email);
    return true;
  },

  checkAuth: () => {
    if (!auth) {
      set({ isLoading: false });
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userData: UserData = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          nombre: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuario',
        };
        set({ user: userData, firebaseUser, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, firebaseUser: null, isAuthenticated: false, isLoading: false });
      }
    });
    return unsubscribe;
  },
}));
