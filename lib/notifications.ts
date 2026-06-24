import { Platform } from 'react-native';
import { getClient, withAuthRetry } from './insforge';
import { useAppStore } from '../store/index';

let _notificationsModule: typeof import('expo-notifications') | null = null;
let _handlerRegistered = false;

async function getNotificationsModule() {
  if (_notificationsModule) return _notificationsModule;
  try {
    _notificationsModule = await import('expo-notifications');
    if (!_handlerRegistered && typeof _notificationsModule.setNotificationHandler === 'function') {
      _notificationsModule.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      _handlerRegistered = true;
    }
    return _notificationsModule;
  } catch {
    return null;
  }
}

void getNotificationsModule();

export interface Notification {
  id: number;
  session_id: string;
  sender_id: string;
  sender_name: string;
  type: 'foto' | 'video' | 'bitacora' | 'bingo' | 'carta' | 'chat';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const Notifications = await getNotificationsModule();
    if (!Notifications) return null;

    if (typeof Notifications.getPermissionsAsync !== 'function') return null;
    if (typeof Notifications.requestPermissionsAsync !== 'function') return null;
    if (typeof Notifications.getExpoPushTokenAsync !== 'function') return null;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('[notifications] permission not granted');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;

    if (Platform.OS === 'android' && typeof Notifications.setNotificationChannelAsync === 'function') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B9D',
      });
    }

    const user = useAppStore.getState().user;
    if (user && token) {
      await withAuthRetry(() =>
        getClient()
          .database
          .from('users')
          .update({ push_token: token })
          .eq('id', user.id)
      );
    }

    return token;
  } catch (error) {
    console.error('[notifications] registerForPush error:', error);
    return null;
  }
}

export async function createNotification(
  sessionId: string,
  senderId: string,
  senderName: string,
  type: Notification['type'],
  title: string,
  message: string
): Promise<void> {
  try {
    const client = getClient();

    await withAuthRetry(() =>
      client.database.from('notifications').insert({
        session_id: sessionId,
        sender_id: senderId,
        sender_name: senderName,
        type,
        title,
        message,
        created_at: new Date().toISOString(),
        read: false,
      })
    );

    try {
      await client.realtime.publish(`notifications:${sessionId}`, 'notification_created', {
        sender_id: senderId,
        type,
      });
    } catch {
      /* best-effort */
    }

    const { data: users } = await withAuthRetry(() =>
      client
        .database
        .from('users')
        .select('id, push_token')
        .eq('session_id', sessionId)
        .neq('id', senderId)
    );

    if (users && users.length > 0) {
      const tokens = users.map((u) => u.push_token).filter(Boolean) as string[];
      if (tokens.length > 0) {
        await sendPushNotifications(tokens, title, message, { type, sessionId });
      }
    }
  } catch (error) {
    console.error('[notifications] createNotification error:', error);
  }
}

async function sendPushNotifications(
  tokens: string[],
  title: string,
  message: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body: message,
      data,
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (error) {
    console.error('[notifications] sendPush error:', error);
  }
}

export async function getNotifications(sessionId: string): Promise<Notification[]> {
  try {
    const { data, error } = await withAuthRetry(() =>
      getClient()
        .database
        .from('notifications')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false })
        .limit(50)
    );
    if (error) throw error;
    return (data as Notification[]) || [];
  } catch (error) {
    console.error('[notifications] getNotifications error:', error);
    return [];
  }
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  try {
    await withAuthRetry(() =>
      getClient()
        .database
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
    );
  } catch (error) {
    console.error('[notifications] markAsRead error:', error);
  }
}

export async function markAllNotificationsAsRead(sessionId: string): Promise<void> {
  try {
    await withAuthRetry(() =>
      getClient()
        .database
        .from('notifications')
        .update({ read: true })
        .eq('session_id', sessionId)
        .eq('read', false)
    );
  } catch (error) {
    console.error('[notifications] markAllAsRead error:', error);
  }
}

export function subscribeToNotifications(
  sessionId: string,
  callback: (notifications: Notification[]) => void
): () => void {
  let cancelled = false;

  const loadInitial = async () => {
    const notifications = await getNotifications(sessionId);
    if (!cancelled) callback(notifications);
  };

  loadInitial();

  const channel = `notifications:${sessionId}`;
  const realtime = getClient().realtime;

  const handler = async () => {
    if (cancelled) return;
    const notifications = await getNotifications(sessionId);
    if (!cancelled) callback(notifications);
  };

  (async () => {
    try {
      await realtime.subscribe(channel);
      realtime.on('notification_created', handler);
    } catch {
      /* best-effort */
    }
  })();

  return () => {
    cancelled = true;
    try {
      realtime.off('notification_created', handler);
      realtime.unsubscribe(channel);
    } catch {
      /* ignore */
    }
  };
}
