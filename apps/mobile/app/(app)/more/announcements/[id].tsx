import { getAnnouncement, markAnnouncementsRead } from '@tadriss/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Button, Card, Muted, Screen } from '@/ui/kit';

export default function AnnouncementDetail() {
  const { t } = useTranslation();
  const me = useMe();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, reload } = useLoad(() => getAnnouncement(supabase, me.userId, id), `a-${id}`);

  // Opening an announcement marks it read.
  useEffect(() => {
    void markAnnouncementsRead(supabase, [id]);
  }, [id]);

  return (
    <Screen title={t('announcements.title')}>
      <Button
        variant="secondary"
        label={t('common.back')}
        onPress={() => {
          router.back();
        }}
      />
      <Async state={state} retry={reload}>
        {(a) => (
          <Card>
            <Text accessibilityRole="header" className="text-2xl font-bold text-text">
              {a.title}
            </Text>
            <Muted>{t('announcements.by', { name: a.authorName })}</Muted>
            <Text className="text-base leading-6 text-text">{a.body}</Text>
          </Card>
        )}
      </Async>
    </Screen>
  );
}
