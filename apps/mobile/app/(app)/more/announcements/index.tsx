import { listAnnouncements } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Empty, Icon, Pill, Screen } from '@/ui/kit';

export default function Announcements() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(() => listAnnouncements(supabase, me.userId), 'announcements');
  const date = (iso: string) =>
    new Intl.DateTimeFormat(me.locale, {
      day: 'numeric',
      month: 'long',
      timeZone: me.profile.institution?.timezone ?? 'Africa/Casablanca',
    }).format(new Date(iso));
  return (
    <Screen
      title={t('announcements.title')}
      subtitle={t('design.announcementsHint')}
      icon="announcements"
      back
      onRefresh={reload}
    >
      <Async state={state} retry={reload}>
        {(items) =>
          items.length === 0 ? (
            <Empty icon="announcements">{t('announcements.empty')}</Empty>
          ) : (
            <View className="gap-1">
              {items.map((announcement, index) => {
                const featured = index === 0 && announcement.pinned;
                return (
                  <Pressable
                    key={announcement.id}
                    accessibilityRole="button"
                    onPress={() => {
                      router.push(`/more/announcements/${announcement.id}`);
                    }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    className={`gap-4 ${featured ? 'mb-4 overflow-hidden rounded-3xl bg-ink p-6' : 'border-b border-border py-6'}`}
                  >
                    {featured ? (
                      <View
                        accessible={false}
                        className="absolute -end-8 -top-10 h-64 w-36 rounded-t-full border border-ink-foreground/10"
                      />
                    ) : null}
                    <View className="flex-row flex-wrap items-center gap-2">
                      {announcement.pinned ? (
                        <Pill tone="warning">{t('announcements.pinned')}</Pill>
                      ) : null}
                      {announcement.read ? null : (
                        <Pill tone="primary">{t('announcements.unread')}</Pill>
                      )}
                      <Text
                        className={`text-[13px] ${featured ? 'text-ink-muted' : 'text-text-muted'}`}
                      >
                        {date(announcement.createdAt)}
                      </Text>
                    </View>
                    <Text
                      className={`${featured ? 'text-[25px] leading-8 text-ink-foreground' : 'text-xl leading-7 text-text'} font-semibold tracking-[-0.5px]`}
                    >
                      {announcement.title}
                    </Text>
                    <Text
                      className={`text-base leading-6 ${featured ? 'text-ink-muted' : 'text-text-muted'}`}
                      numberOfLines={3}
                    >
                      {announcement.body}
                    </Text>
                    <View
                      className={`flex-row items-center justify-between gap-3 pt-1 ${featured ? 'border-t border-ink-foreground/15' : ''}`}
                    >
                      <Text
                        className={`flex-1 text-[13px] leading-5 ${featured ? 'text-ink-muted' : 'text-text-muted'}`}
                      >
                        {t('announcements.by', { name: announcement.authorName })}
                      </Text>
                      {featured ? (
                        <View accessible={false} className="h-1 w-5 rounded-full bg-accent" />
                      ) : (
                        <Icon name="arrow" />
                      )}
                    </View>
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
