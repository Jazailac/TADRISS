import {
  fieldErrors,
  loginInput,
  signIn,
  type ErrorCode,
  type ValidationKey,
} from '@tadriss/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';

const inputClass =
  'h-12 rounded-md border border-border-strong bg-surface px-4 text-base text-text';

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<string, ValidationKey>>>({});
  const [serverError, setServerError] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async () => {
    const parsed = loginInput.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setServerError(null);
    setPending(true);
    const res = await signIn(supabase, parsed.data);
    setPending(false);
    if (!res.ok) {
      setServerError(res.error);
      return;
    }
    router.replace('/home');
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 gap-5 px-6 pb-6 pt-5"
      >
        <View className="min-h-[11rem] justify-between overflow-hidden rounded-3xl bg-ink p-6">
          <View className="absolute -end-12 -top-20 size-48 rounded-full bg-primary/30" />
          <Text className="text-lg font-bold text-ink-foreground">{t('brand')}</Text>
          <View className="gap-2">
            <Text className="text-3xl font-bold leading-10 text-ink-foreground">
              {t('login.title')}
            </Text>
            <Text className="text-base leading-6 text-ink-muted">{t('login.subtitle')}</Text>
          </View>
        </View>

        {serverError ? (
          <Text
            testID="login-error"
            accessibilityRole="alert"
            className="rounded-md bg-danger-soft p-3 text-danger"
          >
            {t(`errors.${serverError}`)}
          </Text>
        ) : null}

        <View className="gap-1.5 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-sm font-medium text-text">{t('login.email')}</Text>
          <TextInput
            testID="email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel={t('login.email')}
            className={inputClass}
          />
          {errors.email ? (
            <Text className="text-sm text-danger">{t(`validation.${errors.email}`)}</Text>
          ) : null}
        </View>

        <View className="gap-1.5 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-sm font-medium text-text">{t('login.password')}</Text>
          <TextInput
            testID="password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            accessibilityLabel={t('login.password')}
            className={inputClass}
          />
          {errors.password ? (
            <Text className="text-sm text-danger">{t(`validation.${errors.password}`)}</Text>
          ) : null}
        </View>

        <Pressable
          testID="submit"
          accessibilityRole="button"
          accessibilityState={{ busy: pending, disabled: pending }}
          disabled={pending}
          onPress={() => void submit()}
          className="h-12 flex-row items-center justify-center gap-2 rounded-md bg-primary active:opacity-80"
        >
          {pending ? <ActivityIndicator size="small" /> : null}
          <Text className="font-semibold text-primary-foreground">{t('login.submit')}</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
