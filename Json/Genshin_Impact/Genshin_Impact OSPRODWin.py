import requests
import time
import json
import logging
from datetime import datetime, timezone  # เพิ่ม timezone ที่นี่



# Webhook
webhook_urls = {
   # "Predownload": 'YOUR_DISCORD_WEBHOOK_URL',
 #   "OSPRODWin": 'YOUR_DISCORD_WEBHOOK_URL',
   # "OSPRODWin-2": 'YOUR_DISCORD_WEBHOOK_URL',
    "Teat": 'YOUR_DISCORD_WEBHOOK_URL'
}

# Log setup
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s', handlers=[logging.StreamHandler()])

# เก็บข้อมูลล่าสุด
last_data = {
    "launcher": None,
    "game": None
}

# URLs ที่จะตรวจสอบ
url_1 = ""
url_2 = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids%5B%5D=gopR6Cufr3&launcher_id=VYTpXlbWo8"

# แบ่งข้อความให้อยู่ในขีดจำกัดของ Discord
# แบ่งข้อความให้อยู่ในขีดจำกัดของ Discord
# ส่งข้อมูลไปยัง Discord
# ส่งข้อมูลไปยัง Discord
def send_to_discord(source, content):
    for name, webhook_url in webhook_urls.items():
        try:
            pretty_content = json.dumps(json.loads(content), indent=4, ensure_ascii=False)
            chunks = split_text(pretty_content, max_total=50000)

            embeds = []
            for chunk in chunks:
                # ตรวจสอบขนาดของ embed ก่อนเพิ่ม
                if len(chunk) <= 6000:
                    embeds.append({
                        "title": f"{name} - Genshin Impact OS PROD {source}" if len(embeds) == 0 else None,
                        "description": f"```json\n{chunk}\n```",
                        "color": 0x00ecff,
                        "footer": {
                            "text": "Genshin Impact Update Monitor",
                            "icon_url": "https://cdn.discordapp.com/emojis/1065830078086393876.webp?size=96"
                        } if len(embeds) == len(chunks) - 1 else None,
                        "timestamp": datetime.now(timezone.utc).isoformat() if len(embeds) == 0 else None
                    })
                else:
                    logging.error(f"❌ ข้อความเกินขีดจำกัดที่ Discord กำหนด: {len(chunk)}")
            
            # ตรวจสอบการส่งข้อมูล
            if embeds:
                for embed in embeds:
                    if len(json.dumps(embed)) <= 6000:
                        response = requests.post(webhook_url, json={"username": "Genshin Impact Monitor", "embeds": [embed]})
                        if response.status_code == 6000 or response.status_code == 204:
                            logging.info(f"✅ ส่งสำเร็จไปยัง {name} ({source})")
                        else:
                            logging.error(f"❌ ล้มเหลว ({response.status_code}) สำหรับ {name} ({source}) - {response.text}")
                    else:
                        logging.error(f"❌ ข้อความ embed เกินขีดจำกัด: {len(json.dumps(embed))}")

        except Exception as e:
            logging.error(f"❗ ข้อผิดพลาดในการส่งข้อมูลไปยัง {name} ({source}): {e}")

# แบ่งข้อความให้อยู่ในขีดจำกัดของ Discord
def split_text(text, max_total=50000, max_each=4096):
    parts = []
    current = ""
    for line in text.splitlines(keepends=True):
        if len(current) + len(line) <= max_each:
            current += line
        else:
            parts.append(current)
            current = line
        # เพิ่มการตรวจสอบว่าแต่ละข้อความที่รวมกันไม่เกิน max_total
        if sum(len(part) for part in parts) + len(current) >= max_total:
            break
    if current:
        parts.append(current)
    return parts


# ตรวจสอบการอัปเดต
def check_update():
    global last_data

    for label, url in [("launcher", url_1), ("game", url_2)]:
        try:
            res = requests.get(url)
            if res.status_code == 200:
                content = res.text.strip()
                if content != last_data[label]:
                    last_data[label] = content
                    logging.info(f"🟢 ตรวจพบการเปลี่ยนแปลงจาก {label}")
                    send_to_discord(label, content)
                else:
                    logging.info(f"🟡 ไม่มีการเปลี่ยนแปลงจาก {label}")
            else:
                logging.error(f"🔴 ดึงข้อมูลล้มเหลวจาก {label}: {res.status_code}")
        except requests.exceptions.RequestException as e:
            logging.error(f"❗ เกิดข้อผิดพลาดจาก {label}: {e}")
            time.sleep(5)

# วนลูปทุก 60 วินาที
while True:
    check_update()
    time.sleep(60)
