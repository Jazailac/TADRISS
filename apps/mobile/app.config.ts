import type { ExpoConfig } from 'expo/config';
import { light, rgb } from '@tadriss/ui-tokens';

const config: ExpoConfig = {
  name: 'Tadriss',
  slug: 'tadriss',
  scheme: 'tadriss',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: { supportsTablet: true, bundleIdentifier: 'ma.tadriss.app' },
  android: {
    package: 'ma.tadriss.app',
    adaptiveIcon: {
      backgroundColor: rgb(light, 'primary-soft'),
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
  },
  web: { favicon: './assets/favicon.png' },
  plugins: ['expo-router', ['expo-localization', { supportsRTL: true }]],
  extra: { supportsRTL: true },
  experiments: { typedRoutes: true },
};

export default config;
