import type { Role } from '@tadriss/shared';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MeProvider, useMe } from '@/lib/me';

const tabsByRole: Record<Role, readonly string[]> = {
  student: ['home', 'schedule', 'homework', 'messages', 'more'],
  teacher: ['home', 'schedule', 'homework', 'messages', 'more'],
  parent: ['home', 'messages', 'more'],
  institution_admin: ['home', 'messages', 'more'],
  super_admin: ['home'],
};

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: {
    navigate: (name: string) => void;
    emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
  };
};

/** Bottom tabs built from tokens, limited to what the signed-in role has. */
function TabBar({ state, navigation }: TabBarProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { profile } = useMe();
  const allowed = tabsByRole[profile.role];
  return (
    <View
      style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      className="flex-row border-t border-border bg-surface pt-2"
    >
      {state.routes
        .filter((r) => allowed.includes(r.name))
        .map((route) => {
          const focused = state.routes[state.index]?.name === route.name;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              className="flex-1 items-center gap-1 py-2"
            >
              <View
                className={`h-1 w-8 rounded-full ${focused ? 'bg-primary' : 'bg-transparent'}`}
              />
              <Text className={`text-xs ${focused ? 'font-bold text-primary' : 'text-text-muted'}`}>
                {t(`tabs.${route.name as 'home' | 'schedule' | 'homework' | 'messages' | 'more'}`)}
              </Text>
            </Pressable>
          );
        })}
    </View>
  );
}

export default function AppLayout() {
  return (
    <MeProvider>
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="home" />
        <Tabs.Screen name="schedule" />
        <Tabs.Screen name="homework" />
        <Tabs.Screen name="messages" />
        <Tabs.Screen name="more" />
      </Tabs>
    </MeProvider>
  );
}
