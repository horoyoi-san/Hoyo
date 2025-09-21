import requests
from datetime import datetime, timezone
import os
import hashlib

# ✅ Discord Webhooks จาก GitHub Secrets
webhook_urls = [
    os.environ.get("WEBHOOK1"),
    os.environ.get("WEBHOOK2"),
    os.environ.get("WEBHOOK3"),
    os.environ.get("WEBHOOK4"),
]

# ✅ รายชื่อเกม + game_id
api_targets = [
    ("tw", "wkE5P5WsIf"),
    ("glb", "5TIVvvcwtM"),
    ("jp", "g0mMIvshDb"),
    ("kr", "uxB4MC7nzC"),
    ("overseas", "bxPTXSET5t"),
    ("GI", "gopR6Cufr3"),
    ("HSR", "4ziysqXOQ8"),
    ("HNA", "4qvmDrMwKS"),
    ("ZZZ", "U5hbdsT9W7"),
]

import requests
from datetime import datetime, timezone
import os
import hashlib
import json

# Discord Webhooks จาก GitHub Secrets
webhook_urls = [
    os.environ.get("WEBHOOK1"),
    os.environ.get("WEBHOOK2"),
    os.environ.get("WEBHOOK3"),
    os.environ.get("WEBHOOK4"),
]

# API URL + Game IDs
api_targets = [
    ("Zenless Zone Zero", "U5hbdsT9W7"),
    ("Genshin Impact", "gopR6Cufr3"),
    ("Honkai: Star Rail", "4ziysqXOQ8"),
    ("Honkai Nexus Anima", "4qvmDrMwKS"),
    ("Honkai Impact 3rd tw", "wkE5P5WsIf"),
    ("Honkai Impact 3rd glb", "5TIVvvcwtM"),
    ("Honkai Impact 3rd jp", "g0mMIvshDb"),
    ("Honkai Impact 3rd kr", "uxB4MC7nzC"),
    ("Honkai Impact 3rd overseas", "bxPTXSET5t"),
]

# Mapping สีแต่ละเกม (RGB -> Decimal)
GAME_COLORS = {
    "U5hbdsT9W7": 0xFF9900,   # ZZZ ส้ม
    "gopR6Cufr3": 0xF3F3F3,   # Genshin ขาว
    "4ziysqXOQ8": 0xE800FF,   # Star Rail ชมพู
    "4qvmDrMwKS": 0x00FFFF,   # Honkai Nexus Anima ฟ้า
    "5TIVvvcwtM": 0xE4FF00,   # HI3 มเหลือง
}

# ฟังก์ชันส่ง embed message
def send_embed_message(webhook_url, title, description, icon_url, bg_url, game_name, game_id):
    color = GAME_COLORS.get(game_id, 0xFFFFFF)  # ถ้าไม่มีใช้สีขาว
    embed = {
        "embeds": [{
            "title": title,
            "description": description,
            "color": color,
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

def split_and_send(webhook_url, title, lines, icon_url, bg_url, game_name, game_id):
    max_length = 1900
    message = f"**{title}**\n"
    for line in lines:
        if len(message) + len(line) + 1 > max_length:
            send_embed_message(webhook_url, title, message, icon_url, bg_url, game_name, game_id)
            message = f"**{title}**\n"
        message += line + "\n"
    if message.strip():
        send_embed_message(webhook_url, title, message, icon_url, bg_url, game_name, game_id)

# ฟังก์ชันแยก Game และ Audio
def extract_game_audio(pkg):
    game_links = [p["url"] for p in pkg.get("game_pkgs", [])]
    audio_links = [f"{a['language']}: {a['url']}" for a in pkg.get("audio_pkgs", [])]
    return game_links, audio_links

# ตรวจสอบการเปลี่ยนแปลง
def has_changed(api_url, game_name):
    data_text = requests.get(api_url, timeout=10).text
    current_hash = hashlib.md5(data_text.encode()).hexdigest()

    log_dir = f"log/{game_name}"
    os.makedirs(log_dir, exist_ok=True)
    hash_file = os.path.join(log_dir, "last_hash.txt")
    raw_file = os.path.join(log_dir, "raw.json")

    with open(raw_file, "w", encoding="utf-8") as f:
        f.write(data_text)

    last_hash = ""
    if os.path.exists(hash_file):
        with open(hash_file, "r") as f:
            last_hash = f.read().strip()

    if current_hash != last_hash:
        with open(hash_file, "w") as f:
            f.write(current_hash)
        return True
    return False


# Main loop
for game_name, game_id in api_targets:
    api_url = f"https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]={game_id}&launcher_id=VYTpXlbWo8"

    try:
        if not has_changed(api_url, game_name):
            print(f"[{game_name}] No change, skipping webhook")
            continue

        data = requests.get(api_url, timeout=10).json()
        game_package = data["data"]["game_packages"][0]

        # ดึงข้อมูล display
        game_info_url = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGames?launcher_id=VYTpXlbWo8"
        resp = requests.get(game_info_url).json()
        game_data = next(g for g in resp["data"]["games"] if g["id"] == game_id)
        display_name = game_data["display"]["name"]
        icon_url = game_data["display"]["icon"]["url"]
        bg_url = game_data["display"]["background"]["url"]

        game_data_list = []

        # Main Version
        version = game_package["main"]["major"]["version"]
        main_game, main_audio = extract_game_audio(game_package["main"]["major"])
        combined_main = [f"version: {version}"] + main_game + ["", " Audio Packages:"] + main_audio
        game_data_list.append((display_name, combined_main))

        # Main Patches
        for patch in game_package["main"].get("patches", []):
            patch_version = patch["version"]
            game, audio = extract_game_audio(patch)
            combined_patch = [f"patch-version: {patch_version}"] + game + ["", " Audio Packages:"] + audio
            game_data_list.append((f"{display_name} {patch_version} - Hdiff", combined_patch))

        # Pre-Download Major
        pre = game_package.get("pre_download", {})
        pre_major = pre.get("major")
        if pre_major:
            pre_version = pre_major["version"]
            pre_game, pre_audio = extract_game_audio(pre_major)
            combined_pre = [f"PRE-version: {pre_version}"] + pre_game + ["", " Audio Packages:"] + pre_audio
            game_data_list.append((f"{display_name} Pre-Download", combined_pre))

        # Pre-Download Patches
        for patch in pre.get("patches", []):
            patch_version = patch["version"]
            game, audio = extract_game_audio(patch)
            combined_pre_patch = [f"Pre-Patch version: {patch_version}"] + game + ["", " Audio Packages:"] + audio
            game_data_list.append((f"{display_name} Pre-Download {patch_version} - Hdiff", combined_pre_patch))

        # ส่ง webhook
        for webhook_url in webhook_urls:
            if webhook_url:
                for title, lines in game_data_list:
                    split_and_send(webhook_url, title, lines, icon_url, bg_url, display_name, game_id)

    except Exception as e:
        for webhook_url in webhook_urls:
            if webhook_url:
                split_and_send(webhook_url, "❌ Error", [f"[{game_name}] error: {e}"], "", "", "", game_id)

print("✅ Checked all APIs and sent updates if changed")
