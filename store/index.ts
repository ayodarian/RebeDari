import { create } from 'zustand';
import {
  getClient,
  setAccessToken,
  setRefreshToken,
  clearSessionState,
  restoreSession,
  isUnauthorizedError,
  withAuthRetry,
} from '../lib/insforge';
import { tokenStorage } from '../lib/token-storage';

interface UserData {
  id: string;
  email: string;
  nombre: string;
  avatarUrl?: string | null;
}

interface AppState {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initError: string | null;
  sessionId: string | null;
  partnerId: string | null;
  partner: UserData | null;
  inviteToken: string | null;
  setUser: (user: UserData | null) => void;
  joinSession: () => Promise<void>;
  leaveSession: () => Promise<void>;
  createInvite: () => Promise<string>;
  acceptInvite: (token: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, nombre?: string) => Promise<{ requiresVerification: boolean }>;
  logout: () => Promise<void>;
  recoverPassword: (email: string) => Promise<boolean>;
  exchangeResetPasswordToken: (email: string, code: string) => Promise<any>;
  resetPassword: (otp: string, newPassword: string) => Promise<any>;
  verifyEmail: (email: string, otp: string) => Promise<boolean>;
  signInWithIdToken: (idToken: string) => Promise<boolean>;
  checkAuth: () => Promise<void>;
  updateProfile: (updates: { nombre?: string; email?: string; avatarUrl?: string }) => Promise<void>;
  clearInitError: () => void;
}

function generateInviteToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

