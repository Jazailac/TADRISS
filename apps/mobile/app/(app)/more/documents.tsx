import { getDocumentDownloadUrl, listDocuments } from '@tadriss/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { supabase } from '@/lib/supabase';
import { Async, Button, Card, Empty, ErrorBox, Muted, Screen } from '@/ui/kit';

export default function Documents() {
  const { t } = useTranslation();
  const { state, reload } = useLoad(() => listDocuments(supabase), 'documents');
  const [failed, setFailed] = useState(false);

  // A short-lived signed link, opened by the system (browser or file viewer).
  const open = async (id: string) => {
    const res = await getDocumentDownloadUrl(supabase, id);
    setFailed(!res.ok);
    if (res.ok) await Linking.openURL(res.data.url);
  };

  return (
    <Screen title={t('documents.title')} onRefresh={reload}>
      <Button
        variant="secondary"
        label={t('common.back')}
        onPress={() => {
          router.back();
        }}
      />
      {failed ? <ErrorBox code="not_found" /> : null}
      <Async state={state} retry={reload}>
        {(docs) =>
          docs.length === 0 ? (
            <Empty>{t('documents.empty')}</Empty>
          ) : (
            <View className="gap-3">
              {docs.map((d) => (
                <Card key={d.id}>
                  <Text className="text-base font-semibold text-text">{d.title}</Text>
                  {d.description ? <Muted>{d.description}</Muted> : null}
                  <Muted>{d.fileName}</Muted>
                  <Button
                    variant="secondary"
                    label={t('documents.open')}
                    onPress={() => {
                      void open(d.id);
                    }}
                  />
                </Card>
              ))}
            </View>
          )
        }
      </Async>
    </Screen>
  );
}
