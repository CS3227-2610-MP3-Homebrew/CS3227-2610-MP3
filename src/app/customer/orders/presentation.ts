export const money = (cents: number) => `S$${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
export const singaporeTime = (instant: string) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
}).format(new Date(instant)) + ' SGT';
