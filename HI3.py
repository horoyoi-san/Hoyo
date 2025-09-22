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

# API URL + Game name
api_targets = [
    ("tw", "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=wkE5P5WsIf&launcher_id=VYTpXlbWo8"),
    ("glb", "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=5TIVvvcwtM&launcher_id=VYTpXlbWo8"),
    ("jp",  "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=g0mMIvshDb&launcher_id=VYTpXlbWo8"),
    ("kr", "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=uxB4MC7nzC&launcher_id=VYTpXlbWo8"),
    ("overseas", "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=bxPTXSET5t&launcher_id=VYTpXlbWo8"),
]

# ฟังก์ชันส่ง embed message
def send_embed_message(webhook_url, title, description, icon_url, bg_url, game_name):
    embed = {
        "embeds": [{
            "title": title,
            "description": description,
            "color": 16776960,
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

# ฟังก์ชันแยก Game และ Audio
def extract_game_audio(pkg):
    game_links = [p["url"] for p in pkg.get("game_pkgs", [])]
    audio_links = [f"{a['language']}: {a['url']}" for a in pkg.get("audio_pkgs", [])]
    return game_links, audio_links

# ตรวจสอบการเปลี่ยนแปลง (เก็บไฟล์ตามโฟลเดอร์ log/{game_name}/last_hash.txt)
def has_changed(api_url, game_name):
    data_text = requests.get(api_url, timeout=10).text
    current_hash = hashlib.md5(data_text.encode()).hexdigest()

    log_dir = f"log/{game_name}"
    os.makedirs(log_dir, exist_ok=True)
    hash_file = os.path.join(log_dir, "last_hash.txt")
    raw_file = os.path.join(log_dir, "raw_log.jsonl")  # append แบบ JSON lines

    # บันทึก JSON ดิบทุกครั้ง (append)
    with open(raw_file, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": json.loads(data_text)
        }, ensure_ascii=False) + "\n")

    last_hash = ""
    if os.path.exists(hash_file):
        with open(hash_file, "r") as f:
            last_hash = f.read().strip()

    if current_hash != last_hash:
        with open(hash_file, "w") as f:
            f.write(current_hash)
        return True
    return False

# Main loop สำหรับทุก API
for api_url in api_urls:
    game_name = "HSR"
    try:
        if not has_changed(api_url, game_name):
            print(f"[{game_name}] No change, skipping webhook")
            continue

        data = requests.get(api_url, timeout=10).json()
        game_package = data["data"]["game_packages"][0]

        # ดึงข้อมูล display
        game_info_url = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGames?launcher_id=VYTpXlbWo8"
        resp = requests.get(game_info_url).json()
        game_data = next(g for g in resp["data"]["games"] if g["id"] == "5TIVvvcwtM")
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
                    split_and_send(webhook_url, title, lines, icon_url, bg_url, display_name)

    except Exception as e:
        for webhook_url in webhook_urls:
            if webhook_url:
                split_and_send(webhook_url, "❌ Error", [f"[{game_name}] error: {e}"], "", "", "")

print("✅ Checked all APIs and sent updates if changed")
