import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async () => {
  const param = await rootParams.locale();
  if (!hasLocale(routing.locales, param)) notFound();
  const messages = (await import(`../../messages/${param}.json`)) as {
    default: Record<string, unknown>;
  };
  return { locale: param, messages: messages.default };
});
