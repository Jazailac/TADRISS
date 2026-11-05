import '@tadriss/ui-tokens/mobile.css';
import '@/i18n';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { applyDirection, initialLocale } from '@/i18n';
import { AppearanceProvider } from '@/lib/appearance';

export default function RootLayout() {
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    void applyDirection(initialLocale);
  }, []);

  return (
    <AppearanceProvider>
      <SafeAreaProvider>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </AppearanceProvider>
  );
}
