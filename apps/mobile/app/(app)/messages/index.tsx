import { listConversations } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { supabase } from '@/lib/supabase';
import { Async, Button, Card, Empty, Muted, Screen } from '@/ui/kit';

export default function Conversations() {
  const { t } = useTranslation();
  const { state, reload } = useLoad(() => listConversations(supabase), 'conversations');
  return (
    <Screen title={t('messages.title')} onRefresh={reload}>
      <Button
        label={t('messages.new')}
        onPress={() => {
          router.push('/messages/new');
        }}
      />
      <Async state={state} retry={reload}>
        {(items) =>
          items.length === 0 ? (
            <Empty>{t('messages.empty')}</Empty>
          ) : (
            <View className="gap-3">
              {items.map((c) => {
                const name = `${c.firstName} ${c.lastName}`.trim() || t('messages.unknown');
                return (
                  <Pressable
                    key={c.otherId}
                    accessibilityRole="button"
                    onPress={() => {
                      router.push(`/messages/${c.otherId}`);
                    }}
                  >
                    <Card className={c.unread > 0 ? 'border-primary' : ''}>
                      <View className="flex-row items-center justify-between gap-3">
                        <Text
                          className="flex-1 text-base font-semibold text-text"
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                        {c.unread > 0 ? (
                          <View className="min-w-6 items-center rounded-full bg-primary px-2 py-0.5">
                            <Text className="text-xs font-bold text-primary-foreground">
                              {String(c.unread)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Muted>
                        {c.lastFromMe ? t('messages.you', { text: c.lastBody }) : c.lastBody}
                      </Muted>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )
        }
      </Async>
    </Screen>
  );
}
