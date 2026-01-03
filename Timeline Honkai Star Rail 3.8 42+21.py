from datetime import datetime, timedelta

# ================== กำหนดวันเริ่มต้น ==================
start_dates = {
    "Drip": datetime(2025, 12, 30, 11, 0),
    "Beta": datetime(2026, 1, 6, 10, 0),
    "Release": datetime(2026, 2, 18, 10, 0)
}

start_version = 4.0
end_version = 15.0

# ================== ระยะห่าง ==================
drip_interval_days = 42
beta_interval_days = 42
release_after_beta_days = 42

# ================== ฟอร์แมตวันภาษาไทย ==================
def format_date_th(dt):
    days_th = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"]
    months_th = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
                 "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
    return (
        f"วัน{days_th[dt.weekday()]}ที่ {dt.day} {months_th[dt.month - 1]} "
        f"{dt.year + 543} {dt.hour:02d}:{dt.minute:02d}"
    )

# ================== ตัวแปรเริ่มต้น ==================
current_drip = start_dates["Drip"]
current_beta = start_dates["Beta"]
current_release = start_dates["Release"]

version_dates = {}

version = start_version
while version <= end_version:
    # ข้าม .9
    if round(version * 10) % 10 != 9:
        key = f"{version:.1f}"

     #   current_beta = current_drip + timedelta(days=drip_interval_days)
     #   current_release = current_beta + timedelta(days=release_after_beta_days)

        version_dates[key] = {
            "Drip": current_drip,
            "Beta": current_beta,
            "Release": current_release
        }

        # ขยับรอบถัดไป
        current_drip += timedelta(days=drip_interval_days)
        current_beta += timedelta(days=beta_interval_days)
        current_release += timedelta(days=release_after_beta_days)

    version = round(version + 0.1, 1)

# ================== แสดงผล ==================
markdown_lines = []

for ver, dates in version_dates.items():
    drip_ts = int(dates["Drip"].timestamp())
    beta_ts = int(dates["Beta"].timestamp())
    release_ts = int(dates["Release"].timestamp())

    markdown_lines.append(f"Honkai Star Rail {ver}")
    markdown_lines.append(f" - Version {ver} Drip: <t:{drip_ts}:R> | <t:{drip_ts}:F> | {format_date_th(dates['Drip'])}")
    markdown_lines.append(f" - Version {ver} Beta: <t:{beta_ts}:R> | <t:{beta_ts}:F> | {format_date_th(dates['Beta'])}")
    markdown_lines.append(f" - Version {ver} Release: <t:{release_ts}:R> | <t:{release_ts}:F> | {format_date_th(dates['Release'])}")
    markdown_lines.append("")

print("\n".join(markdown_lines))
