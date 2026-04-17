import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  username: string;
  nombre: string;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  login: async (username, password) => {
    try {
      const users = await AsyncStorage.getItem('users');
      const storedUsers = users ? JSON.parse(users) : {};
      
      const user = storedUsers[username];
      if (user && user.password === password) {
        await AsyncStorage.setItem('currentUser', JSON.stringify(user));
        set({ user, isAuthenticated: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  logout: async () => {
    await AsyncStorage.removeItem('currentUser');
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    try {
      const currentUser = await AsyncStorage.getItem('currentUser');
      if (currentUser) {
        const user = JSON.parse(currentUser);
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },
}));