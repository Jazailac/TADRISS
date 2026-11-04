import {
  fieldErrors,
  loginInput,
  signIn,
  type ErrorCode,
  type ValidationKey,
} from '@tadriss/shared';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { BackButton, BrandMark, Button, ErrorBox } from '@/ui/kit';

const inputClass = 'h-14 rounded-xl border bg-background px-4 text-base text-text';

export default function Login() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<string, ValidationKey>>>({});
  const [serverError, setServerError] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const passwordInput = useRef<TextInput>(null);

  const submit = async () => {
    if (pending) return;
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
        className="flex-1"
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="mx-auto w-full max-w-[560px] gap-6 px-6 pb-8 pt-2"
        >
          <BackButton />
          <View className="gap-8 overflow-hidden rounded-3xl bg-ink p-6">
            <View
              accessible={false}
              className="absolute -end-6 -top-12 h-64 w-40 rounded-t-full border border-ink-foreground/10"
            />
            <View
              accessible={false}
              className="absolute end-3 -top-4 h-60 w-28 rounded-t-full border border-ink-foreground/10"
            />
            <View className="flex-row items-center gap-3">
              <BrandMark compact />
              <Text className="text-base font-semibold tracking-[-0.3px] text-ink-foreground">
                {t('brand')}
              </Text>
            </View>
            <View className="gap-3">
              <Text className="text-[13px] font-semibold uppercase tracking-[2px] text-ink-muted">
                {t('design.schoolSpace')}
              </Text>
              <Text
                className="text-[36px] leading-[42px] tracking-[-1px] text-ink-foreground"
                style={
                  i18n.language === 'ar'
                    ? undefined
                    : { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }
                }
              >
                {t('login.title')}
              </Text>
              <Text className="text-base leading-6 text-ink-muted">{t('login.subtitle')}</Text>
            </View>
          </View>

          {serverError ? (
            <View testID="login-error">
              <ErrorBox code={serverError} />
            </View>
          ) : null}

          <View className="gap-1 rounded-2xl border border-border bg-surface p-5">
            <Text className="mb-2 text-sm font-semibold text-text">{t('login.email')}</Text>
            <TextInput
              testID="email"
              value={email}
              onChangeText={setEmail}
              onFocus={() => {
                setFocused('email');
              }}
              onBlur={() => {
                setFocused(null);
              }}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              onSubmitEditing={() => {
                passwordInput.current?.focus();
              }}
              accessibilityLabel={t('login.email')}
              className={`${inputClass} ${errors.email ? 'border-danger' : focused === 'email' ? 'border-primary' : 'border-border'}`}
            />
            <Text className="min-h-6 text-base leading-6 text-danger">
              {errors.email ? t(`validation.${errors.email}`) : ''}
            </Text>
            <View className="min-h-11 flex-row items-center justify-between gap-3">
              <Text className="text-sm font-semibold text-text">{t('login.password')}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(showPassword ? 'design.hidePassword' : 'design.showPassword')}
                onPress={() => {
                  setShowPassword(!showPassword);
                }}
                className="min-h-11 justify-center"
              >
                <Text className="text-sm text-primary">
                  {t(showPassword ? 'design.hidePassword' : 'design.showPassword')}
                </Text>
              </Pressable>
            </View>
            <TextInput
              ref={passwordInput}
              testID="password"
              value={password}
              onChangeText={setPassword}
              onFocus={() => {
                setFocused('password');
              }}
              onBlur={() => {
                setFocused(null);
              }}
              secureTextEntry={!showPassword}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => {
                void submit();
              }}
              accessibilityLabel={t('login.password')}
              className={`${inputClass} ${errors.password ? 'border-danger' : focused === 'password' ? 'border-primary' : 'border-border'}`}
            />
            <Text className="min-h-7 text-base leading-6 text-danger">
              {errors.password ? t(`validation.${errors.password}`) : ''}
            </Text>
            <Button
              testID="submit"
              label={t('login.submit')}
              pending={pending}
              onPress={() => {
                void submit();
              }}
            />
          </View>
          <Text className="text-center text-sm leading-5 text-text-muted">
            {t('design.loginNote')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
