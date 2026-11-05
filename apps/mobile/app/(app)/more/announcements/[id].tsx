import { getAnnouncement, markAnnouncementsRead } from '@tadriss/shared';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Card, Muted, Screen } from '@/ui/kit';

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
    <Screen title={t('announcements.title')} icon="announcements" back>
      <Async state={state} retry={reload}>
        {(a) => (
          <Card>
            <Text
              accessibilityRole="header"
              className="text-2xl font-semibold leading-8 tracking-[-0.5px] text-text"
            >
              {a.title}
            </Text>
            <Muted>{t('announcements.by', { name: a.authorName })}</Muted>
            <Text className="border-t border-border pt-5 text-base leading-8 text-text">
              {a.body}
            </Text>
          </Card>
        )}
      </Async>
    </Screen>
  );
}
