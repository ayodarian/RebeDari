import { create } from 'zustand';
import insforge, { getClient, setAccessToken, restoreSession } from '../lib/insforge';
import { tokenStorage, StoredUser } from '../lib/token-storage';

interface UserData {
  id: string;
  email: string;
  nombre: string;
}

interface AppState {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionId: string | null;
  partnerId: string | null;
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
  checkAuth: () => Promise<(() => void) | undefined>;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  sessionId: null,
  partnerId: null,
  inviteToken: null,

  joinSession: async () => {
    const user = get().user;
    if (!user) throw new Error('Usuario no autenticado');
    const uid = user.id;
    const client = getClient();

    try {
      const { data: userData, error: userError } = await client.database
        .from('users')
        .select('session_id, partner_id')
        .eq('id', uid)
        .single();

      if (!userError && userData?.session_id) {
        set({
          sessionId: userData.session_id,
          partnerId: userData.partner_id || null,
        });
        return;
      }

      const { data: pendingInvite, error: inviteError } = await client.database
        .from('invites')
        .select('*')
        .is('used_by', null)
        .order('created_at', { ascending: false })
        .limit(1);

      if (pendingInvite && pendingInvite.length > 0 && !inviteError) {
        const invite = pendingInvite[0];
        if (invite.created_by !== uid) {
          await get().acceptInvite(invite.token);
          return;
        }
      }

      const { data: newSession, error: cError } = await client.database
        .from('sessions')
        .insert({ members: [uid], is_open: true })
        .select()
        .single();

      if (cError) throw cError;
      const joinedSessionId = String(newSession.id);

      await client.database
        .from('users')
        .update({
          session_id: joinedSessionId,
          partner_id: null,
          joined_at: Date.now(),
        })
        .eq('id', uid);

      set({ sessionId: joinedSessionId, partnerId: null });
    } catch (e) {
      console.error('Error al unir sesion', e);
      throw e;
    }
  },

