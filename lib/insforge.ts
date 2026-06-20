import { createClient, InsForgeClient } from '@insforge/sdk';
import { tokenStorage, StoredUser } from './token-storage';

const insforgeUrl = process.env.EXPO_PUBLIC_INSFORGE_URL || '';
const insforgeAnonKey = process.env.EXPO_PUBLIC_INSFORGE_ANON_KEY || '';

if (!insforgeUrl || !insforgeAnonKey) {
  console.warn('[insforge] Variables de entorno faltantes. Define EXPO_PUBLIC_INSFORGE_URL y EXPO_PUBLIC_INSFORGE_ANON_KEY');
}

let _client: InsForgeClient = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey,
});

export function getClient(): InsForgeClient {
  return _client;
}

export function setAccessToken(token: string | null): void {
  _client = createClient({
    baseUrl: insforgeUrl,
    anonKey: insforgeAnonKey,
    accessToken: token || undefined,
  });
}

export async function restoreSession(): Promise<StoredUser | null> {
  const accessToken = await tokenStorage.getAccessToken();
  const refreshToken = await tokenStorage.getRefreshToken();
  const userData = await tokenStorage.getUserData();

  if (!accessToken || !userData) {
    return null;
  }

  // If no refresh token, we can still try using the access token
  if (!refreshToken) {
    setAccessToken(accessToken);
    return userData;
  }

  setAccessToken(accessToken);

  const { data, error } = await _client.auth.refreshSession({ refreshToken });
  if (error || !data) {
    // Refresh failed - clear tokens but keep user data for re-login
    await tokenStorage.clearAll();
    setAccessToken(null);
    return null;
  }

  if (data.accessToken) {
    await tokenStorage.setTokens(data.accessToken, data.refreshToken || refreshToken);
    setAccessToken(data.accessToken);
  }

  return userData;
}

export default _client;
