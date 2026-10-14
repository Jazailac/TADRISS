import type { ErrorCode } from '@tadriss/shared';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Loaded } from '@/lib/load';

/** A scrolling screen with a title and pull-to-refresh. */
export function Screen({
  title,
  subtitle,
  onRefresh,
  children,
}: {
  title: string;
  subtitle?: string;
  onRefresh?: () => Promise<void>;
  children: ReactNode;
}) {
  const [refreshing, setRefreshing] = useState(false);
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-10 pt-4"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void onRefresh().finally(() => {
                  setRefreshing(false);
                });
              }}
            />
          ) : undefined
        }
      >
        <View className="gap-1">
          <Text accessibilityRole="header" className="text-3xl font-bold text-text">
            {title}
          </Text>
          {subtitle ? <Text className="text-base text-text-muted">{subtitle}</Text> : null}
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={`gap-3 rounded-2xl border border-border bg-surface p-4 ${className ?? ''}`}>
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text className="text-lg font-semibold text-text">{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text className="text-sm text-text-muted">{children}</Text>;
}

type Tone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger';
const toneBox: Record<Tone, string> = {
  neutral: 'bg-surface-muted',
  primary: 'bg-primary-soft',
  success: 'bg-success-soft',
  warning: 'bg-warning-soft',
  danger: 'bg-danger-soft',
};
const toneText: Record<Tone, string> = {
  neutral: 'text-text-muted',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
};

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <View className={`self-start rounded-full px-2.5 py-1 ${toneBox[tone]}`}>
      <Text className={`text-xs font-semibold ${toneText[tone]}`}>{children}</Text>
    </View>
  );
}

export function Stat({
  label,
  value,
  tone = 'primary',
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <View className={`min-w-[45%] flex-1 gap-1 rounded-2xl p-4 ${toneBox[tone]}`}>
      <Text className="text-sm text-text-muted">{label}</Text>
      <Text className={`text-2xl font-bold ${toneText[tone]}`}>{value}</Text>
    </View>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-2xl bg-surface-muted p-5">
      <Text className="text-center text-sm text-text-muted">{children}</Text>
    </View>
  );
}

/** Spinner, error with retry, or the data. */
export function Async<T>({
  state,
  retry,
  children,
}: {
  state: Loaded<T>;
  retry: () => Promise<void>;
  children: (data: T) => ReactNode;
}) {
  const { t } = useTranslation();
  if (state.status === 'loading')
    return <ActivityIndicator accessibilityLabel={t('common.loading')} />;
  if (state.status === 'error') return <ErrorBox code={state.error} retry={retry} />;
  return <>{children(state.data)}</>;
}

export function ErrorBox({ code, retry }: { code: ErrorCode; retry?: () => Promise<void> }) {
  const { t } = useTranslation();
  return (
    <View accessibilityRole="alert" className="gap-3 rounded-2xl bg-danger-soft p-4">
      <Text className="text-sm text-danger">{t(`errors.${code}`)}</Text>
      {retry ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void retry();
          }}
          className="h-10 items-center justify-center rounded-md border border-danger"
        >
          <Text className="font-semibold text-danger">{t('errors.retry')}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      className={`h-12 items-center justify-center rounded-md px-5 active:opacity-80 ${
        variant === 'primary' ? 'bg-primary' : 'border border-border bg-surface'
      } ${disabled ? 'opacity-60' : ''}`}
    >
      <Text
        className={`font-semibold ${variant === 'primary' ? 'text-primary-foreground' : 'text-text'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
