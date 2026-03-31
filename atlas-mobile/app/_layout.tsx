import '../global.css';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#0a0a0a' }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Platform.OS === 'ios' ? 'transparent' : '#111111',
          },
          headerBlurEffect: Platform.OS === 'ios' ? 'systemChromeMaterialDark' : undefined,
          headerTransparent: Platform.OS === 'ios',
          headerTintColor: '#ffffff',
          contentStyle: { backgroundColor: '#0a0a0a' },
          headerShadowVisible: false,
          headerTitleStyle: { fontSize: 17, fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="connect" options={{ title: 'Connect', headerLargeTitle: Platform.OS === 'ios' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ title: 'Chat', headerBackTitle: 'Back' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
