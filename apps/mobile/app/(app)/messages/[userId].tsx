import { getContact, listThread, markThreadRead, sendMessage } from '@tadriss/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Button, ErrorBox, Muted } from '@/ui/kit';

export default function Thread() {
  const { t } = useTranslation();
  const me = useMe();
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const other = userId;
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
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

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    const res = await sendMessage(supabase, me.institutionId, { recipientId: other, body });
    setSending(false);
    setFailed(!res.ok);
    if (res.ok) {
      setDraft('');
      await reload();
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="gap-1 border-b border-border px-5 pb-3 pt-4">
          <Button
            variant="secondary"
            label={t('common.back')}
            onPress={() => {
              router.back();
            }}
          />
          <Text accessibilityRole="header" className="mt-3 text-2xl font-bold text-text">
            {name}
          </Text>
        </View>
        <ScrollView
          ref={scroller}
          contentContainerClassName="gap-2 px-5 py-4"
          onContentSizeChange={() => {
            scroller.current?.scrollToEnd({ animated: false });
          }}
        >
          <Async state={state} retry={reload}>
            {(messages) =>
              messages.length === 0 ? (
                <Muted>{t('messages.startThread')}</Muted>
              ) : (
                <>
                  {messages.map((m) => (
                    <View
                      key={m.id}
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        m.fromMe ? 'self-end bg-primary' : 'self-start bg-surface-muted'
                      }`}
                    >
                      <Text className={m.fromMe ? 'text-primary-foreground' : 'text-text'}>
                        {m.body}
                      </Text>
                    </View>
                  ))}
                </>
              )
            }
          </Async>
        </ScrollView>
        {failed ? (
          <View className="px-5">
            <ErrorBox code="unknown" />
          </View>
        ) : null}
        <View className="flex-row items-end gap-2 border-t border-border px-5 py-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            multiline
            placeholder={t('messages.placeholder')}
            accessibilityLabel={t('messages.placeholder')}
            className="max-h-32 min-h-12 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-text"
          />
          <Button
            label={t('messages.send')}
            disabled={sending || draft.trim() === ''}
            onPress={() => {
              void send();
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
