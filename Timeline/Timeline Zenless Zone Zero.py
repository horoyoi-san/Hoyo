from datetime import datetime, timedelta

# กำหนดวันเริ่มต้น Beta และ Release (ตัวอย่าง)
start_dates = {
    "Beta": datetime(2025, 10, 13, 10, 0),     # 28 ส.ค. 2024 10:00
    "Release": datetime(2025, 11, 26, 10, 0)   # 9 ต.ค. 2024 10:00
}

start_version = 2.4
end_version = 8.0

# ปรับระยะห่างวันของแต่ละช่วง (กำหนดได้ตามต้องการ)
beta_interval_days = 42          # ระยะห่าง Beta-to-Beta
release_interval_days = 42       # ระยะห่าง Release-to-Release
# release_after_beta_days = 39     # ระยะห่าง Release หลัง Beta (ถ้าต่างจาก beta_interval_days)

# ฟังก์ชันแปลงวันที่เป็นรูปแบบภาษาไทย (ตัวอย่าง)
def format_date_th(dt):
    days_th = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]
    months_th = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
                 "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
    day_name = days_th[dt.weekday()]
    day = dt.day
    month = months_th[dt.month - 1]
    year = dt.year + 543  # ค.ศ. -> พ.ศ.
    hour = dt.hour
    minute = dt.minute
    return f"วัน{day_name}ที่ {day} {month} {year} {hour:02d}:{minute:02d}"

# เก็บผลลัพธ์
version_dates = {}

current_beta = start_dates["Beta"]
current_release = start_dates["Release"]
# Release เริ่มต้นอาจจะต่างจาก Beta ตามระยะห่างที่กำหนด
# current_release = current_beta + timedelta(days=release_after_beta_days)

version = start_version
while version <= end_version:
    # ข้ามเวอร์ชัน .9 ตามคำขอ
    if round(version * 10) % 10 != 9:
        key = f"{version:.1f}"
        version_dates[key] = {
            "Beta": current_beta,
            "Release": current_release
        }
        # เลื่อนวัน Beta และ Release สำหรับเวอร์ชันถัดไป
        current_beta += timedelta(days=beta_interval_days)
        current_release += timedelta(days=release_interval_days)
    version = round(version + 0.1, 1)

# แปลงเป็นข้อความ Markdown พร้อมวันที่ภาษาไทย
markdown_lines = []
for ver, dates in version_dates.items():
    beta_str = format_date_th(dates["Beta"])
    release_str = format_date_th(dates["Release"])
    beta_ts = int(dates["Beta"].timestamp())
    release_ts = int(dates["Release"].timestamp())
    markdown_lines.append(f"Zenless Zone Zero {ver}")
    markdown_lines.append(f"Version {ver} Beta: <t:{beta_ts}:R> | <t:{beta_ts}:F> | {beta_str}")
    markdown_lines.append(f"Version {ver}: <t:{release_ts}:R> | <t:{release_ts}:F> | {release_str}")
    markdown_lines.append("")  # ว่างบรรทัดเว้นบรรทัด

markdown_text = "\n".join(markdown_lines)
print(markdown_text)
