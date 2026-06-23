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
  _accessToken = token;
  if (token) {
    _client = createClient({
      baseUrl: insforgeUrl,
      anonKey: insforgeAnonKey,
      accessToken: token,
    });
  } else {
    _client = createClient({
      baseUrl: insforgeUrl,
      anonKey: insforgeAnonKey,
    });
  }
}

export function setRefreshToken(token: string | null): void {
  _refreshToken = token;
}

function extractErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as { statusCode?: unknown; status?: unknown };
  const v = e.statusCode ?? e.status;
  return typeof v === 'number' ? v : null;
}

export function isUnauthorizedError(error: unknown): boolean {
  return extractErrorStatus(error) === 401;
}

export async function refreshAccessToken(): Promise<{ accessToken: string; refreshToken: string } | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      if (!_refreshToken) return null;
      const { data, error } = await _client.auth.refreshSession({ refreshToken: _refreshToken });
      if (error || !data?.accessToken) {
        _refreshToken = null;
        return null;
      }
      const next = {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || _refreshToken,
      };
      _refreshToken = next.refreshToken;
      setAccessToken(next.accessToken);
      await tokenStorage.setTokens(next.accessToken, next.refreshToken);
      return next;
    } finally {
      _refreshPromise = null;
    }
  })();

  return _refreshPromise;
}

type Awaitable<T> = T | PromiseLike<T>;

export async function withAuthRetry<T>(fn: () => Awaitable<T>): Promise<T> {
  try {
    return (await fn()) as T;
  } catch (error) {
    if (!isUnauthorizedError(error)) throw error;
    const refreshed = await refreshAccessToken();
    if (!refreshed) throw error;
    return (await fn()) as T;
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
  setRefreshToken(refreshToken);

  if (refreshToken) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return userData;
    }
  }

  try {
    const { data: profileData, error } = await _client.database
      .from('users')
      .select('nombre, email, avatar_url')
      .eq('id', userData.id)
      .single();

    if (error) {
      if (isUnauthorizedError(error)) {
        await tokenStorage.clearAll();
        setAccessToken(null);
        setRefreshToken(null);
        return null;
      }
    }

    if (profileData) {
      const freshUserData: StoredUser = {
        id: userData.id,
        email: profileData.email || userData.email,
        nombre: profileData.nombre || userData.nombre,
        avatarUrl: profileData.avatar_url || null,
      };
      await tokenStorage.setUserData(freshUserData);
      return freshUserData;
    }
  } catch {
    await tokenStorage.clearAll();
    setAccessToken(null);
    setRefreshToken(null);
    return null;
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
