import requests
import time
import re
import os
from collections import defaultdict

WEBHOOK_URL = "YOUR_DISCORD"

# =========================
# แหล่งข้อมูล
# =========================

# ถ้ามี URL จะดึงจาก URL ก่อน
DATA_URL = ""

# ถ้า URL ใช้ไม่ได้ จะ fallback มาอ่านไฟล์ txt
DATA_FILE = "data/hk4e.txt"

PURPLE = 0xFFFFFF

GIF_URL = "https://images-ext-1.discordapp.net/external/Ty1nmYRgmAvS9AD8o2sJ0W6RLmbp-kkPu12pCm_vr10/https/media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbG95NHBod3ozcDVkdWRnd2VsMDN4bnp2ZTVtbHM0ajloeTI5MTVrZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BTkUjxUFJckFGJEPIK/giphy.gif"

EMBED_LIMIT = 4096

# =========================
# โหลดข้อมูล
# =========================

text = ""

# 1) พยายามดึงจาก URL ก่อน
if DATA_URL:
    try:
        print("Loading data from URL...")

        resp = requests.get(DATA_URL, timeout=15)
        resp.raise_for_status()

        text = resp.text.strip()

        print("Loaded data from URL")

    except Exception as e:
        print(f"Failed to load URL: {e}")

# 2) ถ้า URL ใช้ไม่ได้ -> อ่านจากไฟล์ txt
if not text:
    try:
        print("Loading data from local file...")

        with open(DATA_FILE, "r", encoding="utf-8") as f:
            text = f.read().strip()

        print("Loaded data from local file")

    except Exception as e:
        print(f"Failed to load local file: {e}")
        raise SystemExit("No data source available.")

# =========================
# แยก block ต่อเวอร์ชัน
# =========================

blocks = re.split(r"\n(?=Genshin Impact \d+\.\d)", text)
blocks = [b.strip() for b in blocks if b.strip()]

# =========================
# Group ตาม major version
# =========================

groups = defaultdict(list)

for block in blocks:
    m = re.search(r"Genshin Impact (\d+)\.(\d+)", block)

    if not m:
        continue

    major = int(m.group(1))
    minor = int(m.group(2))

    groups[major].append((minor, block))

# =========================
# สร้าง Embed
# =========================

for major in sorted(groups.keys()):
    versions = sorted(groups[major], key=lambda x: x[0])

    current_desc = ""
    embeds_to_send = []

    for _, block in versions:
        candidate = block + "\n\n"

        if len(current_desc) + len(candidate) > EMBED_LIMIT:
            embeds_to_send.append(current_desc.rstrip())
            current_desc = candidate
        else:
            current_desc += candidate

    if current_desc.strip():
        embeds_to_send.append(current_desc.rstrip())

    # =========================
    # ส่ง Embed
    # =========================

    for desc in embeds_to_send:
        payload = {
            "embeds": [
                {
                    "title": f"Genshin Impact Timeline (STC) ({major}.0)",
                    "description": desc,
                    "color": PURPLE,
                    "image": {
                        "url": GIF_URL
                    }
                }
            ]
        }

        try:
            response = requests.post(WEBHOOK_URL, json=payload)
            response.raise_for_status()

            print(f"Sent embed for {major}.0")

        except Exception as e:
            print(f"Failed to send webhook: {e}")

        time.sleep(1)  # กัน rate limit