import { listContacts } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Avatar, Card, Empty, Row, Screen } from '@/ui/kit';

const fullName = (p: { firstName: string; lastName: string }) => `${p.firstName} ${p.lastName}`;

export default function NewMessage() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(() => listContacts(supabase, me.userId), 'contacts');
  return (
    <Screen
      title={t('messages.new')}
      subtitle={t('messages.newHint')}
      icon="messages"
      back
      onRefresh={reload}
    >
      <Async state={state} retry={reload}>
        {(people) =>
          people.length === 0 ? (
            <Empty icon="messages">{t('messages.noContacts')}</Empty>
          ) : (
            <Card flush>
              {people.map((p, index) => (
                <Row
                  key={p.id}
                  title={fullName(p)}
                  subtitle={t(`roles.${p.role}`)}
                  leading={<Avatar name={fullName(p)} />}
                  last={index === people.length - 1}
                  onPress={() => {
                    router.replace(`/messages/${p.id}`);
                  }}
                />
              ))}
            </Card>
          )
        }
      </Async>
    </Screen>
  );
}
