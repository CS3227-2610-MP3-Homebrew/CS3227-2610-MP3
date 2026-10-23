'use client';

export function PrintButton() {
  return <button type="button" className="rounded border px-4 py-2 print:hidden" onClick={() => window.print()}>Print</button>;
}
