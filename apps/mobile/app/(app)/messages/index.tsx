import { listConversations } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { supabase } from '@/lib/supabase';
import { useMe } from '@/lib/me';
import { Async, Avatar, Button, Empty, Row, Screen } from '@/ui/kit';

export default function Conversations() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(() => listConversations(supabase), 'conversations');
  return (
    <Screen
      title={t('messages.title')}
      subtitle={t('design.messagesHint')}
      icon="messages"
      onRefresh={reload}
    >
      <Button
        label={t('messages.new')}
        onPress={() => {
          router.push('/messages/new');
        }}
      />
      <Async state={state} retry={reload}>
        {(items) =>
          items.length === 0 ? (
            <Empty icon="messages" hint={t('messages.newHint')}>
              {t('messages.empty')}
            </Empty>
          ) : (
            <View className="border-t border-border">
              {items.map((c, index) => {
                const name = `${c.firstName} ${c.lastName}`.trim() || t('messages.unknown');
                const date = new Intl.DateTimeFormat(me.locale, {
                  day: 'numeric',
                  month: 'short',
                  timeZone: me.profile.institution?.timezone ?? 'Africa/Casablanca',
                }).format(new Date(c.lastAt));
                return (
                  <Row
                    key={c.otherId}
                    title={name}
                    subtitle={c.lastFromMe ? t('messages.you', { text: c.lastBody }) : c.lastBody}
                    leading={<Avatar name={name} />}
                    last={index === items.length - 1}
                    trailing={
                      <View className="items-end gap-2">
                        <Text className="font-mono text-[13px] text-text-muted">{date}</Text>
                        {c.unread > 0 ? (
                          <View className="min-w-6 items-center rounded-full bg-primary px-2 py-1">
                            <Text className="text-[13px] font-semibold text-primary-foreground">
                              {String(c.unread)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    }
                    onPress={() => {
                      router.push(`/messages/${c.otherId}`);
                    }}
                  />
                );
              })}
            </View>
          )
        }
      </Async>
    </Screen>
  );
}
