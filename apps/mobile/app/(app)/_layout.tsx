import type { Role } from '@tadriss/shared';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MeProvider, useMe } from '@/lib/me';
import { Icon, type IconName } from '@/ui/kit';

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
      className="flex-row border-t border-border bg-surface px-1 pt-2"
    >
      {state.routes
        .filter((r) => allowed.includes(r.name))
        .map((route) => {
          const focused = state.routes[state.index]?.name === route.name;
          return (
            <Pressable
              testID={`tab-${route.name}`}
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
              className="min-h-16 flex-1 items-center gap-1.5 px-0.5 py-1"
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <View
                className={`h-8 w-12 items-center justify-center rounded-xl ${focused ? 'bg-primary' : 'bg-transparent'}`}
              >
                <Icon
                  name={route.name as IconName}
                  tone={focused ? 'inverse' : 'neutral'}
                  active={focused}
                />
              </View>
              <Text
                className={`text-[12px] leading-4 text-center ${focused ? 'font-bold text-primary' : 'text-text-muted'}`}
              >
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
