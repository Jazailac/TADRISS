import type { ErrorCode, SubjectColor } from '@tadriss/shared';
import { dark, light, rgb } from '@tadriss/ui-tokens';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  I18nManager,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Loaded } from '@/lib/load';
import { useAppearance } from '@/lib/appearance';

export type IconName =
  | 'home'
  | 'schedule'
  | 'homework'
  | 'messages'
  | 'more'
  | 'announcements'
  | 'grades'
  | 'attendance'
  | 'payments'
  | 'documents'
  | 'settings'
  | 'back'
  | 'arrow'
  | 'check'
  | 'search';

export type IconTone =
  'neutral' | 'primary' | 'accent' | 'info' | 'success' | 'warning' | 'danger' | 'inverse';
const iconBorder: Record<IconTone, string> = {
  neutral: 'border-text-muted',
  primary: 'border-primary',
  accent: 'border-accent',
  info: 'border-info',
  success: 'border-success',
  warning: 'border-warning',
  danger: 'border-danger',
  inverse: 'border-primary-foreground',
};
const iconFill: Record<IconTone, string> = {
  neutral: 'bg-text-muted',
  primary: 'bg-primary',
  accent: 'bg-accent',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  inverse: 'bg-primary-foreground',
};
const moduleTones: Record<IconName, IconTone> = {
  home: 'primary',
  schedule: 'primary',
  homework: 'accent',
  messages: 'info',
  more: 'neutral',
  announcements: 'warning',
  grades: 'primary',
  attendance: 'success',
  payments: 'accent',
  documents: 'info',
  settings: 'neutral',
  back: 'neutral',
  arrow: 'neutral',
  check: 'success',
  search: 'neutral',
};
const iconSoft: Record<IconTone, string> = {
  neutral: 'bg-surface-muted',
  primary: 'bg-primary-soft',
  accent: 'bg-accent-soft',
  info: 'bg-info-soft',
  success: 'bg-success-soft',
  warning: 'bg-warning-soft',
  danger: 'bg-danger-soft',
  inverse: 'bg-primary-foreground/10',
};