  leaveSession: async () => {
    const user = get().user;
    const sessionId = get().sessionId;
    if (!user || !sessionId) return;
    const client = getClient();

    try {
      const { data: session } = await client.database
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) return;

      const members = (session.members as string[]) || [];
      const remaining = members.filter((m: string) => m !== user.id);

      if (remaining.length === 0) {
        await client.database.from('sessions').delete().eq('id', sessionId);
      } else {
        const isOpen = remaining.length < 2;
        await client.database
          .from('sessions')
          .update({ members: remaining, is_open: isOpen })
          .eq('id', sessionId);
      }
    } catch (e) {
      console.error('Error leaving session', e);
    } finally {
      set({ sessionId: null, partnerId: null });
    }
  },

  createInvite: async () => {
    const user = get().user;
    if (!user) throw new Error('Usuario no autenticado');
    const client = getClient();

    const token = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      const { data, error } = await client.database
        .from('invites')
        .insert({
          token,
          created_by: user.id,
          created_at: Date.now(),
        })
        .select()
        .single();

      if (error) throw error;
      return token;
    } catch (e) {
      console.error('Error creating invite', e);
      throw e;
    }
  },

  acceptInvite: async (token: string) => {
    const user = get().user;
    if (!user) throw new Error('Usuario no autenticado');
    const client = getClient();

    try {
      const { data: invite, error: inviteError } = await client.database
        .from('invites')
        .select('*')
        .eq('token', token)
        .is('used_by', null)
        .single();

      if (inviteError || !invite) {
        throw new Error('Invitación no válida o ya utilizada');
      }

      if (invite.created_by === user.id) {
        throw new Error('No puedes aceptar tu propia invitación');
      }

      const creatorId = invite.created_by;
      const partnerId = creatorId;

      const { data: existingSession, error: sessionError } = await client.database
        .from('sessions')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1);

      let sessionId: string;

      if (existingSession && existingSession.length > 0) {
        const session = existingSession[0];
        const members = (session.members as string[]) || [];
        if (members.includes(creatorId)) {
          sessionId = String(session.id);
          const newMembers = [...members, user.id];
          await client.database
            .from('sessions')
            .update({ members: newMembers, is_open: false })
            .eq('id', sessionId);
        } else {
          throw new Error('La sesión del creador no existe');
        }
      } else {
        const { data: newSession, error: createError } = await client.database
          .from('sessions')
          .insert({ members: [creatorId, user.id], is_open: false })
          .select()
          .single();

        if (createError) throw createError;
        sessionId = String(newSession.id);
      }

      await client.database
        .from('users')
        .update({
          session_id: sessionId,
          partner_id: partnerId,
          joined_at: Date.now(),
        })
        .eq('id', user.id);

      await client.database
        .from('users')
        .update({
          partner_id: user.id,
        })
        .eq('id', creatorId);

      await client.database
        .from('invites')
        .update({
          used_by: user.id,
          used_at: Date.now(),
        })
        .eq('token', token);

      set({ sessionId, partnerId, inviteToken: null });
    } catch (e) {
      console.error('Error accepting invite', e);
      throw e;
    }
  },

  login: async (email, password) => {
    const client = getClient();
    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        const err = error as any;
        console.error('[Login] Error:', err.message, 'code:', err.error, 'status:', err.statusCode);
        throw error;
      }
      if (!data) throw new Error('No se pudo iniciar sesion');

      if (data.accessToken) {
        await tokenStorage.setTokens(data.accessToken, data.refreshToken || '');
        setAccessToken(data.accessToken);
      }

      const userData: UserData = {
        id: data.user.id,
        email: data.user.email || email,
        nombre: data.user.profile?.name || email.split('@')[0],
      };

      await tokenStorage.setUserData(userData);

      await client.database
        .from('users')
        .upsert({
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre,
          last_login: Date.now(),
        }, { onConflict: 'id' });

      set({ user: userData, isAuthenticated: true });
      await get().joinSession();
      return true;
    } catch (error: any) {
      const err = error as any;
      const statusCode = err?.statusCode || err?.status;
      const errCode = err?.error || err?.code || '';
      const msg = err?.message || '';

      console.error('[Login] Full error:', { statusCode, errCode, msg });

      if (statusCode === 401 || errCode.includes('INVALID') || msg.includes('invalid') || msg.includes('Invalid')) {
        throw new Error('Credenciales inválidas');
      }
      if (statusCode === 404 || errCode.includes('NOT_FOUND') || msg.includes('not found')) {
        throw new Error('Usuario no encontrado');
      }
      throw new Error(msg || 'Error al iniciar sesión');
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
        const err = error as any;
        console.error('[Register] Error:', err.message, 'code:', err.error, 'status:', err.statusCode);
        throw error;
      }
      if (!data) throw new Error('No se pudo registrar');

      console.log('[Register] Response data:', JSON.stringify(data, null, 2));
      console.log('[Register] requireEmailVerification:', data.requireEmailVerification);

      if (data.requireEmailVerification) {
        console.log('[Register] Requires verification, returning true');
        return { requiresVerification: true };
      }

      if (data.accessToken) {
        await tokenStorage.setTokens(data.accessToken, data.refreshToken || '');
        setAccessToken(data.accessToken);
      }

      const userData: UserData = {
        id: data.user?.id || '',
        email: data.user?.email || email,
        nombre: nombre || email.split('@')[0],
      };

      await tokenStorage.setUserData(userData);

      if (userData.id) {
        await client.database
          .from('users')
          .upsert({
            id: userData.id,
            email: userData.email,
            nombre: userData.nombre,
            created_at: Date.now(),
          }, { onConflict: 'id' });
      }

      set({ user: userData, isAuthenticated: true });
      await get().joinSession();
      console.log('[Register] No verification required, returning false');
      return { requiresVerification: false };
    } catch (error: any) {
      const err = error as any;
      const statusCode = err?.statusCode || err?.status;
      const errCode = err?.error || err?.code || '';
      const msg = err?.message || '';

      console.error('[Register] Full error:', { statusCode, errCode, msg });

      if (statusCode === 409 || errCode.includes('ALREADY') || msg.includes('already') || msg.includes('Already')) {
        throw new Error('YaExiste');
      }
      throw new Error(msg || 'Error al registrar');
    }
  },

  logout: async () => {
    try {
      await getClient().auth.signOut();
    } catch (e) {
      console.warn('Logout error (ignoring):', e);
    }
    await tokenStorage.clearAll();
    setAccessToken(null);
    set({ user: null, isAuthenticated: false });
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
    }

    const userData: UserData = {
      id: data.user.id,
      email: data.user.email || email,
      nombre: data.user.profile?.name || email.split('@')[0],
    };

    await tokenStorage.setUserData(userData);

    await getClient().database
      .from('users')
      .upsert({
        id: userData.id,
        email: userData.email,
        nombre: userData.nombre,
        created_at: Date.now(),
      }, { onConflict: 'id' });

    set({ user: userData, isAuthenticated: true });
    await get().joinSession();
    return true;
  },

  signInWithIdToken: async (idToken: string) => {
    const client = getClient();
    try {
      console.log('[Auth] Intentando login con ID token de Google...');
      const { data, error } = await client.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        console.error('[Auth] Error con ID token:', error.message);
        throw error;
      }
      if (!data) throw new Error('No se pudo autenticar');

      if (data.accessToken) {
        await tokenStorage.setTokens(data.accessToken, data.refreshToken || '');
        setAccessToken(data.accessToken);
      }

      const userData: UserData = {
        id: data.user?.id || '',
        email: data.user?.email || '',
        nombre: data.user?.profile?.name || data.user?.email?.split('@')[0] || 'Usuario',
      };
      await tokenStorage.setUserData(userData);

      await client.database
        .from('users')
        .upsert({
          id: userData.id,
          email: userData.email,
          nombre: userData.nombre,
          last_login: Date.now(),
        }, { onConflict: 'id' });

      set({ user: userData, isAuthenticated: true });
      await get().joinSession();
      console.log('[Auth] Login con Google exitoso:', userData.email);
      return true;
    } catch (error: any) {
      console.error('[Auth] Error:', error.message);
      throw new Error(error.message || 'Error al autenticar con Google');
    }
  },

  checkAuth: async () => {
    try {
      const userData = await restoreSession();
      if (userData) {
        set({ user: userData, isAuthenticated: true, isLoading: false });
        await get().joinSession();
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      console.warn('[store] checkAuth error:', e);
      set({ isLoading: false });
    }
    return undefined;
  },
}));
