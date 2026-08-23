import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function bytesToHex(bytes: number[] | Uint8Array, maxLen = 64): string {
  const arr = Array.from(bytes.slice(0, maxLen));
  return arr.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

/**
 * Format a byte array as classic hex-dump rows (offset + 16 hex bytes +
 * ascii column). Returns at most `maxBytes` bytes worth of rows.
 */
export function hexDump(bytes: number[] | Uint8Array, maxBytes = 4096): string {
  const slice = Array.from(bytes.slice(0, maxBytes));
  const lines: string[] = [];
  for (let offset = 0; offset < slice.length; offset += 16) {
    const row = slice.slice(offset, offset + 16);
    const hex = row.map((b) => b.toString(16).padStart(2, '0').toUpperCase());
    const hexPart = hex.join(' ').padEnd(47, ' ');
    const ascii = row
      .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push(`${offset.toString(16).padStart(8, '0')}  ${hexPart}  |${ascii}|`);
  }
  return lines.join('\n');
}

export function formatTime(timestamp: number | undefined): string {
  const date = new Date(timestamp ?? Date.now());
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** Trigger a client-side text file download (used by console export). */
export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
