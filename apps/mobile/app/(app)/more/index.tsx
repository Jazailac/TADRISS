import type { Role } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useMe } from '@/lib/me';
import { Card, Screen } from '@/ui/kit';

type Entry = 'announcements' | 'grades' | 'attendance' | 'payments' | 'documents' | 'settings';
const entries: { key: Entry; roles: readonly Role[] }[] = [
  { key: 'announcements', roles: ['student', 'parent', 'teacher', 'institution_admin'] },
  { key: 'grades', roles: ['student'] },
  { key: 'attendance', roles: ['student'] },
  { key: 'payments', roles: ['student'] },
  { key: 'documents', roles: ['student', 'parent', 'teacher', 'institution_admin'] },
  { key: 'settings', roles: ['student', 'parent', 'teacher', 'institution_admin', 'super_admin'] },
];

export default function More() {
  const { t } = useTranslation();
  const me = useMe();
  return (
    <Screen title={t('tabs.more')}>
      <View className="gap-3">
        {entries
          .filter((e) => e.roles.includes(me.profile.role))
          .map((e) => (
            <Pressable
              key={e.key}
              accessibilityRole="button"
              onPress={() => {
                router.push(`/more/${e.key}`);
              }}
            >
              <Card>
                <Text className="text-base font-semibold text-text">{t(`more.${e.key}`)}</Text>
              </Card>
            </Pressable>
          ))}
      </View>
    </Screen>
  );
}
