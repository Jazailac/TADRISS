import { getDocumentDownloadUrl, listDocuments, type ErrorCode } from '@tadriss/shared';
import { dark, light, rgb } from '@tadriss/ui-tokens';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Empty, ErrorBox, Eyebrow, Icon, Screen } from '@/ui/kit';

function fileType(mime: string) {
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv') return 'sheet';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'slides';
  return 'text';
}
const coverTone = {
  pdf: 'border-accent/25 bg-accent-soft',
  image: 'border-info/25 bg-info-soft',
  sheet: 'border-success/25 bg-success-soft',
  slides: 'border-warning/25 bg-warning-soft',
  text: 'border-primary/25 bg-primary-soft',
} as const;

export default function Documents() {
  const { t } = useTranslation();
  const me = useMe();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? dark : light;
  const { state, reload } = useLoad(() => listDocuments(supabase), 'documents');
  const [error, setError] = useState<ErrorCode | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const fileSize = (bytes: number) =>
    new Intl.NumberFormat(me.locale, {
      style: 'unit',
      unit: bytes >= 1024 * 1024 ? 'megabyte' : 'kilobyte',
      maximumFractionDigits: 1,
    }).format(bytes / (bytes >= 1024 * 1024 ? 1024 * 1024 : 1024));
  const date = (iso: string) =>
    new Intl.DateTimeFormat(me.locale, {
      day: 'numeric',
      month: 'short',
      timeZone: me.profile.institution?.timezone ?? 'Africa/Casablanca',
    }).format(new Date(iso));

  // A short-lived signed link, opened by the system (browser or file viewer).
  const open = async (id: string) => {
    if (opening) return;
    setOpening(id);
    setError(null);
    try {
      const res = await getDocumentDownloadUrl(supabase, id);
      if (res.ok) await Linking.openURL(res.data.url);
      else setError(res.error);
    } catch {
      setError('unknown');
    } finally {
      setOpening(null);
    }
  };

  return (
    <Screen
      title={t('documents.title')}
      subtitle={t('design.documentsHint')}
      icon="documents"
      back
      onRefresh={reload}
    >
      {error ? <ErrorBox code={error} /> : null}
      <Async state={state} retry={reload}>
        {(docs) =>
          docs.length === 0 ? (
            <Empty icon="documents">{t('documents.empty')}</Empty>
          ) : (
            <View className="gap-3">
              <View className="flex-row items-center justify-between gap-3 pb-2">
                <Eyebrow>{t('documents.library')}</Eyebrow>
                <Text className="font-mono text-sm text-text-muted">
                  {t('documents.count', { count: docs.length })}
                </Text>
              </View>
              <View className="border-t border-border">
                {docs.map((document, index) => {
                  const type = fileType(document.mimeType);
                  return (
                    <Pressable
                      key={document.id}
                      accessibilityRole="button"
                      accessibilityLabel={t('documents.openNamed', { title: document.title })}
                      accessibilityState={{
                        busy: opening === document.id,
                        disabled: opening !== null,
                      }}
                      disabled={opening !== null}
                      onPress={() => {
                        void open(document.id);
                      }}
                      className={`flex-row items-start gap-4 py-6 ${index === docs.length - 1 ? '' : 'border-b border-border'}`}
                      style={({ pressed }) => ({
                        opacity: pressed || (opening && opening !== document.id) ? 0.55 : 1,
                      })}
                    >
                      <View
                        accessible={false}
                        className={`h-24 w-16 justify-between overflow-hidden rounded-xl rounded-se-3xl border p-2.5 ${coverTone[type]}`}
                      >
                        <View className="gap-1.5 pt-1">
                          <View className="h-1 w-7 rounded-full bg-text-muted/30" />
                          <View className="h-1 w-5 rounded-full bg-text-muted/20" />
                          {type === 'image' ? (
                            <View className="mt-1 h-4 w-8 rounded-t-full bg-info/25" />
                          ) : null}
                          {type === 'sheet' ? (
                            <View className="mt-1 h-4 w-8 border border-success/30" />
                          ) : null}
                        </View>
                        <Text className="text-[13px] font-bold text-text-muted" numberOfLines={1}>
                          {t(`documents.type.${type}`)}
                        </Text>
                      </View>
                      <View className="flex-1 gap-2.5">
                        <Text className="text-[17px] font-semibold leading-6 tracking-[-0.3px] text-text">
                          {document.title}
                        </Text>
                        <Text className="text-[13px] leading-4 text-text-muted" numberOfLines={2}>
                          {document.fileName}
                        </Text>
                        {document.description ? (
                          <Text className="text-sm leading-5 text-text-muted" numberOfLines={2}>
                            {document.description}
                          </Text>
                        ) : null}
                        <Text className="text-[13px] text-text-muted">
                          {[
                            fileSize(document.sizeBytes),
                            date(document.createdAt),
                            document.className,
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </Text>
                        <View className="min-h-8 flex-row items-center gap-2">
                          <Text className="text-sm font-semibold text-primary">
                            {t('documents.open')}
                          </Text>
                          {opening === document.id ? (
                            <ActivityIndicator size="small" color={rgb(palette, 'primary')} />
                          ) : (
                            <Icon name="arrow" tone="primary" />
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )
        }
      </Async>
    </Screen>
  );
}
