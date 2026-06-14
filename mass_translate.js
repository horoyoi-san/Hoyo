const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const translations = {
  cancel: { en: "Cancel", th: "ยกเลิก" },
  character: { en: "Character", th: "ตัวละคร" },
  characters: { en: "Characters", th: "ตัวละคร" },
  close: { en: "Close", th: "ปิด" },
  comingSoon: { en: "Coming Soon", th: "เร็วๆ นี้" },
  connected: { en: "Connected", th: "เชื่อมต่อแล้ว" },
  database: { en: "Database", th: "ฐานข้อมูล" },
  delete: { en: "Delete", th: "ลบ" },
  description: { en: "Description", th: "คำอธิบาย" },
  deselectAll: { en: "Deselect All", th: "ยกเลิกการเลือกทั้งหมด" },
  details: { en: "Details", th: "รายละเอียด" },
  energy: { en: "Energy", th: "พลังงาน" },
  equipped: { en: "Equipped", th: "สวมใส่แล้ว" },
  export: { en: "Export", th: "ส่งออก" },
  exportDatabase: { en: "Export Database", th: "ส่งออกฐานข้อมูล" },
  fireflyGo: { en: "FireflyGo", th: "FireflyGo" },
  floor: { en: "Floor", th: "ชั้น" },
  freeSr: { en: "FreeSR", th: "FreeSR" },
  hp: { en: "HP", th: "HP" },
  housecleaningStorm: { en: "Housecleaning Storm", th: "Housecleaning Storm" },
  level: { en: "Level", th: "เลเวล" },
  lightcone: { en: "Lightcone", th: "Lightcone" },
  max: { en: "MAX", th: "สูงสุด" },
  monsterSetting: { en: "Monster Setting", th: "ตั้งค่ามอนสเตอร์" },
  other: { en: "Other", th: "อื่นๆ" },
  psConnection: { en: "PS Connection", th: "การเชื่อมต่อ PS" },
  password: { en: "Password", th: "รหัสผ่าน" },
  relicSet: { en: "Relic Set", th: "เซ็ตรีลิกส์" },
  relics: { en: "Relics", th: "รีลิกส์" },
  robinSr: { en: "RobinSR", th: "RobinSR" },
  save: { en: "Save", th: "บันทึก" },
  search: { en: "Search", th: "ค้นหา" },
  searchCharacter: { en: "Search Character", th: "ค้นหาตัวละคร" },
  selectAll: { en: "Select All", th: "เลือกทั้งหมด" },
  selectCharacters: { en: "Select Characters", th: "เลือกตัวละคร" },
  selectEvent: { en: "Select Event", th: "เลือกกิจกรรม" },
  selectFloor: { en: "Select Floor", th: "เลือกชั้น" },
  selectMainStat: { en: "Select Main Stat", th: "เลือกสเตตัสหลัก" },
  selectNode: { en: "Select Node", th: "เลือกโหนด" },
  selectRelic: { en: "Select Relic", th: "เลือกรีลิกส์" },
  selectSubStat: { en: "Select Sub Stat", th: "เลือกสเตตัสรอง" },
  serverUrl: { en: "Server URL", th: "URL เซิร์ฟเวอร์" },
  set: { en: "Set", th: "เซ็ต" },
  setEffects: { en: "Set Effects", th: "เอฟเฟกต์เซ็ต" },
  setTo50: { en: "Set to 50%", th: "ตั้งค่าเป็น 50%" },
  side: { en: "Side", th: "ครึ่ง" },
  speed: { en: "Speed", th: "ความเร็ว" },
  statusLabel: { en: "Status:", th: "สถานะ:" },
  stormcleanse12: { en: "Stormcleanse (XII)", th: "Stormcleanse (XII)" },
  subStat: { en: "Sub Stat", th: "สเตตัสรอง" },
  superimpositionRank: { en: "Superimposition Rank", th: "ระดับขัดเกลา" },
  unconnected: { en: "Unconnected", th: "ไม่ได้เชื่อมต่อ" },
  username: { en: "Username", th: "ชื่อผู้ใช้" },
  wave1: { en: "Wave 1", th: "เวฟ 1" },
  admin: { en: "admin", th: "admin" },
  placeholderLevel: { en: "Level", th: "เลเวล" }, // Input placeholder
};

