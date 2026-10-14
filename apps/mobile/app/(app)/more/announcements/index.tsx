import { listAnnouncements } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Button, Card, Empty, Muted, Pill, Screen } from '@/ui/kit';

export default function Announcements() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(() => listAnnouncements(supabase, me.userId), 'announcements');
  return (
    <Screen title={t('announcements.title')} onRefresh={reload}>
      <Button
        variant="secondary"
        label={t('common.back')}
        onPress={() => {
          router.back();
        }}
      />
      <Async state={state} retry={reload}>
        {(items) =>
          items.length === 0 ? (
            <Empty>{t('announcements.empty')}</Empty>
          ) : (
            <View className="gap-3">
              {items.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  onPress={() => {
                    router.push(`/more/announcements/${a.id}`);
                  }}
                >
                  <Card className={a.read ? '' : 'border-primary'}>
                    <View className="flex-row flex-wrap gap-2">
                      {a.read ? null : <Pill tone="primary">{t('announcements.unread')}</Pill>}
                      {a.pinned ? <Pill tone="warning">{t('announcements.pinned')}</Pill> : null}
                    </View>
                    <Text className="text-base font-semibold text-text">{a.title}</Text>
                    <Text className="text-sm text-text-muted" numberOfLines={2}>
                      {a.body}
                    </Text>
                    <Muted>{t('announcements.by', { name: a.authorName })}</Muted>
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
