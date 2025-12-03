import requests
from datetime import datetime, timezone
import os
import hashlib
import json

# Discord Webhooks จาก GitHub Secrets
webhook_urls = [
    os.environ.get("WEBHOOK1"),
 #   os.environ.get("WEBHOOK2"),
 #   os.environ.get("WEBHOOK3"),
 #   os.environ.get("WEBHOOK4"),
]

# API URL (branches API)
api_urls = [
    "https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGameBranches?game_ids[]=1Z8W5NHUQb&launcher_id=jGHBHlcOq1",
]


# ฟังก์ชันส่ง embed message
def send_embed_message(webhook_url, title, description, icon_url, bg_url, game_name):
    embed = {
        "embeds": [{
            "title": title,
            "description": description,
            "color": 16777215,
            "thumbnail": {"url": icon_url},
            "image": {"url": bg_url},
            "footer": {
                "text": f"{game_name} Update Monitor",
                "icon_url": icon_url
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    }
    requests.post(webhook_url, json=embed)


def split_and_send(webhook_url, title, lines, icon_url, bg_url, game_name):
    max_length = 1900
    message = f"**{title}**\n"
    for line in lines:
        if len(message) + len(line) + 1 > max_length:
            send_embed_message(webhook_url, title, message, icon_url, bg_url, game_name)
            message = f"**{title}**\n"
        message += line + "\n"
    if message.strip():
        send_embed_message(webhook_url, title, message, icon_url, bg_url, game_name)


# เช็คว่ามีการเปลี่ยนแปลงหรือไม่ พร้อมสร้าง log
def has_changed(api_url, game_name):
    try:
        data_text = requests.get(api_url, timeout=10).text
    except Exception as e:
        print(f"❌ Error fetching API: {e}")
        return False

    current_hash = hashlib.md5(data_text.encode()).hexdigest()

    # ใช้ absolute path จาก cwd
    log_dir = os.path.join(os.getcwd(), "log", "CNHoyo", "log", game_name)
    os.makedirs(log_dir, exist_ok=True)

    hash_file = os.path.join(log_dir, "last_hash.txt")
    raw_file = os.path.join(log_dir, "raw_log.jsonl")

    # บันทึก raw json ทุกครั้ง
    try:
        with open(raw_file, "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": json.loads(data_text)
            }, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"❌ Error writing log file: {e}")

    last_hash = ""
    if os.path.exists(hash_file):
        with open(hash_file, "r") as f:
            last_hash = f.read().strip()

    if current_hash != last_hash:
        with open(hash_file, "w") as f:
            f.write(current_hash)
        return True
    return False


# MAIN LOOP
for api_url in api_urls:
    game_name = "GI"  # ใน MiHoYo ระบบ hk4e_cn = GI CN

    try:
        if not has_changed(api_url, game_name):
            print(f"[{game_name}] No change, skipping webhook")
            continue

        # ดึงข้อมูล branches
        data = requests.get(api_url, timeout=10).json()
        branches = data["data"]["game_branches"]

        # โหลดข้อมูล game display
        game_info_url = "https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGames?launcher_id=jGHBHlcOq1"
        resp = requests.get(game_info_url).json()
        game_data = next(g for g in resp["data"]["games"] if g["id"] == "1Z8W5NHUQb")

        display_name = game_data["display"]["name"]
        icon_url = game_data["display"]["icon"]["url"]
        bg_url = game_data["display"]["background"]["url"]

        # ==========================================================
        #                   *** EXTRACT MAIN BRANCH ***
        # ==========================================================
        main_branch = next((b for b in branches if b.get("name") == "main"), None)

        if not main_branch:
            print("❌ No main branch found")
            continue

        new_version = main_branch.get("version", "Unknown")
        branch_name = main_branch.get("name", "main")

        pkg = (main_branch.get("packages") or [{}])[0]
        package_id = pkg.get("id", "None")
        password = pkg.get("password", "None")

        # ==========================================================
        #            GET OLD VERSION FROM LAST RAW LOG
        # ==========================================================
        old_version = "Unknown"
        try:
            log_dir = os.path.join(os.getcwd(), "log", "CNHoyo", "log", game_name)
            raw_file = os.path.join(log_dir, "raw_log.jsonl")

            with open(raw_file, "r", encoding="utf-8") as f:
                last = f.readlines()[-2]  # ข้อมูลก่อนหน้า
                last_json = json.loads(last)

                old_branch = next(
                    (b for b in last_json["data"]["data"]["game_branches"] if b.get("name") == "main"),
                    {}
                )
                old_version = old_branch.get("version", "Unknown")
        except:
            pass

        # ==========================================================
        #               TEXT FORMAT ที่คุณต้องการส่ง
        # ==========================================================
        lines = [
            f"Detected hk4e_cn update {old_version} -> {new_version}",
            "",
            "Branch",
            branch_name,
            "",
            "Package ID",
            str(package_id),
            "",
            "Password",
            str(password)
        ]

        title = f"{display_name} Update"

        # ส่ง webhook
        for webhook_url in webhook_urls:
            if webhook_url:
                split_and_send(webhook_url, title, lines, icon_url, bg_url, display_name)

    except Exception as e:
        print(f"❌ Exception: {e}")
        for webhook_url in webhook_urls:
            if webhook_url:
                split_and_send(webhook_url, "❌ Error", [f"[{game_name}] error: {e}"], "", "", "")

print("✅ Checked all APIs and sent updates if changed")
