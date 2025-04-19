import requests
import time
import json
import base64
from datetime import datetime

# Webhook
webhook_urls = {
    "Beta": 'https://discord.com/api/webhooks/1288821857469988965/zLuca-BLv_K1OwlSDh-zPhKw4W8yhI13uNHJkbVY-wG8I4aEG0wIF8m2RyGWPV5BT41M',
    "Beta": 'https://discord.com/api/webhooks/1290276844213506098/GUgxJKlfomvt90B_kgaZmOunWiAQ6qHkOc8BuvQXHenMyeJpA6PsyTfshHslY_VjUoJp',
    "Teat": 'https://discord.com/api/webhooks/1291725154937999444/CeBZotZNDREE7KM7mFx7DJ--Z2TD8tKKmfgZ8gqPUrLs2Bs2rALXjm6HPqv_VKNxGfQJ'
}

# เก็บข้อมูลล่าสุด
last_data = None

# URL ที่จะตรวจสอบ
urls = {
    "CNBETAAndroid": "https://globaldp-beta-cn01.bhsr.com/query_dispatch?version=CNBETAAndroid3.2.51&t=1684554883&language_type=1&platform_type=3&channel_id=1&sub_channel_id=1&is_new_format=1",
    "OSBETAAndroid": "https://globaldp-beta-os01.starrails.com/query_dispatch?version=OSBETAAndroid3.2.51&t=1684554883&language_type=1&platform_type=3&channel_id=1&sub_channel_id=1&is_new_format=1",
    "CNBETAWin": "https://beta-release01-cn.bhsr.com/query_gateway?version=CNBETAWin3.2.51&platform_type=1&language_type=3&dispatch_seed=1&channel_id=1&sub_channel_id=1&is_need_url=1",
    "OSBETAWin": "https://beta-release01-asia.starrails.com/query_gateway?version=OSBETAWin3.2.51&platform_type=1&language_type=3&dispatch_seed=1&channel_id=1&sub_channel_id=1&is_need_url=1"
}

def decode_data(raw_data):
    try:
        decoded_bytes = base64.b64decode(raw_data)
        decoded_text = decoded_bytes.decode('utf-8', errors='ignore')
        return decoded_text
    except Exception as e:
        return f"Decode Error: {e}"

def send_to_discord(content):
    for name, url in webhook_urls.items():
        webhook_data = {
            "embeds": [
                {
                    "title": f"{name} - Honkai Star Rail Beta!",
                    "description": f"\n\n```{content[:1900]}```",
                    "color": 0x00ecff,
                    "thumbnail": {
                        "url": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQjrW-mmUV0hEgI-5KN7jDZtrqweYaPssBIEw&s"
                    },
                    "image": {
                        "url": "https://upload-os-bbs.hoyolab.com/upload/2024/02/04/addec2d24a1f50df8d94fec2c70705f1_8863127393982078625.png?x-oss-process=image%2Fresize%2Cs_1000%2Fauto-orient%2C0%2Finterlace%2C1%2Fformat%2Cwebp%2Fquality%2Cq_70"
                    },
                    "footer": {
                        "text": "Honkai Star Rail Update Monitor",
                        "icon_url": "https://cdn.discordapp.com/emojis/1065830078086393876.webp?size=96"
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
            ]
        }

        response = requests.post(url, json=webhook_data)
        if response.status_code == 204:
            print(f"✅ ส่งสำเร็จไปยัง {name}")
        else:
            print(f"❌ ล้มเหลว ({response.status_code}) สำหรับ {name}")

last_data = {}
def check_update():
    global last_data
    for name, url in urls.items():
        try:
            res = requests.get(url)
            if res.status_code == 200:
                raw = res.content
                if last_data.get(name) != raw:
                    last_data[name] = raw
                    decoded = decode_data(raw)
                    print(f"🟢 [{name}] พบการเปลี่ยนแปลง ส่งไปยัง Discord")
                    send_to_discord(f"[{name}]\n\n{decoded}")
                else:
                    print(f"🟡 [{name}] ไม่มีการเปลี่ยนแปลง")
            else:
                print(f"🔴 [{name}] ดึงข้อมูลล้มเหลว: {res.status_code}")
        except Exception as e:
            print(f"เกิดข้อผิดพลาดจาก [{name}]: {e}")

# วนลูปทุก 60 วินาที
while True:
    check_update()
    time.sleep(60)
