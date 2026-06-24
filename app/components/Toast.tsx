import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

type ToastContextType = {
  show: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);
  const [message, setMessage] = useState<string | null>(null);
  const [anim] = useState(new Animated.Value(0));

  const show = useCallback(
    (msg: string) => {
      setMessage(msg);
      Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
        setTimeout(() => {
          Animated.timing(anim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
            setMessage(null)
          );
        }, 2000);
      });
    },
    [anim]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message && (
        <Animated.View
          style={[
            styles.container,
            {
              backgroundColor: isDarkMode ? '#2A2A30EE' : '#1a1a1aEE',
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [80, 0],
                  }),
                },
              ],
              opacity: anim,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => {
              Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
                setMessage(null)
              );
            }}
          >
            <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  text: { fontWeight: '600' },
});

export default ToastProvider;
