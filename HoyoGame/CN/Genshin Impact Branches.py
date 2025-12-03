import requests
import json
import os

API_URL = "https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGameBranches?game_ids[]=1Z8W5NHUQb&launcher_id=jGHBHlcOq1"

# ================= Webhook =================
webhook_urls = [
    os.environ.get("WEBHOOK1"),
   # os.environ.get("WEBHOOK2"),
   # os.environ.get("WEBHOOK3"),
   # os.environ.get("WEBHOOK4"),
]

LOG_DIR = "log/CNHoyo/log/GIBranches"
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


# Send webhook
def send_webhook(msg):
    for url in webhook_urls:
        if not url:
            continue
        try:
            requests.post(url, json={"content": msg})
        except:
            pass


# MAIN
def check_branch():
    resp = requests.get(API_URL, timeout=10)
    data = resp.json()

    # Save raw log
    with open(RAW_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(data, ensure_ascii=False) + "\n")

    game_list = data.get("data", {}).get("game_branches", [])

    if not game_list:
        send_webhook("❌ API returned no game_branches")
        return

    cache = load_cache()

    for item in game_list:
        game = item.get("game", {})
        main = item.get("main")

        game_name = game.get("biz", "unknown")
        game_id = game.get("id")

        if not main:
            send_webhook("❌ No 'main' branch found in API")
            continue

        # Extract data
        new_ver = main.get("tag", "")
        diff_tags = main.get("diff_tags", [])

        old_ver = diff_tags[0] if diff_tags else "unknown"

        package_id = main.get("package_id", "")
        password = main.get("password", "")
        branch = main.get("branch", "main")

        # Read last saved version
        last_ver = cache.get(game_id)

        # If version changed, send webhook
        if last_ver != new_ver:
            cache[game_id] = new_ver
            save_cache(cache)

            msg = (
                f"Detected {game_name} update {old_ver} -> {new_ver}\n"
                f"Branch\n{branch}\n"
                f"Package ID\n{package_id}\n\n"
                f"Password\n{password}"
            )

            send_webhook(msg)

    send_webhook("✅ Checked all APIs and sent updates if changed")


# Run
if __name__ == "__main__":
    check_branch()
