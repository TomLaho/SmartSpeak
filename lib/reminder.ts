'use client';

/**
 * Zero-backend "daily reminder" helpers. SmartSpeak has no server and no push
 * notifications, so the reminder lives in the user's own calendar instead —
 * either a one-tap Google Calendar recurring event, or a downloadable .ics
 * file for any other calendar app.
 */

const REMINDER_TITLE = 'SmartSpeak — 1-minute practice rep';
const REMINDER_DETAILS =
  "One minute. Open SmartSpeak and do today's rep. https://smartspeak-app.netlify.app/train";

/** Opens Google Calendar's "add event" template, pre-filled as a daily recurring rep. */
export const GOOGLE_CALENDAR_REMINDER_URL = (() => {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: REMINDER_TITLE,
    details: REMINDER_DETAILS,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}&recur=RRULE:FREQ=DAILY`;
})();

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/** DTSTAMP: current instant in UTC "basic" format, e.g. 20260706T091500Z. */
function utcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

/** DTSTART: today at 09:00 in floating local time (no Z — whatever timezone the device is in). */
function floatingNineAm(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T090000`;
}

/** Builds a daily-recurring practice reminder .ics and triggers a client-side download. */
export function downloadPracticeReminderIcs(): void {
  try {
    const now = new Date();
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//SmartSpeak//Daily Practice Reminder//EN',
      'BEGIN:VEVENT',
      'UID:smartspeak-daily-rep@smartspeak-app.netlify.app',
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART;VALUE=DATE-TIME:${floatingNineAm(now)}`,
      'RRULE:FREQ=DAILY',
      `SUMMARY:${REMINDER_TITLE}`,
      `DESCRIPTION:${REMINDER_DETAILS}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'smartspeak-practice.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    /* best-effort download — ignore, matches repo idiom */
  }
}
