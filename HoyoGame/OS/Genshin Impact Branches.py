import requests
import json
import os
from datetime import datetime, timezone

API_URL = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGameBranches?game_ids[]=gopR6Cufr3&launcher_id=VYTpXlbWo8"
GAME_INFO_URL = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGames?launcher_id=VYTpXlbWo8"

# ================= Webhook =================
webhook_urls = [
    os.environ.get("WEBHOOK1"),
    os.environ.get("WEBHOOK2"),
    os.environ.get("WEBHOOK3"),
    os.environ.get("WEBHOOK4"),
]

LOG_DIR = "log/OSHoyo/log/GIBranches"
os.makedirs(LOG_DIR, exist_ok=True)

RAW_LOG_PATH = f"{LOG_DIR}/raw_log.jsonl"
CACHE_PATH = f"{LOG_DIR}/version_cache.json"


# Load cache
def load_cache():
    if not os.path.exists(CACHE_PATH):
        return {}
    with open(CACHE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


# Save cache
def save_cache(data):
    with open(CACHE_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)


# ================= Embed Sender =================
def send_embed(title, desc, icon_url, bg_url, game_name, color=0xffffff):
    embed = {
        "embeds": [
            {
                "title": title,
                "description": desc,
                "color": color,
                "thumbnail": {"url": icon_url},
                "image": {"url": bg_url},
                "footer": {
                    "text": f"{game_name} | Branch Monitor",
                    "icon_url": icon_url
                },
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        ]
    }

    for url in webhook_urls:
        if url:
            try:
                requests.post(url, json=embed)
            except:
                pass


# ==================================================
# MAIN
# ==================================================
def check_branch():
    # ----- ดึงข้อมูลเกมเพื่อเอา icon / bg -----
    game_info = requests.get(GAME_INFO_URL).json()
    game_data = next(g for g in game_info["data"]["games"] if g["id"] == "gopR6Cufr3")

    display_name = game_data["display"]["name"]
    icon_url = game_data["display"]["icon"]["url"]
    bg_url = game_data["display"]["background"]["url"]

    # ----- ดึง branch -----
    resp = requests.get(API_URL, timeout=10)
    data = resp.json()

    # raw log
    with open(RAW_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False) + "\n")

    game_list = data.get("data", {}).get("game_branches", [])

    if not game_list:
        send_embed("❌ Error", "API returned no game_branches", icon_url, bg_url)
        return

    cache = load_cache()

    # ----- Loop main branch -----
    for item in game_list:
        game = item.get("game", {})
        main = item.get("main")

        game_name = game.get("biz", "unknown")
        game_id = game.get("id")

        if not main:
            send_embed("❌ Error", "No 'main' branch found in API", icon_url, bg_url)
            continue

        # Extract data
        new_ver = main.get("tag", "")
        diff_tags = main.get("diff_tags", [])
        old_ver = diff_tags[0] if diff_tags else "unknown"

        package_id = main.get("package_id", "")
        password = main.get("password", "")
        branch = main.get("branch", "main")

        last_ver = cache.get(game_id)

        # หากเวอร์ชันเปลี่ยน = ส่ง webhook
        if last_ver != new_ver:
            cache[game_id] = new_ver
            save_cache(cache)

            desc = (
                f"**{game_name} update `{old_ver}` → `{new_ver}`**\n\n"
                f"**Branch:** `{branch}`\n"
                f"**Package ID:** `{package_id}`\n"
                f"**Password:** `{password}`"
            )

            send_embed(
                f"{display_name} Branch Update",
                desc,
                icon_url,
                bg_url,
                game_name
            )


# Run
if __name__ == "__main__":
    check_branch()
