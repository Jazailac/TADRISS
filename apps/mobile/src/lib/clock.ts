import { todayIn } from '@tadriss/shared';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const readToday = (timeZone: string): string => todayIn(timeZone);

function minuteIn(timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

/** Re-reads a school-time value every 30 s and whenever the app returns to the foreground. */
function useSchoolClock<T>(timeZone: string, read: (timeZone: string) => T): T {
  const [value, setValue] = useState(() => read(timeZone));
  useEffect(() => {
    const update = () => {
      setValue(read(timeZone));
    };
    update();
    const interval = setInterval(update, 30_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [timeZone, read]);
  return value;
}

/** A local, lightweight clock keeps the current lesson correct after returning to the app. */
export function useSchoolMinute(timeZone: string): number {
  return useSchoolClock(timeZone, minuteIn);
}

/** Refresh the date at midnight and on foregrounding, so the day never stays stale. */
export function useSchoolToday(timeZone: string): string {
  return useSchoolClock(timeZone, readToday);
}
