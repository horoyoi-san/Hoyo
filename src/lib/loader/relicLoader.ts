import fs from 'fs';
import path from 'path';
import { RelicDetail } from '@/types';
import { getRelicInfoApi } from '../api';

const DATA_DIR = path.join(process.cwd(), 'data');
const relicFileCache: Record<string, Record<string, RelicDetail>> = {};
export let relicMap: Record<string, RelicDetail> = {};
export let relicBonusMap: Record<string, Record<string, { type: string, value: number }[]>> = {};
function getJsonFilePath(locale: string): string {
  return path.join(DATA_DIR, `relics.${locale}.json`);
}

function loadRelicFromFileIfExists(locale: string): Record<string, RelicDetail> | null {
  if (relicFileCache[locale]) return relicFileCache[locale];

  const filePath = getJsonFilePath(locale);
  const fileBonusPath = path.join(DATA_DIR, `relic_bonus.json`);
  if (fs.existsSync(fileBonusPath)) {
    const data = JSON.parse(fs.readFileSync(fileBonusPath, 'utf-8')) as Record<string, Record<string, { type: string, value: number }[]>>;
    relicBonusMap = data;
  }
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, RelicDetail>;
    Object.keys(data).forEach((key) => {
      data[key].Bonus = relicBonusMap[key] || {};
    });
    relicFileCache[locale] = data;
    return data;
  }
  return null;
}

export async function loadRelics(charIds: string[], locale: string): Promise<Record<string, RelicDetail>> {
  const fileData = loadRelicFromFileIfExists(locale);
  const fileIds = fileData ? Object.keys(fileData) : [];

  if (fileData && charIds.every(id => fileIds.includes(id))) {
    relicMap = fileData;
    return relicMap;
  }

  const result: Record<string, RelicDetail> = {};

  await Promise.all(
    charIds.map(async id => {
      const info = await getRelicInfoApi(Number(id), locale);
      if (info) {
        info.Bonus = relicBonusMap[id] || {};
        result[id] = info;
      }
    })
  );

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const filePath = getJsonFilePath(locale);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');

  relicFileCache[locale] = result;
  relicMap = result;
  return result;
}
