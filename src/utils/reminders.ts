import type { BPReminder } from '../types';
import { CONTEXT_LABELS } from './bpLogic';

export const WEEKDAYS_AR: Array<{ value: number; short: string; full: string; ics: string }> = [
  { value: 6, short: 'سبت', full: 'السبت', ics: 'SA' },
  { value: 0, short: 'أحد', full: 'الأحد', ics: 'SU' },
  { value: 1, short: 'اثنين', full: 'الاثنين', ics: 'MO' },
  { value: 2, short: 'ثلاثاء', full: 'الثلاثاء', ics: 'TU' },
  { value: 3, short: 'أربعاء', full: 'الأربعاء', ics: 'WE' },
  { value: 4, short: 'خميس', full: 'الخميس', ics: 'TH' },
  { value: 5, short: 'جمعة', full: 'الجمعة', ics: 'FR' },
];

export function createDefaultReminders(): BPReminder[] {
  return [
    {
      id: 'rem-morning',
      label: 'قياس الصباح قبل الدواء',
      time: '08:00',
      frequency: 'daily',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      context: 'morning_before_meds',
      enabled: true,
      soundEnabled: true,
      notes: 'اجلس بهدوء 5 دقائق قبل بدء القياس',
    },
    {
      id: 'rem-evening',
      label: 'قياس المساء قبل النوم',
      time: '20:30',
      frequency: 'daily',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      context: 'evening',
      enabled: true,
      soundEnabled: true,
      notes: 'تجنب الكافيين قبل القياس بـ 30 دقيقة',
    },
    {
      id: 'rem-weekly-review',
      label: 'قياس المتابعة الأسبوعي',
      time: '10:00',
      frequency: 'weekly',
      daysOfWeek: [0, 3],
      context: 'routine',
      enabled: false,
      soundEnabled: true,
      notes: 'مراجعة أسبوعية على الذراع اليسرى واليمنى',
    },
  ];
}

export function getNextOccurrence(reminder: BPReminder, fromDate = new Date()): Date | null {
  if (!reminder.enabled) return null;
  const [hourStr, minuteStr] = reminder.time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;

  const allowedDays =
    reminder.frequency === 'daily'
      ? [0, 1, 2, 3, 4, 5, 6]
      : reminder.daysOfWeek.length > 0
      ? reminder.daysOfWeek
      : [0, 1, 2, 3, 4, 5, 6];

  for (let offsetDays = 0; offsetDays <= 7; offsetDays += 1) {
    const candidate = new Date(fromDate);
    candidate.setDate(candidate.getDate() + offsetDays);
    candidate.setHours(hour, minute, 0, 0);

    if (
      allowedDays.includes(candidate.getDay()) &&
      candidate.getTime() > fromDate.getTime()
    ) {
      return candidate;
    }
  }
  return null;
}

export function formatNextOccurrenceAr(reminder: BPReminder, now = new Date()): string {
  if (!reminder.enabled) return 'متوقف مؤقتاً';
  const next = getNextOccurrence(reminder, now);
  if (!next) return 'غير مجدول';

  const diffMs = next.getTime() - now.getTime();
  const totalMinutes = Math.max(1, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const isToday = next.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = next.toDateString() === tomorrow.toDateString();

  const dayPrefix = isToday
    ? 'اليوم'
    : isTomorrow
    ? 'غداً'
    : new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long' }).format(next);

  let countdown = '';
  if (hours === 0) {
    countdown = `خلال ${minutes} دقيقة`;
  } else if (hours < 24) {
    countdown =
      minutes > 0 ? `خلال ${hours} ساعة و ${minutes} د` : `خلال ${hours} ساعة`;
  } else {
    const days = Math.floor(hours / 24);
    countdown = `خلال ${days} يوم`;
  }

  return `${dayPrefix} ${reminder.time} · ${countdown}`;
}

export function formatReminderDaysAr(reminder: BPReminder): string {
  if (reminder.frequency === 'daily') {
    return 'يومياً';
  }
  if (reminder.daysOfWeek.length === 7) {
    return 'كل أيام الأسبوع';
  }
  if (reminder.daysOfWeek.length === 0) {
    return 'أسبوعياً';
  }
  const labels = WEEKDAYS_AR.filter((d) =>
    reminder.daysOfWeek.includes(d.value)
  ).map((d) => d.short);
  return `أسبوعياً: ${labels.join('، ')}`;
}

export function playGentleChime(): void {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startOffset: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(0.16, now + startOffset + 0.03);
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + startOffset + duration
      );
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    playTone(587.33, 0, 0.28); // D5
    playTone(880.0, 0.18, 0.42); // A5

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 900);
  } catch {
    // Ignore audio context autoplay restrictions gracefully
  }
}

export async function triggerSystemNotification(
  title: string,
  body: string,
  tag: string
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([220, 100, 220]);
    } catch {
      // Ignore vibration errors
    }
  }

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  const options: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag,
    dir: 'rtl',
    lang: 'ar',
    requireInteraction: false,
  };

  // Prefer Service Worker registration.showNotification for Android Chrome PWA tray notifications
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return true;
      }
    }
  } catch {
    // Fallback to direct Notification API below
  }

  try {
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}

export function exportRemindersToICS(reminders: BPReminder[]): void {
  const active = reminders.filter((r) => r.enabled);
  const targetList = active.length > 0 ? active : reminders;
  if (targetList.length === 0) return;

  const pad = (n: number) => String(n).padStart(2, '0');
  const formatIcsLocal = (d: Date) =>
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(
      d.getHours()
    )}${pad(d.getMinutes())}00`;

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nabd BP Tracker//Arabic Medical Reminders//AR',
    'CALSCALE:GREGORIAN',
  ];

  const now = new Date();
  const dtStamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(
    now.getUTCDate()
  )}T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(
    now.getUTCSeconds()
  )}Z`;

  for (const r of targetList) {
    const nextDate = getNextOccurrence({ ...r, enabled: true }, now) ?? now;
    const endDate = new Date(nextDate.getTime() + 10 * 60 * 1000);
    const byDay = WEEKDAYS_AR.filter((d) => r.daysOfWeek.includes(d.value))
      .map((d) => d.ics)
      .join(',');

    const rrule =
      r.frequency === 'daily'
        ? 'RRULE:FREQ=DAILY'
        : `RRULE:FREQ=WEEKLY;BYDAY=${byDay || 'SU,WE'}`;

    const description = [
      `تذكير من تطبيق نبض — ${CONTEXT_LABELS[r.context]}`,
      r.notes,
    ]
      .filter(Boolean)
      .join(' | ')
      .replace(/\n/g, ' ');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.id}@nabd.bp.tracker`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${formatIcsLocal(nextDate)}`,
      `DTEND:${formatIcsLocal(endDate)}`,
      rrule,
      `SUMMARY:نبض: ${r.label}`,
      `DESCRIPTION:${description}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT0M',
      'ACTION:DISPLAY',
      `DESCRIPTION:حان موعد قياس ضغط الدم: ${r.label}`,
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'تذكيرات-قياس-الضغط-نبض.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
