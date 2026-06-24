import { createClient, InsForgeClient } from '@insforge/sdk';
import { tokenStorage, StoredUser } from './token-storage';

const insforgeUrl = process.env.EXPO_PUBLIC_INSFORGE_URL || '';
const insforgeAnonKey = process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY || '';

if (!insforgeUrl || !insforgeAnonKey) {
  console.warn(
    '[insforge] Variables de entorno faltantes. Define EXPO_PUBLIC_INSFORGE_URL y EXPO_PUBLIC_INSFORGE_ANON_KEY'
  );
}

let _client: InsForgeClient = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey,
});

let _accessToken: string | null = null;
let _refreshToken: string | null = null;
let _refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

export function getClient(): InsForgeClient {
  return _client;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

export function setAccessToken(token: string | null): void {
  if (_client) {
    _client.setAccessToken(token || '');
  } else {
    _client = createClient({
      baseUrl: insforgeUrl,
      anonKey: insforgeAnonKey,
      accessToken: token || undefined,
    });
  }
}

export async function restoreSession(): Promise<StoredUser | null> {
  const accessToken = await tokenStorage.getAccessToken();
  const refreshToken = await tokenStorage.getRefreshToken();
  const userData = await tokenStorage.getUserData();

  if (!accessToken || !userData) {
    await tokenStorage.clearAll();
    setAccessToken(null);
    setRefreshToken(null);
    return null;
  }

  setAccessToken(accessToken);

  if (!refreshToken) {
    return userData;
  }

  try {
    const { data, error } = await _client.auth.refreshSession({ refreshToken });
    if (!error && data?.accessToken) {
      await tokenStorage.setTokens(data.accessToken, data.refreshToken || refreshToken);
      setAccessToken(data.accessToken);
    }
  } catch (e) {
    console.warn('[insforge] refresh failed, keeping existing access token:', e);
  }

  return userData;
}

export function clearSessionState(): void {
  setAccessToken(null);
  setRefreshToken(null);
}

const insforge = {
  get database() {
    return getClient().database;
  },
  get auth() {
    return getClient().auth;
  },
  get storage() {
    return getClient().storage;
  },
  get functions() {
    return getClient().functions;
  },
  get realtime() {
    return getClient().realtime;
  },
};

export default insforge;
