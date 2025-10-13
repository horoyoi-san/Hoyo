const fs = require("fs-extra");
const path = require("path");
const glob = require("glob");
const translate = require("@vitalets/google-translate-api");

// ✅ กำหนดนามสกุลไฟล์ที่ต้องการให้แปล
const extensions = [
  ".js", ".jsx", ".ts", ".tsx",
  ".json", ".html", ".vue", ".rs", ".py", ".md"
];

// ✅ ฟังก์ชันแปลข้อความ
async function translateText(text) {
  try {
    const res = await translate(text, { to: "th" });
    return res.text;
  } catch (err) {
    console.error("❌ แปลไม่สำเร็จ:", text);
    return text;
  }
}

// ✅ ฟังก์ชันแปลไฟล์ทีละไฟล์
async function translateFile(filePath) {
  let content = await fs.readFile(filePath, "utf8");

  // จับข้อความใน "" หรือ ''
  const regex = /(["'`])((?:\\\1|.)*?)\1/g;
  const matches = [...content.matchAll(regex)];

  for (const match of matches) {
    const full = match[0];
    const text = match[2];

    // ถ้าไม่มีตัวอักษรภาษาจีนหรืออังกฤษข้ามไป
    if (!/[a-zA-Z\u4e00-\u9fa5]/.test(text)) continue;

    const translated = await translateText(text);
    content = content.replace(full, full[0] + translated + full[0]);
  }

  await fs.writeFile(filePath, content, "utf8");
  console.log("✅ แปลแล้ว:", filePath);
}

// ✅ เริ่มต้นสแกนโปรเจกต์ทั้งหมด
async function main() {
  const files = glob.sync("**/*.*", {
    ignore: ["**/node_modules/**", "**/.git/**"],
  });

  const targets = files.filter((f) => extensions.includes(path.extname(f)));

  console.log(`🔍 พบไฟล์ทั้งหมด ${targets.length} ไฟล์ที่ต้องแปล`);

  for (const file of targets) {
    await translateFile(file);
  }

  console.log("🎉 แปลภาษาเสร็จสมบูรณ์!");
}

main();
