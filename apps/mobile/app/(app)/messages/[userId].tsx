import {
  getContact,
  listThread,
  markThreadRead,
  sendMessage,
  type ErrorCode,
} from '@tadriss/shared';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { dark, light, rgb } from '@tadriss/ui-tokens';
import { useColorScheme } from 'nativewind';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Avatar, BackButton, Button, Empty, ErrorBox } from '@/ui/kit';

export default function Thread() {
  const { t } = useTranslation();
  const me = useMe();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const other = userId;
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [focused, setFocused] = useState(false);
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? dark : light;
  const scroller = useRef<ScrollView>(null);

  const contact = useLoad(() => getContact(supabase, other), `contact-${other}`);
  const { state, reload } = useLoad(
    () => listThread(supabase, me.userId, other),
    `thread-${other}`,
  );

  // Mark what they sent as read, and look for new messages every 15 seconds.
  useEffect(() => {
    void markThreadRead(supabase, other);
    const id = setInterval(() => {
      void reload();
    }, 15_000);
    return () => {
      clearInterval(id);
    };
  }, [other, reload]);

  const name =
    contact.state.status === 'ready'
      ? `${contact.state.data.firstName} ${contact.state.data.lastName}`
      : t('messages.unknown');
  const zone = me.profile.institution?.timezone ?? 'Africa/Casablanca';
  const date = new Intl.DateTimeFormat(me.locale, {
    day: 'numeric',
    month: 'long',
    timeZone: zone,
  });
  const time = new Intl.DateTimeFormat(me.locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: zone,
  });

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setError(null);
    setSending(true);
    const res = await sendMessage(supabase, me.institutionId, { recipientId: other, body });
    setSending(false);
    setError(res.ok ? null : res.error);
    if (res.ok) {
      setDraft((current) => (current.trim() === body ? '' : current));
      await reload();
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="border-b border-border bg-surface px-5 pb-4 pt-2">
          <View className="mx-auto w-full max-w-[680px] gap-3">
            <BackButton />
            <View className="flex-row items-center gap-3">
              <Avatar name={name} />
              <View className="flex-1 gap-1">
                <Text
                  accessibilityRole="header"
                  className="text-lg font-semibold leading-6 tracking-[-0.3px] text-text"
                  numberOfLines={2}
                >
                  {name}
                </Text>
                {contact.state.status === 'ready' ? (
                  <Text className="text-sm text-text-muted">
                    {t(`roles.${contact.state.data.role}`)}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>
        </View>
        <ScrollView
          ref={scroller}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="mx-auto w-full max-w-[720px] grow gap-3 px-5 py-5"
          onContentSizeChange={() => {
            scroller.current?.scrollToEnd({ animated: false });
          }}
        >
          <Async state={state} retry={reload}>
            {(messages) =>
              messages.length === 0 ? (
                <View className="flex-1 justify-center">
                  <Empty icon="messages" hint={t('design.messagesHint')}>
                    {t('messages.startThread')}
                  </Empty>
                </View>
              ) : (
                <>
                  {messages.map((m, index) => {
                    const day = date.format(new Date(m.createdAt));
                    const previous = messages[index - 1];
                    const showDay = !previous || day !== date.format(new Date(previous.createdAt));
                    return (
                      <View key={m.id} className="gap-3">
                        {showDay ? (
                          <View className="items-center py-3">
                            <Text className="rounded-full bg-surface-muted px-3 py-1 text-[13px] font-medium text-text-muted">
                              {day}
                            </Text>
                          </View>
                        ) : null}
                        <View
                          className={`max-w-[88%] gap-2 rounded-2xl border px-4 py-3 ${m.fromMe ? 'self-end rounded-ee-sm border-primary bg-primary' : 'self-start rounded-es-sm border-border bg-surface'}`}
                        >
                          <Text
                            className={`text-base leading-6 ${m.fromMe ? 'text-primary-foreground' : 'text-text'}`}
                          >
                            {m.body}
                          </Text>
                          <View className="flex-row items-center justify-end gap-2">
                            {m.fromMe && m.readAt ? (
                              <Text className="text-[13px] text-primary-foreground/75">
                                {t('messages.read')}
                              </Text>
                            ) : null}
                            <Text
                              className={`font-mono text-[13px] ${m.fromMe ? 'text-primary-foreground/75' : 'text-text-muted'}`}
                            >
                              {time.format(new Date(m.createdAt))}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </>
              )
            }
          </Async>
        </ScrollView>
        {error ? (
          <View className="mx-auto w-full max-w-[720px] px-5 pb-3">
            <ErrorBox code={error} />
          </View>
        ) : null}
        <View className="border-t border-border bg-surface px-5 py-3">
          <View className="mx-auto w-full max-w-[680px] flex-row items-end gap-2">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onFocus={() => {
                setFocused(true);
              }}
              onBlur={() => {
                setFocused(false);
              }}
              multiline
              placeholder={t('messages.placeholder')}
              accessibilityLabel={t('messages.placeholder')}
              placeholderTextColor={rgb(palette, 'text-muted')}
              className={`max-h-32 min-h-12 flex-1 rounded-xl border bg-background px-4 py-3 text-base leading-6 text-text ${focused ? 'border-primary' : 'border-border'}`}
            />
            <Button
              label={t('messages.send')}
              disabled={draft.trim() === ''}
              pending={sending}
              onPress={() => {
                void send();
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
