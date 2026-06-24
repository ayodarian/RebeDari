import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'insforge_access_token',
  REFRESH_TOKEN: 'insforge_refresh_token',
  USER_DATA: 'insforge_user_data',
};

export interface StoredUser {
  id: string;
  email: string;
  nombre: string;
  avatarUrl?: string | null;
}

const isWeb = Platform.OS === 'web';

const webStore = {
  async getItem(key: string): Promise<string | null> {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // ignore
    }
  },
  async removeItem(key: string): Promise<void> {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    if (isWeb) return webStore.getItem(KEYS.ACCESS_TOKEN);
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    if (isWeb) return webStore.getItem(KEYS.REFRESH_TOKEN);
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  async getUserData(): Promise<StoredUser | null> {
    const raw = isWeb
      ? await webStore.getItem(KEYS.USER_DATA)
      : await SecureStore.getItemAsync(KEYS.USER_DATA);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (isWeb) {
      await webStore.setItem(KEYS.ACCESS_TOKEN, accessToken);
      await webStore.setItem(KEYS.REFRESH_TOKEN, refreshToken);
      return;
    }
    await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken);
  },

  async setUserData(user: StoredUser): Promise<void> {
    if (isWeb) {
      await webStore.setItem(KEYS.USER_DATA, JSON.stringify(user));
      return;
    }
    await SecureStore.setItemAsync(KEYS.USER_DATA, JSON.stringify(user));
  },

  async clearAll(): Promise<void> {
    if (isWeb) {
      await webStore.removeItem(KEYS.ACCESS_TOKEN);
      await webStore.removeItem(KEYS.REFRESH_TOKEN);
      await webStore.removeItem(KEYS.USER_DATA);
      return;
    }
    await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(KEYS.USER_DATA);
  },
};