// Update translations.ts
const translationsPath = path.join(srcDir, 'lib', 'translations.ts');
let translationsContent = fs.readFileSync(translationsPath, 'utf8');

// Find the start and end of the object
const startIdx = translationsContent.indexOf('{');
const endIdx = translationsContent.lastIndexOf('}');
const objText = translationsContent.substring(startIdx, endIdx + 1);
let existingTranslations = eval('(' + objText + ')');

for (const [key, val] of Object.entries(translations)) {
  if (!existingTranslations[key]) {
    existingTranslations[key] = val.th;
  }
}

const newContent = 'export const thTranslations: Record<string, string> = {\n' +
  Object.keys(existingTranslations).map(k => {
    const keyStr = (k.includes('-') || k.includes(' ') || k === 'true damage' || k === 'elemental damage' || k === 'follow-up') ? '"' + k + '"' : k;
    return '  ' + keyStr + ': ' + JSON.stringify(existingTranslations[k]);
  }).join(',\n') + '\n};\n';

fs.writeFileSync(translationsPath, newContent, 'utf8');
console.log('Updated translations.ts');


// Now replace in .tsx files
const files = getAllFiles(srcDir);

// Sort entries by length descending to match longer strings first
const mapEntries = Object.entries(translations).sort((a,b) => b[1].en.length - a[1].en.length);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  let changed = false;

  for (const [key, val] of mapEntries) {
    const text = val.en;
    const escapedText = text.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

    // 1. Replace >text<
    const tagRegex = new RegExp(`>(\\s*)${escapedText}(\\s*)<`, 'g');
    if (tagRegex.test(content)) {
      content = content.replace(tagRegex, `>$1{t("${key}")}$2<`);
      changed = true;
    }

    // 2. Replace placeholder="text"
    const placeholderRegex = new RegExp(`placeholder="${escapedText}"`, 'g');
    if (placeholderRegex.test(content)) {
      content = content.replace(placeholderRegex, `placeholder={t("${key}")}`);
      changed = true;
    }

    // 3. Props like label="text"
    const propRegex = new RegExp(`([a-zA-Z0-9_]+)="${escapedText}"`, 'g');
    if (propRegex.test(content)) {
        content = content.replace(propRegex, (match, propName) => {
            if (['className', 'id', 'href', 'src', 'alt', 'value', 'name', 'type', 'htmlFor'].includes(propName)) return match;
            changed = true;
            return `${propName}={t("${key}")}`;
        });
    }
  }

  if (changed) {
    if (!content.includes('useTranslation')) {
      const importStatement = `\nimport { useTranslation } from "@/src/hooks/use-translation.hook";`;
      if (content.startsWith('"use client";') || content.startsWith("'use client';")) {
          content = content.replace(/(['"]use client['"];?)/, `$1\n${importStatement}`);
      } else {
          content = importStatement + '\n' + content;
      }
    }

    if (!content.includes('const { t } = useTranslation()')) {
      // Find component body
      const functionRegex = /(const\s+[A-Z]\w*\s*=\s*(?:\([^)]*\)\s*=>\s*\{|function\s*\([^)]*\)\s*\{)|export\s+default\s+function(?:\s+[A-Z]\w*)?\s*\([^)]*\)\s*\{|function\s+[A-Z]\w*\s*\([^)]*\)\s*\{)/;
      
      const match = functionRegex.exec(content);
      if (match) {
        const insertPos = match.index + match[0].length;
        content = content.slice(0, insertPos) + '\n  const { t } = useTranslation();' + content.slice(insertPos);
      } else {
        console.log('Could not find component start in', file);
      }
    }

    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated', file);
  }
}