/** Recognisable native glyphs keep each module distinct without an asset download. */
export function Icon({
  name,
  active = false,
  tone,
}: {
  name: IconName;
  active?: boolean;
  tone?: IconTone;
}) {
  const color = tone ?? (active ? 'primary' : 'neutral');
  const border = iconBorder[color];
  const fill = iconFill[color];
  if (name === 'back' || name === 'arrow')
    return (
      <View accessible={false} className="size-6 items-center justify-center">
        <View
          className={`size-2.5 border-e-2 border-t-2 ${border}`}
          style={{
            transform: [
              {
                rotate: I18nManager.isRTL
                  ? name === 'back'
                    ? '135deg'
                    : '-45deg'
                  : name === 'back'
                    ? '-135deg'
                    : '45deg',
              },
            ],
          }}
        />
      </View>
    );
  if (name === 'check' || name === 'attendance')
    return (
      <View
        accessible={false}
        className={`size-6 items-center justify-center rounded-full border-[1.5px] ${border}`}
        style={{ transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }] }}
      >
        <View className={`h-2 w-3 -translate-y-0.5 -rotate-45 border-b-2 border-s-2 ${border}`} />
      </View>
    );
  if (name === 'more')
    return (
      <View accessible={false} className="size-6 flex-row flex-wrap gap-1">
        {[0, 1, 2, 3].map((n) => (
          <View
            key={n}
            className={`size-2.5 rounded-[3px] border-[1.5px] ${border} ${active && n === 0 ? fill : ''}`}
          />
        ))}
      </View>
    );
  if (name === 'settings')
    return (
      <View accessible={false} className="size-6 justify-center gap-1.5">
        {[0, 1, 2].map((n) => (
          <View key={n} className={`h-[1.5px] w-6 ${fill}`}>
            <View
              className={`absolute -top-0.5 size-1.5 rounded-full border-[1.5px] bg-surface ${border} ${n === 1 ? 'end-1' : 'start-1'}`}
            />
          </View>
        ))}
      </View>
    );
  if (name === 'home')
    return (
      <View
        accessible={false}
        className={`size-6 items-center justify-end overflow-hidden rounded-t-full rounded-b-sm border-[1.5px] ${border}`}
      >
        <View className={`h-3 w-2 rounded-t-full border-[1.5px] border-b-0 ${border}`} />
      </View>
    );
  if (name === 'messages')
    return (
      <View
        accessible={false}
        className={`h-5 w-6 gap-1 rounded-lg rounded-ee-sm border-[1.5px] px-1 py-1 ${border}`}
      >
        <View className={`h-[1.5px] w-3 rounded-full ${fill}`} />
        <View className={`h-[1.5px] w-2 rounded-full ${fill}`} />
      </View>
    );
  if (name === 'announcements')
    return (
      <View accessible={false} className="size-6 flex-row items-center gap-1">
        <View className={`h-3 w-2.5 rounded-s-sm border-[1.5px] ${border}`} />
        <View className={`h-5 w-1 border-e-[1.5px] ${border}`} />
        <View className="gap-1.5">
          <View className={`h-[1.5px] w-1.5 ${fill}`} />
          <View className={`h-[1.5px] w-1.5 ${fill}`} />
        </View>
      </View>
    );
  if (name === 'payments')
    return (
      <View
        accessible={false}
        className={`size-6 items-center justify-center rounded-full border-[1.5px] ${border}`}
      >
        <View className={`h-3 w-[1.5px] ${fill}`} />
        <View className={`absolute top-2 h-[1.5px] w-2 ${fill}`} />
        <View className={`absolute bottom-2 h-[1.5px] w-2 ${fill}`} />
      </View>
    );
  if (name === 'grades')
    return (
      <View
        accessible={false}
        className={`size-6 flex-row items-end justify-center gap-1 border-b-[1.5px] pb-1 ${border}`}
      >
        <View className={`h-2 w-1 rounded-t-sm ${fill}`} />
        <View className={`h-3.5 w-1 rounded-t-sm ${fill}`} />
        <View className={`h-5 w-1 rounded-t-sm ${fill}`} />
      </View>
    );
  if (name === 'schedule')
    return (
      <View accessible={false} className={`size-6 rounded-[5px] border-[1.5px] ${border}`}>
        <View className={`absolute start-0 end-0 top-1.5 border-t-[1.5px] ${border}`} />
        <View className="mt-2.5 flex-row flex-wrap gap-1 px-1.5">
          {[0, 1, 2, 3].map((n) => (
            <View key={n} className={`size-1 rounded-[1px] ${fill}`} />
          ))}
        </View>
      </View>
    );
  if (name === 'search')
    return (
      <View accessible={false} className="size-6">
        <View className={`size-[17px] rounded-full border-[1.5px] ${border}`} />
        <View className={`absolute bottom-1 end-0.5 h-[1.5px] w-2 rotate-45 ${fill}`} />
      </View>
    );
  if (name === 'documents')
    return (
      <View accessible={false} className="size-6">
        <View
          className={`absolute start-1.5 top-0 h-5 w-4 rounded-[3px] border-[1.5px] ${border}`}
        />
        <View
          className={`absolute bottom-0 start-0 h-5 w-4 justify-center gap-1 rounded-[3px] border-[1.5px] bg-surface px-1 ${border}`}
        >
          <View className={`h-[1.5px] w-2 rounded-full ${fill}`} />
          <View className={`h-[1.5px] w-1.5 rounded-full ${fill}`} />
        </View>
      </View>
    );
  return (
    <View
      accessible={false}
      className={`h-6 w-5 justify-center gap-1.5 rounded-[4px] border-[1.5px] px-1 ${border}`}
    >
      {[0, 1].map((n) => (
        <View key={n} className="flex-row items-center gap-1">
          <View className={`size-1 rounded-[1px] ${fill}`} />
          <View className={`h-[1.5px] w-1.5 rounded-full ${fill}`} />
        </View>
      ))}
    </View>
  );
}

export function ModuleIcon({ name, compact = false }: { name: IconName; compact?: boolean }) {
  const tone = moduleTones[name];
  return (
    <View
      accessible={false}
      className={`${compact ? 'size-10 rounded-xl' : 'size-12 rounded-2xl'} items-center justify-center ${iconSoft[tone]}`}
    >
      <Icon name={name} tone={tone} />
    </View>
  );
}

const subjectText: Record<SubjectColor, string> = {
  primary: 'text-primary',
  accent: 'text-accent',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
};
const subjectDot: Record<SubjectColor, string> = {
  primary: 'bg-primary',
  accent: 'bg-accent',
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
};
export function SubjectLabel({ name, color }: { name: string; color: SubjectColor }) {
  return (
    <View className="flex-row items-center gap-2">
      <View accessible={false} className={`size-1.5 rounded-full ${subjectDot[color]}`} />
      <Text className={`flex-1 text-[13px] font-semibold leading-5 ${subjectText[color]}`}>
        {name}
      </Text>
    </View>
  );
}

export function Eyebrow({
  children,
  inverse = false,
}: {
  children: ReactNode;
  inverse?: boolean | 'ink';
}) {
  const { i18n } = useTranslation();
  return (
    <Text
      className={`text-[13px] font-semibold uppercase tracking-[1px] ${inverse === 'ink' ? 'text-ink-muted' : inverse ? 'text-primary-foreground/80' : 'text-text-muted'}`}
      style={i18n.language === 'ar' ? { letterSpacing: 0 } : undefined}
    >
      {children}
    </Text>
  );
}

