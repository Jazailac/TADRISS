import type { Role } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useMe } from '@/lib/me';
import { Avatar, BrandMark, Card, ModuleIcon, Row, Screen, SectionTitle } from '@/ui/kit';

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
  const displayName = `${me.profile.firstName} ${me.profile.lastName}`;
  const visible = entries.filter((e) => e.roles.includes(me.profile.role));
  return (
    <Screen title={t('tabs.more')} subtitle={t('design.space')} icon="more">
      <View className="gap-5 pb-2">
        <View className="flex-row items-center gap-4">
          <Avatar name={displayName} large />
          <View className="flex-1 gap-2">
            <Text className="text-[23px] font-semibold leading-8 tracking-[-0.6px] text-text">
              {displayName}
            </Text>
            <Text className="text-sm font-medium text-primary">
              {t(`roles.${me.profile.role}`)}
            </Text>
          </View>
        </View>
        {me.profile.institution?.name ? (
          <View className="flex-row items-center gap-3 border-t border-border pt-5">
            <BrandMark compact />
            <Text className="flex-1 text-sm font-medium leading-5 text-text-muted">
              {me.profile.institution.name}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="gap-4">
        <SectionTitle>{t('design.schoolSpace')}</SectionTitle>
        <Card flush>
          {visible.map((e, index) => (
            <Row
              testID={`more-${e.key}`}
              key={e.key}
              title={t(`more.${e.key}`)}
              leading={<ModuleIcon name={e.key} compact />}
              last={index === visible.length - 1}
              onPress={() => {
                router.push(`/more/${e.key}`);
              }}
            />
          ))}
        </Card>
      </View>
    </Screen>
  );
}
