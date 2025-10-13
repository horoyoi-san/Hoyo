import fs from "fs-extra";
import path from "path";
import { glob } from "glob";
import translate from "@vitalets/google-translate-api";

// ✅ นามสกุลไฟล์ที่ต้องการแปล
const extensions = [
  ".js", ".jsx", ".ts", ".tsx",
  ".json", ".html", ".vue", ".rs", ".py", ".md"
];

// ✅ ฟังก์ชันแปลข้อความ (มีระบบกัน rate limit)
async function translateText(text) {
  try {
    if (!text.trim()) return text;
    const res = await translate(text, { to: "th" });
    // หน่วงเล็กน้อยเพื่อป้องกันโดนบล็อกจาก Google
    await new Promise(r => setTimeout(r, 300));
    return res.text;
  } catch (err) {
    console.error("❌ แปลไม่สำเร็จ:", text.slice(0, 50));
    return text;
  }
}

// ✅ ฟังก์ชันแปลไฟล์
async function translateFile(filePath) {
  let content = await fs.readFile(filePath, "utf8");

  // ข้ามไฟล์ใหญ่เกินไป (>1MB)
  if (content.length > 1_000_000) {
    console.warn(`⚠️ ข้ามไฟล์ขนาดใหญ่: ${filePath}`);
    return;
  }

  // ดึงข้อความที่อยู่ใน "", '' หรือ ``
  const regex = /(["'`])((?:\\\1|.)*?)\1/g;
  const matches = [...content.matchAll(regex)];

  if (matches.length === 0) return;

  console.log(`🔠 แปลไฟล์: ${filePath} (${matches.length} ข้อความ)`);

  for (const match of matches) {
    const full = match[0];
    const text = match[2];

    // ถ้าไม่มีอักษรจีนหรืออังกฤษ ข้าม
    if (!/[a-zA-Z\u4e00-\u9fa5]/.test(text)) continue;

    const translated = await translateText(text);
    // ป้องกัน invalid string length โดยใช้ split().join()
    content = content.split(full).join(full[0] + translated + full[0]);
  }

  await fs.writeFile(filePath, content, "utf8");
  console.log("✅ แปลแล้ว:", filePath);
}

// ✅ เริ่มสแกนและแปลทั้งหมด
async function main() {
  const files = await glob("**/*.*", {
    ignore: ["**/node_modules/**", "**/.git/**"],
  });

  const targets = files.filter(f => extensions.includes(path.extname(f)));
  console.log(`🔍 พบไฟล์ ${targets.length} ไฟล์ที่ต้องแปล`);

  for (const file of targets) {
    await translateFile(file);
  }

  console.log("🎉 แปลภาษาเสร็จสมบูรณ์!");
}

main();
