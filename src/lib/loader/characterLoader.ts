import fs from 'fs';
import path from 'path';
import { CharacterDetail } from '@/types/characterDetail';
import { getCharacterInfoApi } from '../api';

const DATA_DIR = path.join(process.cwd(), 'data');
const characterFileCache: Record<string, Record<string, CharacterDetail>> = {};
export let characterMap: Record<string, CharacterDetail> = {};
export let rankIconMap: Record<string, string[]> = {};
function getJsonFilePath(locale: string): string {
  return path.join(DATA_DIR, `characters.${locale}.json`);
}

function loadFromFileIfExists(locale: string): Record<string, CharacterDetail> | null {
  if (characterFileCache[locale]) return characterFileCache[locale];

  const filePath = getJsonFilePath(locale);
  const fileRankIconPath = path.join(DATA_DIR, `rank_icon.json`);
  if (fs.existsSync(fileRankIconPath)) {
    const data = JSON.parse(fs.readFileSync(fileRankIconPath, 'utf-8')) as Record<string, string[]>;
    rankIconMap = data;
  }
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, CharacterDetail>;
    Object.keys(data).forEach((key) => {
      data[key].RankIcon = rankIconMap[key] || [];
    });
    characterFileCache[locale] = data;
    return data;
  }

  return null;
}

export async function loadCharacters(charIds: string[], locale: string): Promise<Record<string, CharacterDetail>> {
  const fileData = loadFromFileIfExists(locale);
  const fileIds = fileData ? Object.keys(fileData) : [];

  if (fileData && charIds.every(id => fileIds.includes(id))) {
    characterMap = fileData;
    return characterMap;
  }

  const result: Record<string, CharacterDetail> = {};

  await Promise.all(
    charIds.map(async id => {
      const info = await getCharacterInfoApi(Number(id), locale);
      if (info){
        info.RankIcon = rankIconMap[id] || [];
        result[id] = info;
      }
    })
  );

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const filePath = getJsonFilePath(locale);
  fs.writeFileSync(filePath, JSON.stringify(result, null, 2), 'utf-8');

  characterFileCache[locale] = result;
  characterMap = result;
  return result;
}
