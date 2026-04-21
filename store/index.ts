import { create } from 'zustand';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, User } from 'firebase/auth';
import { auth } from '../lib/firebase';

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
  setUser: (user: UserData | null) => void;
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

  login: async (email, password) => {
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
    try {
      await signOut(auth);
      set({ user: null, firebaseUser: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  recoverPassword: async (email: string) => {
    await sendPasswordResetEmail(auth, email);
    return true;
  },

  checkAuth: () => {
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