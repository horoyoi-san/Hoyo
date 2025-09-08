import fs from 'fs';
import path from 'path';
import { PeakDetail } from '@/types';
import { getPeakEventInfoApi } from '../api';

const DATA_DIR = path.join(process.cwd(), 'data');
const peakFileCache: Record<string, Record<string, PeakDetail>> = {};
export let peakMap: Record<string, PeakDetail> = {};

function getJsonFilePath(locale: string): string {
  return path.join(DATA_DIR, `peak.${locale}.json`);
}

function loadFromFileIfExists(locale: string): Record<string, PeakDetail> | null {
  if (peakFileCache[locale]) return peakFileCache[locale];

  const filePath = getJsonFilePath(locale);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, PeakDetail>;
    peakFileCache[locale] = data;
    return data;
  }
  return null;
}

export async function loadPeak(charIds: string[], locale: string): Promise<Record<string, PeakDetail>> {
  const fileData = loadFromFileIfExists(locale);
  const fileIds = fileData ? Object.keys(fileData) : [];

  if (fileData && charIds.every(id => fileIds.includes(id))) {
    peakMap = fileData;
    return peakMap;
  }

  const result: Record<string, PeakDetail> = {};

  await Promise.all(
    charIds.map(async id => {
      const info = await getPeakEventInfoApi(Number(id), locale);
      if (info) result[id] = info;
    })
  );

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const filePath = getJsonFilePath(locale);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');

  peakFileCache[locale] = result;
  peakMap = result;
  return result;
}
