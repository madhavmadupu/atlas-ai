import '../global.css';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#111111' },
          headerTintColor: '#ffffff',
          contentStyle: { backgroundColor: '#0a0a0a' },
          headerShadowVisible: false,
          headerTitleStyle: { fontSize: 17, fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="connect" options={{ title: 'Connect to Desktop' }} />
        <Stack.Screen name="chat/index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="share" options={{ title: 'Share to Atlas AI' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="models" options={{ title: 'Manage Models' }} />
      </Stack>
      <StatusBar style="light" />
    </GestureHandlerRootView>
  );
}