async function fetchPartner(pid: string | null): Promise<UserData | null> {
  if (!pid) return null;
  try {
    const { data, error } = await withAuthRetry(() =>
      getClient()
        .database
        .from('users')
        .select('id, email, nombre, avatar_url')
        .eq('id', pid)
        .single()
    );
    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email || '',
      nombre: data.nombre || '',
      avatarUrl: data.avatar_url || null,
    };
  } catch {
    return null;
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  initError: null,
  sessionId: null,
  partnerId: null,
  partner: null,
  inviteToken: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  clearInitError: () => set({ initError: null }),

  joinSession: async () => {
    const user = get().user;
    if (!user) throw new Error('Usuario no autenticado');
    const client = getClient();
    const uid = user.id;

    try {
      const { data: userData, error: userError } = await withAuthRetry(() =>
        client
          .database
          .from('users')
          .select('session_id, partner_id')
          .eq('id', uid)
          .single()
      );

      if (!userError && userData?.session_id) {
        const pid = userData.partner_id || null;
        const partnerData = await fetchPartner(pid);
        set({ sessionId: userData.session_id, partnerId: pid, partner: partnerData });
        return;
      }

      const { data: invites, error: inviteError } = await withAuthRetry(() =>
        client
          .database
          .from('invites')
          .select('*')
          .is('used_by', null)
          .neq('created_by', uid)
          .order('created_at', { ascending: false })
          .limit(1)
      );

      if (!inviteError && invites && invites.length > 0) {
        await get().acceptInvite(invites[0].token);
        return;
      }

      const { data: newSession, error: cError } = await withAuthRetry(() =>
        client
          .database
          .from('sessions')
          .insert({ members: [uid], is_open: true })
          .select()
          .single()
      );
      if (cError) throw cError;
      const joinedSessionId = String(newSession.id);

      await withAuthRetry(() =>
        client
          .database
          .from('users')
          .update({
            session_id: joinedSessionId,
            partner_id: null,
            joined_at: Date.now(),
          })
          .eq('id', uid)
      );

      set({ sessionId: joinedSessionId, partnerId: null, partner: null });
    } catch (e) {
      console.error('[store] joinSession error:', e);
      throw e;
    }
  },

  leaveSession: async () => {
    const user = get().user;
    const sessionId = get().sessionId;
    if (!user || !sessionId) return;
    const client = getClient();

    try {
      const { data: session, error: fetchErr } = await withAuthRetry(() =>
        client.database.from('sessions').select('*').eq('id', sessionId).single()
      );
      if (fetchErr || !session) {
        set({ sessionId: null, partnerId: null, partner: null });
        return;
      }

      const members = (session.members as string[]) || [];
      const remaining = members.filter((m) => m !== user.id);

      if (remaining.length === 0) {
        await withAuthRetry(() => client.database.from('sessions').delete().eq('id', sessionId));
      } else {
        const isOpen = remaining.length < 2;
        await withAuthRetry(() =>
          client
            .database
            .from('sessions')
            .update({ members: remaining, is_open: isOpen })
            .eq('id', sessionId)
        );
      }

      await withAuthRetry(() =>
        client
          .database
          .from('users')
          .update({ session_id: null, partner_id: null })
          .eq('id', user.id)
      );
    } catch (e) {
      console.error('[store] leaveSession error:', e);
    } finally {
      set({ sessionId: null, partnerId: null, partner: null });
    }
  },

  createInvite: async () => {
    const user = get().user;
    if (!user) throw new Error('Usuario no autenticado');
    const client = getClient();

    const token = generateInviteToken();

    try {
      const { error } = await withAuthRetry(() =>
        client
          .database
          .from('invites')
          .insert({
            token,
            created_by: user.id,
            created_at: Date.now(),
          })
      );
      if (error) throw error;
      return token;
    } catch (e) {
      console.error('[store] createInvite error:', e);
      throw e;
    }
  },

  acceptInvite: async (token: string) => {
    const user = get().user;
    if (!user) throw new Error('Usuario no autenticado');
    const client = getClient();

    let createdSessionId: string | null = null;
    let createdNewSession = false;

    try {
      const { data: invite, error: inviteError } = await withAuthRetry(() =>
        client
          .database
          .from('invites')
          .select('*')
          .eq('token', token)
          .is('used_by', null)
          .single()
      );

      if (inviteError || !invite) {
        throw new Error('Invitación no válida o ya utilizada');
      }
      if (invite.created_by === user.id) {
        throw new Error('No puedes aceptar tu propia invitación');
      }

      const creatorId = invite.created_by as string;

      const { data: creatorSession } = await withAuthRetry(() =>
        client
          .database
          .from('sessions')
          .select('*')
          .contains('members', [creatorId])
          .order('created_at', { ascending: true })
          .limit(1)
      );

      let sessionId: string;
      if (creatorSession && creatorSession.length > 0) {
        const session = creatorSession[0];
        const members = (session.members as string[]) || [];
        if (!members.includes(creatorId)) {
          throw new Error('La sesión del creador no existe');
        }
        sessionId = String(session.id);
        const newMembers = [...members, user.id];
        await withAuthRetry(() =>
          client
            .database
            .from('sessions')
            .update({ members: newMembers, is_open: false })
            .eq('id', sessionId)
        );
      } else {
        const { data: newSession, error: createError } = await withAuthRetry(() =>
          client
            .database
            .from('sessions')
            .insert({ members: [creatorId, user.id], is_open: false })
            .select()
            .single()
        );
        if (createError || !newSession) throw createError || new Error('No se pudo crear la sesión');
        sessionId = String(newSession.id);
        createdSessionId = sessionId;
        createdNewSession = true;
      }

      try {
        await withAuthRetry(() =>
          client
            .database
            .from('users')
            .update({ session_id: sessionId, partner_id: creatorId, joined_at: Date.now() })
            .eq('id', user.id)
        );

        await withAuthRetry(() =>
          client
            .database
            .from('users')
            .update({ partner_id: user.id })
            .eq('id', creatorId)
        );

        await withAuthRetry(() =>
          client
            .database
            .from('invites')
            .update({ used_by: user.id, used_at: Date.now() })
            .eq('token', token)
        );
      } catch (linkError) {
        if (createdNewSession && createdSessionId) {
          await withAuthRetry(() =>
            client.database.from('sessions').delete().eq('id', createdSessionId)
          ).catch((cleanupErr) =>
            console.error('[store] rollback delete session failed:', cleanupErr)
          );
        }
        throw linkError;
      }

      const partnerUser = await fetchPartner(creatorId);
      set({ sessionId, partnerId: creatorId, partner: partnerUser, inviteToken: null });
    } catch (e) {
      console.error('[store] acceptInvite error:', e);
      throw e;
    }
  },

  login: async (email, password) => {
    const client = getClient();
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        const err = error as { statusCode?: number; status?: number; error?: string; code?: string; message?: string };
        const statusCode = err.statusCode ?? err.status;
        const errCode = err.error || err.code || '';
        const msg = err.message || '';
        if (statusCode === 401 || errCode.includes('INVALID') || msg.toLowerCase().includes('invalid')) {
          throw new Error('Credenciales inválidas');
        }
        if (statusCode === 404 || errCode.includes('NOT_FOUND') || msg.toLowerCase().includes('not found')) {
          throw new Error('Usuario no encontrado');
        }
        throw new Error(msg || 'Error al iniciar sesión');
      }
      if (!data) throw new Error('No se pudo iniciar sesion');

      if (data.accessToken) {
        await tokenStorage.setTokens(data.accessToken, data.refreshToken || '');
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken || null);
      }

      const userData: UserData = {
        id: data.user.id,
        email: data.user.email || email,
        nombre: data.user.profile?.name || email.split('@')[0],
        avatarUrl: null,
      };
      await tokenStorage.setUserData(userData);

      await withAuthRetry(() =>
        client
          .database
          .from('users')
          .upsert(
            {
              id: userData.id,
              email: userData.email,
              nombre: userData.nombre,
              last_login: Date.now(),
            },
            { onConflict: 'id' }
          )
      );

      set({ user: userData, isAuthenticated: true });
      try {
        await get().joinSession();
      } catch (joinErr) {
        console.warn('[store] login: joinSession failed, continuing:', joinErr);
      }
      return true;
    } catch (error) {
      throw error;
    }
  },

  register: async (email, password, nombre) => {
    const client = getClient();
    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        name: nombre || email.split('@')[0],
      });
      if (error) {
        const err = error as { statusCode?: number; status?: number; error?: string; code?: string; message?: string };
        const statusCode = err.statusCode ?? err.status;
        const errCode = err.error || err.code || '';
        const msg = err.message || '';
        if (statusCode === 409 || errCode.includes('ALREADY') || msg.toLowerCase().includes('already')) {
          throw new Error('YaExiste');
        }
        throw new Error(msg || 'Error al registrar');
      }
      if (!data) throw new Error('No se pudo registrar');

      if (data.requireEmailVerification) {
        return { requiresVerification: true };
      }

      if (data.accessToken) {
        await tokenStorage.setTokens(data.accessToken, data.refreshToken || '');
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken || null);
      }

      const userData: UserData = {
        id: data.user?.id || '',
        email: data.user?.email || email,
        nombre: nombre || email.split('@')[0],
        avatarUrl: null,
      };
      await tokenStorage.setUserData(userData);

      if (userData.id) {
        await withAuthRetry(() =>
          client
            .database
            .from('users')
            .upsert(
              {
                id: userData.id,
                email: userData.email,
                nombre: userData.nombre,
                created_at: Date.now(),
              },
              { onConflict: 'id' }
            )
        );
      }

      set({ user: userData, isAuthenticated: true });
      try {
        await get().joinSession();
      } catch (joinErr) {
        console.warn('[store] register: joinSession failed, continuing:', joinErr);
      }
      return { requiresVerification: false };
    } catch (error) {
      throw error;
    }
  },

  logout: async () => {
    try {
      await getClient().auth.signOut();
    } catch (e) {
      console.warn('[store] logout signOut error (ignoring):', e);
    }
    try {
      const realtime = getClient().realtime;
      await realtime.unsubscribe('chat');
      await realtime.unsubscribe('typing');
      await realtime.unsubscribe('notifications');
    } catch {
      /* noop */
    }
    await tokenStorage.clearAll();
    clearSessionState();
    set({
      user: null,
      isAuthenticated: false,
      sessionId: null,
      partnerId: null,
      partner: null,
    });
  },

  recoverPassword: async (email: string) => {
    const { error } = await getClient().auth.sendResetPasswordEmail({ email });
    if (error) throw new Error(error.message || 'Error al enviar email de recuperacion');
    return true;
  },

  exchangeResetPasswordToken: async (email: string, code: string) => {
    const { data, error } = await getClient().auth.exchangeResetPasswordToken({ email, code });
    if (error) throw new Error(error.message || 'Código inválido o expirado');
    return data;
  },

  resetPassword: async (otp: string, newPassword: string) => {
    const { data, error } = await getClient().auth.resetPassword({ otp, newPassword });
    if (error) throw new Error(error.message || 'Error al restablecer contraseña');
    return data;
  },

  verifyEmail: async (email: string, otp: string) => {
    const { data, error } = await getClient().auth.verifyEmail({ email, otp });
    if (error) throw new Error(error.message || 'Código inválido o expirado');
    if (!data) throw new Error('No se pudo verificar el email');

    if (data.accessToken) {
      await tokenStorage.setTokens(data.accessToken, data.refreshToken || '');
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken || null);
    }

    const userData: UserData = {
      id: data.user.id,
      email: data.user.email || email,
      nombre: data.user.profile?.name || email.split('@')[0],
      avatarUrl: null,
    };
    await tokenStorage.setUserData(userData);

    await withAuthRetry(() =>
      getClient()
        .database
        .from('users')
        .upsert(
          {
            id: userData.id,
            email: userData.email,
            nombre: userData.nombre,
            created_at: Date.now(),
          },
          { onConflict: 'id' }
        )
    );

    set({ user: userData, isAuthenticated: true });
    try {
      await get().joinSession();
    } catch (joinErr) {
      console.warn('[store] verifyEmail: joinSession failed, continuing:', joinErr);
    }
    return true;
  },

  signInWithIdToken: async (idToken: string) => {
    const client = getClient();
    try {
      const { data, error } = await client.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });
      if (error) throw error;
      if (!data) throw new Error('No se pudo autenticar');

      if (data.accessToken) {
        await tokenStorage.setTokens(data.accessToken, data.refreshToken || '');
        setAccessToken(data.accessToken);
        setRefreshToken(data.refreshToken || null);
      }

      const userData: UserData = {
        id: data.user?.id || '',
        email: data.user?.email || '',
        nombre: data.user?.profile?.name || data.user?.email?.split('@')[0] || 'Usuario',
        avatarUrl: null,
      };
      await tokenStorage.setUserData(userData);

      await withAuthRetry(() =>
        client
          .database
          .from('users')
          .upsert(
            {
              id: userData.id,
              email: userData.email,
              nombre: userData.nombre,
              last_login: Date.now(),
            },
            { onConflict: 'id' }
          )
      );

      set({ user: userData, isAuthenticated: true });
      try {
        await get().joinSession();
      } catch (joinErr) {
        console.warn('[store] google: joinSession failed, continuing:', joinErr);
      }
      return true;
    } catch (error: any) {
      throw new Error(error?.message || 'Error al autenticar con Google');
    }
  },

  checkAuth: async () => {
    try {
      const userData = await restoreSession();
      if (userData) {
        set({ user: userData, isAuthenticated: true, isLoading: false, initError: null });
        try {
          await get().joinSession();
        } catch (joinErr) {
          console.warn('[store] checkAuth: joinSession failed, continuing:', joinErr);
        }
      } else {
        set({ isLoading: false, initError: null });
      }
    } catch (e: any) {
      console.warn('[store] checkAuth error:', e);
      if (isUnauthorizedError(e)) {
        await tokenStorage.clearAll();
        clearSessionState();
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionId: null,
          partnerId: null,
          partner: null,
        });
      } else {
        set({
          isLoading: false,
          initError: e?.message || 'No se pudo restaurar la sesión',
        });
      }
    }
  },

  updateProfile: async (updates) => {
    const user = get().user;
    if (!user) throw new Error('Usuario no autenticado');
    const client = getClient();

    const dbUpdates: Record<string, unknown> = {};
    if (updates.nombre !== undefined) dbUpdates.nombre = updates.nombre;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await withAuthRetry(() =>
        client.database.from('users').update(dbUpdates).eq('id', user.id)
      );
      if (error) throw error;
    }

    const updatedUser: UserData = {
      ...user,
      nombre: updates.nombre ?? user.nombre,
      email: updates.email ?? user.email,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : user.avatarUrl,
    };
    await tokenStorage.setUserData(updatedUser);
    set({ user: updatedUser });
  },
}));
