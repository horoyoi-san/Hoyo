import requests
from datetime import datetime, timezone
import os
import hashlib
import json
import time

# ===================== Discord Webhooks =====================
webhook_urls = [
    os.environ.get("WEBHOOK1"),
    os.environ.get("WEBHOOK2"),
    os.environ.get("WEBHOOK3"),
    os.environ.get("WEBHOOK4"),
]

# ===================== API =====================
def get_branch_api_url(game_id: str) -> str:
    return (
        "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGameBranches"
        f"?game_ids[]={game_id}&launcher_id=VYTpXlbWo8"
    )
GAME_INFO_URL = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGames?launcher_id=VYTpXlbWo8"

# ===================== Games =====================
GAMES = [
    {"id": "wkE5P5WsIf", "region": "tw"},
    {"id": "5TIVvvcwtM", "region": "glb"},
    {"id": "g0mMIvshDb", "region": "jp"},
    {"id": "uxB4MC7nzC", "region": "kr"},
    {"id": "bxPTXSET5t", "region": "overseas"},
]
GAME_NAME = "HI3Branches"

# ===================== Discord Embed =====================
def send_embed_message(webhook_url, title, description, icon_url, bg_url, footer_text):
    payload = {
        "embeds": [{
            "title": title,
            "description": description,
            "color": 16776960,
            "thumbnail": {"url": icon_url} if icon_url else None,
            "image": {"url": bg_url} if bg_url else None,
            "footer": {"text": footer_text},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    }
    requests.post(webhook_url, json=payload, timeout=10)

def split_and_send(webhook_url, title, lines, icon_url, bg_url, footer_text):
    max_length = 1800
    message = ""

    for line in lines:
        if len(message) + len(line) + 1 > max_length:
            send_embed_message(webhook_url, title, message, icon_url, bg_url, footer_text)
            time.sleep(0.5)
            message = ""
        message += line + "\n"

    if message.strip():
        send_embed_message(webhook_url, title, message, icon_url, bg_url, footer_text)

# ===================== Change Detection =====================
def has_changed(api_url, log_name):
    log_dir = os.path.join(os.getcwd(), "log", "CNHoyo", "log", log_name)
    os.makedirs(log_dir, exist_ok=True)

    raw_file = os.path.join(
        log_dir,
        f"raw_{datetime.now(timezone.utc).date()}.jsonl"
    )
    hash_file = os.path.join(log_dir, "last_hash.txt")

    try:
        r = requests.get(api_url, timeout=10)
        r.raise_for_status()
        data_text = r.text
        data_json = json.loads(data_text)
    except Exception as e:
        # ❗ error ก็ยัง log
        with open(raw_file, "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "error": str(e)
            }, ensure_ascii=False) + "\n")

        print("❌ API error but log written")
        return False

    # log ปกติ
    with open(raw_file, "a", encoding="utf-8") as f:
        f.write(json.dumps({
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": data_json
        }, ensure_ascii=False) + "\n")

    current_hash = hashlib.md5(data_text.encode()).hexdigest()

    last_hash = ""
    if os.path.exists(hash_file):
        with open(hash_file, "r") as f:
            last_hash = f.read().strip()

    if current_hash != last_hash:
        with open(hash_file, "w") as f:
            f.write(current_hash)
        return True

    return False


# ===================== Extract Branch Data =====================
def extract_game_branches(data):
    lines = []
    branch = data["data"]["game_branches"][0]

    main = branch.get("main")
    if main:
        lines += [
            "**Main Branch**",
            f"Tag: `{main['tag']}`",
            f"Package ID: `{main['package_id']}`",
            f"Diff from: `{', '.join(main.get('diff_tags', []))}`",
            f"Password: `{main['password']}`",
            ""
        ]

    pre = branch.get("pre_download")
    if pre:
        lines += [
            "**Pre-Download Branch**",
            f"Tag: `{pre['tag']}`",
            f"Package ID: `{pre['package_id']}`",
            f"Diff from: `{', '.join(pre.get('diff_tags', []))}`",
            f"Password: `{pre['password']}`"
        ]

    return lines

# ===================== Game Display Info =====================
resp = requests.get(GAME_INFO_URL, timeout=10).json()

GAME_DISPLAY_MAP = {
    g["id"]: {
        "name": g["display"]["name"],
        "icon": g["display"]["icon"]["url"],
        "bg": g["display"]["background"]["url"],
    }
    for g in resp["data"]["games"]
}

# ===================== Branch Update =====================
for game in GAMES:
    game_id = game["id"]
    region = game["region"]

    api_url = get_branch_api_url(game_id)
    log_name = f"{GAME_NAME}_{region}"

    try:
        if has_changed(api_url, log_name):
            data = requests.get(api_url, timeout=10).json()
            lines = extract_game_branches(data)

            for webhook in webhook_urls:
                if webhook:
                    split_and_send(
                        webhook,
                        f"{display['name']} ({region.upper()}) Branch Update",
                        lines,
                        display["icon"],
                        display["bg"],
                        f"{display['name']} Branch Monitor"
                    )
        else:
            print(f"[{log_name}] No change")

    except Exception as e:
        print(f"❌ Branch Error [{region}]: {e}")

print("✅ Finished checking Branch API")
