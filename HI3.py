import requests
from datetime import datetime, timezone
import os
import hashlib
import json
import time

# Discord Webhooks
webhook_urls = [
    os.environ.get("WEBHOOK1"),
    os.environ.get("WEBHOOK2"),
    os.environ.get("WEBHOOK3"),
    os.environ.get("WEBHOOK4"),
]

# API URL + Game name
api_targets = [
    ("tw", "wkE5P5WsIf", "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=wkE5P5WsIf&launcher_id=VYTpXlbWo8"),
    ("glb", "5TIVvvcwtM", "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=5TIVvvcwtM&launcher_id=VYTpXlbWo8"),
    ("jp",  "g0mMIvshDb", "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=g0mMIvshDb&launcher_id=VYTpXlbWo8"),
    ("kr", "uxB4MC7nzC", "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=uxB4MC7nzC&launcher_id=VYTpXlbWo8"),
    ("overseas", "bxPTXSET5t", "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=bxPTXSET5t&launcher_id=VYTpXlbWo8"),
]

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
    try:
        requests.post(webhook_url, json=embed, timeout=15)
    except Exception as e:
        print(f"❌ Failed to send webhook for {game_name}: {e}")

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

def extract_game_audio(pkg):
    game_links = [p["url"] for p in pkg.get("game_pkgs", [])]
    audio_links = [f"{a['language']}: {a['url']}" for a in pkg.get("audio_pkgs", [])]
    return game_links, audio_links

def fetch_api_data(api_url, game_name):
    try:
        data_text = requests.get(api_url, timeout=30).text
        return data_text
    except Exception as e:
        print(f"❌ Error fetching API for {game_name}: {e}")
        return None

def has_changed(data_text, game_name):
    if not data_text:
        return False

    current_hash = hashlib.md5(data_text.encode()).hexdigest()

    log_dir = os.path.join(os.getcwd(), "Hoyo", "log", game_name)
    os.makedirs(log_dir, exist_ok=True)

    hash_file = os.path.join(log_dir, "last_hash.txt")
    raw_file = os.path.join(log_dir, "raw_log.jsonl")

    # บันทึก JSON ดิบทุกครั้ง (append)
    try:
        with open(raw_file, "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": json.loads(data_text)
            }, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"❌ Error writing log file for {game_name}: {e}")

    last_hash = ""
    if os.path.exists(hash_file):
        with open(hash_file, "r") as f:
            last_hash = f.read().strip()

    if current_hash != last_hash:
        with open(hash_file, "w") as f:
            f.write(current_hash)
        return True
    return False

# ---- Main loop for all APIs ----
for region, game_id, api_url in api_targets:
    game_name = region
    print(f"🔹 Processing {region} ({game_id}) → {api_url}")

    data_text = fetch_api_data(api_url, game_name)
    if not data_text:
        continue  # ข้ามถ้า fetch fail

    changed = has_changed(data_text, game_name)

    try:
        data = json.loads(data_text)
        if not data.get("data") or not data["data"].get("game_packages"):
            print(f"[{game_name}] No game_packages returned")
            continue

        game_package = data["data"]["game_packages"][0]

        # ดึงข้อมูล display
        game_info_url = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGames?launcher_id=VYTpXlbWo8"
        resp = requests.get(game_info_url, timeout=30).json()
        game_data = next((g for g in resp["data"]["games"] if g["id"] == game_id), None)
        if not game_data:
            print(f"[{game_name}] display info not found")
            continue

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

        # ส่ง webhook เฉพาะถ้า changed
        if changed:
            for webhook_url in webhook_urls:
                if webhook_url:
                    for title, lines in game_data_list:
                        split_and_send(webhook_url, title, lines, icon_url, bg_url, display_name)
        else:
            print(f"[{game_name}] No change detected, webhook skipped")

        # delay นิดหน่อยกัน rate-limit
        time.sleep(1)

    except Exception as e:
        print(f"❌ Exception for {game_name}: {e}")
        for webhook_url in webhook_urls:
            if webhook_url:
                split_and_send(webhook_url, "❌ Error", [f"[{game_name}] error: {e}"], "", "", "")

print("✅ Checked all APIs and sent updates if changed")
