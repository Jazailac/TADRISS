import { listContacts } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Button, Card, Empty, Muted, Screen } from '@/ui/kit';

const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

export default function NewMessage() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(() => listContacts(supabase, me.userId), 'contacts');
  return (
    <Screen title={t('messages.new')} subtitle={t('messages.newHint')} onRefresh={reload}>
      <Button
        variant="secondary"
        label={t('common.back')}
        onPress={() => {
          router.back();
        }}
      />
      <Async state={state} retry={reload}>
        {(people) =>
          people.length === 0 ? (
            <Empty>{t('messages.noContacts')}</Empty>
          ) : (
            <View className="gap-3">
              {people.map((p) => (
                <Pressable
                  key={p.id}
                  accessibilityRole="button"
                  onPress={() => {
                    router.replace(`/messages/${p.id}`);
                  }}
                >
                  <Card>
                    <Text className="text-base font-semibold text-text">{fullName(p)}</Text>
                    <Muted>{t(`roles.${p.role}`)}</Muted>
                  </Card>
                </Pressable>
              ))}
            </View>
          )
        }
      </Async>
    </Screen>
  );
}