export function Progress({
  value,
  label,
  inverse = false,
  tone = 'primary',
}: {
  value: number;
  label: string;
  inverse?: boolean | 'ink';
  tone?: 'primary' | 'success' | 'danger';
}) {
  const percent = Math.min(100, Math.max(0, value));
  const width = `${percent}%` as const;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      className={`h-1.5 overflow-hidden rounded-full ${inverse === 'ink' ? 'bg-ink-foreground/20' : inverse ? 'bg-primary-foreground/20' : 'bg-surface-muted'}`}
    >
      <View
        className={`h-full rounded-full ${inverse === 'ink' ? 'bg-ink-foreground' : inverse ? 'bg-primary-foreground' : iconFill[tone]}`}
        style={{ width }}
      />
    </View>
  );
}

export function MetricRail({ items }: { items: { label: string; value: string }[] }) {
  return (
    <View className="flex-row flex-wrap border-y border-border">
      {items.map((item, index) => (
        <View
          key={item.label}
          className={`min-w-[44%] flex-1 gap-2 py-5 ${index % 2 === 0 ? 'pe-5' : 'border-s border-border ps-5'}`}
        >
          <Text className="text-base leading-6 text-text-muted">{item.label}</Text>
          <Text
            className="font-mono text-[24px] leading-8 tracking-[-1px] text-text"
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View
      accessible={false}
      className={`${compact ? 'size-9' : 'size-12'} items-center justify-end overflow-hidden rounded-t-full rounded-b-xl border border-ink-foreground/30 bg-primary`}
    >
      <View
        className={`${compact ? 'h-5 w-3.5' : 'h-7 w-5'} rounded-t-full border border-primary-foreground/70 border-b-0 bg-ink`}
      />
    </View>
  );
}

export function Avatar({ name, large = false }: { name: string; large?: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('');
  return (
    <View
      accessible={false}
      className={`${large ? 'size-16 rounded-2xl' : 'size-11 rounded-xl'} items-center justify-center border border-primary/10 bg-primary-soft`}
    >
      <Text className={`${large ? 'text-xl' : 'text-sm'} font-semibold text-primary`}>
        {initials}
      </Text>
    </View>
  );
}

export function BackButton() {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('common.back')}
      onPress={() => {
        router.back();
      }}
      className="min-h-11 self-start flex-row items-center gap-1 rounded-full pe-3 active:bg-surface-muted"
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Icon name="back" />
      <Text className="text-base font-medium text-text">{t('common.back')}</Text>
    </Pressable>
  );
}

/** Every screen shares one responsive reading width and a quiet editorial header. */
export function Screen({
  title,
  subtitle,
  onRefresh,
  children,
  back = false,
  icon,
  eyebrow,
  titleTestID,
  toolbar,
}: {
  title: string;
  subtitle?: string;
  onRefresh?: () => Promise<void>;
  children: ReactNode;
  back?: boolean;
  icon?: IconName;
  eyebrow?: string;
  titleTestID?: string;
  toolbar?: ReactNode;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const { t, i18n } = useTranslation();
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? dark : light;
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="mx-auto w-full max-w-[720px] gap-6 px-5 pb-10 pt-3"
        refreshControl={
          onRefresh ? (
            <RefreshControl
              tintColor={rgb(palette, 'primary')}
              colors={[rgb(palette, 'primary')]}
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
        <View className="gap-4 pb-1">
          {toolbar ??
            (back ? (
              <BackButton />
            ) : (
              <View className="min-h-9 flex-row items-center gap-2">
                <View className="h-1 w-5 rounded-full bg-accent" />
                <Text className="text-[13px] font-semibold uppercase tracking-[1px] text-text-muted">
                  {eyebrow ?? t('brand')}
                </Text>
              </View>
            ))}
          <View className="flex-row items-start gap-4">
            <View className="flex-1 gap-2">
              <Text
                testID={titleTestID}
                accessibilityRole="header"
                className="text-[34px] font-semibold leading-[40px] tracking-[-1.2px] text-text"
                style={i18n.language === 'ar' ? { letterSpacing: 0 } : undefined}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text className="text-base leading-6 text-text-muted">{subtitle}</Text>
              ) : null}
            </View>
            {icon ? <ModuleIcon name={icon} /> : null}
          </View>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({
  children,
  className,
  flush = false,
}: {
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  return (
    <View
      className={`rounded-2xl border border-border bg-surface ${flush ? 'gap-0 overflow-hidden' : 'gap-4 p-5'} ${className ?? ''}`}
    >
      {children}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Text
      accessibilityRole="header"
      className="text-base font-semibold tracking-[-0.2px] text-text"
    >
      {children}
    </Text>
  );
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text className="text-base leading-6 text-text-muted">{children}</Text>;
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
const toneDot: Record<Tone, string> = {
  neutral: 'bg-text-muted',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <View
      className={`self-start flex-row items-center gap-1.5 rounded-full px-2.5 py-1.5 ${toneBox[tone]}`}
    >
      <View className={`size-1 rounded-full ${toneDot[tone]}`} />
      <Text className={`text-[13px] font-semibold ${toneText[tone]}`}>{children}</Text>
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
    <View className="min-w-[44%] flex-1 justify-between gap-5 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-base leading-6 text-text-muted">{label}</Text>
        <View className={`mt-1 size-1.5 rounded-full ${toneDot[tone]}`} />
      </View>
      <Text
        className={`font-mono text-2xl tracking-[-1px] ${toneText[tone]}`}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export function Row({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  last = false,
  testID,
}: {
  title: string;
  subtitle?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress: () => void;
  last?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-20 flex-row items-center gap-3 px-4 py-4 active:bg-surface-muted ${last ? '' : 'border-b border-border'}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      {leading}
      <View className="flex-1 gap-1">
        <Text className="text-base font-semibold leading-6 text-text" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-base leading-6 text-text-muted" numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing ?? <Icon name="arrow" />}
    </Pressable>
  );
}

export function Empty({
  children,
  icon = 'check',
  hint,
}: {
  children: ReactNode;
  icon?: IconName;
  hint?: string;
}) {
  return (
    <View className="items-center gap-4 rounded-2xl border border-dashed border-border-strong bg-surface/50 px-7 py-9">
      <View className="size-14 items-center justify-center rounded-2xl border border-border bg-surface">
        <Icon name={icon} active />
      </View>
      <View className="gap-1.5">
        <Text className="text-center text-sm font-medium leading-6 text-text">{children}</Text>
        {hint ? (
          <Text className="text-center text-base leading-6 text-text-muted">{hint}</Text>
        ) : null}
      </View>
    </View>
  );
}

export function LoadingState({ full = false }: { full?: boolean }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
      className={`gap-4 ${full ? 'flex-1 justify-center bg-background px-6' : ''}`}
    >
      {[0, 1, 2].map((row) => (
        <View key={row} className="gap-3 rounded-2xl border border-border bg-surface p-5">
          <View className="flex-row items-center gap-3">
            <View className="size-10 rounded-xl bg-surface-muted" />
            <View className="flex-1 gap-2">
              <View
                className={`h-2.5 rounded-full bg-surface-muted ${row === 1 ? 'w-2/3' : 'w-1/2'}`}
              />
              <View className="h-2 w-1/3 rounded-full bg-surface-muted" />
            </View>
          </View>
          <View className="h-2 w-5/6 rounded-full bg-surface-muted" />
        </View>
      ))}
    </View>
  );
}

export function Async<T>({
  state,
  retry,
  children,
}: {
  state: Loaded<T>;
  retry: () => Promise<void>;
  children: (data: T) => ReactNode;
}) {
  if (state.status === 'loading') return <LoadingState />;
  if (state.status === 'error') return <ErrorBox code={state.error} retry={retry} />;
  return <>{children(state.data)}</>;
}

export function ErrorBox({ code, retry }: { code: ErrorCode; retry?: () => Promise<void> }) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="alert"
      className="gap-3 rounded-2xl border border-danger/20 bg-danger-soft p-5"
    >
      <Text className="text-sm font-semibold text-danger">{t('errors.genericTitle')}</Text>
      <Text className="text-base leading-6 text-danger">{t(`errors.${code}`)}</Text>
      {retry ? (
        <Button
          label={t('errors.retry')}
          variant="secondary"
          onPress={() => {
            void retry();
          }}
        />
      ) : null}
    </View>
  );
}

export function Button({
  label,
  onPress,
  disabled,
  pending = false,
  variant = 'primary',
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  variant?: 'primary' | 'secondary';
  testID?: string;
}) {
  const { colorScheme } = useColorScheme();
  const { motionAllowed } = useAppearance();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || pending, busy: pending }}
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: disabled || pending ? 0.6 : pressed ? 0.8 : 1,
        transform: [{ scale: pressed && motionAllowed ? 0.98 : 1 }],
      })}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-xl px-5 py-3 ${variant === 'primary' ? 'bg-primary' : 'border border-border-strong bg-surface'} ${disabled || pending ? 'opacity-60' : ''}`}
    >
      {pending ? (
        <ActivityIndicator
          size="small"
          color={rgb(
            colorScheme === 'dark' ? dark : light,
            variant === 'primary' ? 'primary-foreground' : 'primary',
          )}
        />
      ) : null}
      <Text
        className={`text-base font-semibold ${variant === 'primary' ? 'text-primary-foreground' : 'text-text'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
