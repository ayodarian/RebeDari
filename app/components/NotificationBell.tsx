import React, { useEffect, useState } from 'react';
import { Pressable, View, Text, StyleSheet, Modal, FlatList, TouchableOpacity, Image } from 'react-native';
import { useAppStore } from '../../store/index';
import { useTheme } from './ThemeProvider';
import {
  Notification,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotifications,
} from '../../lib/notifications';

const ICON_BELL = require('../../assets/icon-bell.png');
const ICON_IMAGE = require('../../assets/icon-image.png');
const ICON_VIDEO = require('../../assets/icon-video.png');
const ICON_CHAT = require('../../assets/icon-chat.png');
const ICON_CLOSE = require('../../assets/icon-close.png');

type NotificationBellProps = {
  /** When provided, the bell icon is replaced by this trigger element (e.g. an avatar). */
  trigger?: React.ReactNode;
  onPress?: () => void;
};

export const NotificationBell: React.FC<NotificationBellProps> = ({ trigger, onPress }) => {
  const { theme } = useTheme();
  const sessionId = useAppStore((s) => s.sessionId);
  const userId = useAppStore((s) => s.user?.id);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    loadNotifications();
    const unsubscribe = subscribeToNotifications(sessionId, (notifs) => {
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read && n.sender_id !== userId).length);
    });

    return () => {
      unsubscribe();
    };
  }, [sessionId, userId]);

  const loadNotifications = async () => {
    if (!sessionId) return;
    const notifs = await getNotifications(sessionId);
    setNotifications(notifs);
    setUnreadCount(notifs.filter(n => !n.read && n.sender_id !== userId).length);
  };

  const openModal = async () => {
    setModalVisible(true);
    if (unreadCount > 0) {
      await markAllNotificationsAsRead(sessionId!);
      setUnreadCount(0);
    }
  };

  const handlePress = () => {
    onPress?.();
    openModal();
  };

  const handleNotificationPress = async (notification: Notification) => {
    if (!notification.read && notification.sender_id !== userId) {
      await markNotificationAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notification.id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'foto': return ICON_IMAGE;
      case 'video': return ICON_VIDEO;
      case 'bitacora': return ICON_CHAT;
      case 'bingo': return ICON_CHAT;
      case 'carta': return ICON_CHAT;
      case 'chat': return ICON_CHAT;
      default: return ICON_BELL;
    }
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `Hace ${days} día${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Hace ${hours} hora${hours > 1 ? 's' : ''}`;
    if (minutes > 0) return `Hace ${minutes} min${minutes > 1 ? 's' : ''}`;
    return 'Ahora';
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { backgroundColor: item.read ? theme.surface : theme.primaryLight },
      ]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={[styles.notificationIcon, { backgroundColor: theme.primaryLight }]}>
        <Image source={getIcon(item.type)} style={[styles.notificationIconImage, { tintColor: theme.primary }]} />
      </View>
      <View style={styles.notificationContent}>
        <Text style={[styles.notificationTitle, { color: theme.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.notificationMessage, { color: theme.textSecondary }]}>
          {item.message}
        </Text>
        <Text style={[styles.notificationTime, { color: theme.textTertiary }]}>
          {getTimeAgo(item.created_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      {trigger ? (
        <Pressable onPress={handlePress} style={{ position: 'relative' }}>
          {trigger}
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      ) : (
        <Pressable style={[styles.bellContainer, { backgroundColor: theme.headerCapsule }]} onPress={openModal}>
          <Image source={ICON_BELL} style={[styles.bellIcon, { tintColor: theme.primaryDesaturated }]} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: theme.badgeBg }]}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </Pressable>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Notificaciones</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <Image source={ICON_CLOSE} style={[styles.closeButton, { tintColor: theme.textSecondary }]} />
              </Pressable>
            </View>

            <FlatList
              data={notifications}
              renderItem={renderNotification}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No hay notificaciones
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
};

export default NotificationBell;

const styles = StyleSheet.create({
  bellContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  bellIcon: {
    width: 22,
    height: 22,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '80%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 24,
    height: 24,
    padding: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationIconImage: {
    width: 22,
    height: 22,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
