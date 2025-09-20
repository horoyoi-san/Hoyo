import requests
from datetime import datetime, timezone

# ✅ API URLs
api_urls = [
    "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=4qvmDrMwKS&launcher_id=VYTpXlbWo8",
]

# ✅ Discord Webhooks
webhook_urls = [
    "YOUR_DISCORD_WEBHOOK_URL",
    "YOUR_DISCORD_WEBHOOK_URL",
    "YOUR_DISCORD_WEBHOOK_URL",
    "YOUR_DISCORD_WEBHOOK_URL",

]

# ✅ ดึงข้อมูลเกม gopR6Cufr3 จาก getGames
game_info_url = "https://sg-hyp-api-beta.hoyoverse.com/hyp/hyp-connect/api/getGames?&launcher_id=95ODRGH3xC"
resp = requests.get(game_info_url).json()
game_data = next(g for g in resp["data"]["games"] if g["id"] == "4qvmDrMwKS")

game_name = game_data["display"]["name"]
icon_url = game_data["display"]["icon"]["url"]
bg_url = game_data["display"]["background"]["url"]

def send_embed_message(webhook_url, title, description):
    embed = {
        "embeds": [{
            "title": title,
            "description": description,
            "color": 16777215,
            "thumbnail": {"url": icon_url},   # ✅ icon จาก display
            "image": {"url": bg_url},        # ✅ background จาก display
            "footer": {
                "text": f"{game_name} Update Monitor",
                "icon_url": icon_url
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }]
    }
    requests.post(webhook_url, json=embed)

def split_and_send(webhook_url, title, lines):
    max_length = 1900
    message = f"**{title}**\n"
    for line in lines:
        if len(message) + len(line) + 1 > max_length:
            send_embed_message(webhook_url, title, message)
            message = f"**{title}**\n"
        message += line + "\n"
    if message.strip():
        send_embed_message(webhook_url, title, message)

def extract_game_audio(pkg):
    game_links = [p["url"] for p in pkg.get("game_pkgs", [])]
    audio_links = [f"{a['language']}: {a['url']}" for a in pkg.get("audio_pkgs", [])]
    return game_links, audio_links

# 🧠 ดึงข้อมูล patch/version แล้วส่งไป Webhook
for index, api_url in enumerate(api_urls, start=1):
    try:
        response = requests.get(api_url, timeout=10)
        data = response.json()
        game_package = data["data"]["game_packages"][0]

        game_data = []

        # ✅ Main Version
        version = game_package["main"]["major"]["version"]
        main_game, main_audio = extract_game_audio(game_package["main"]["major"])
        combined_main = [f"version: {version}"] + main_game + ["", " Audio Packages:"] + main_audio
        game_data.append((game_name, combined_main))

        # ✅ Main Patches
        for patch in game_package["main"].get("patches", []):
            patch_version = patch["version"]
            game, audio = extract_game_audio(patch)
            combined_patch = [f"patch-version: {patch_version}"] + game + ["", " Audio Packages:"] + audio
            game_data.append((f"{game_name} {patch_version} - Hdiff", combined_patch))

        # ✅ Pre-Download Major
        pre = game_package.get("pre_download", {})
        pre_major = pre.get("major")
        if pre_major:
            pre_version = pre_major["version"]
            pre_game, pre_audio = extract_game_audio(pre_major)
            combined_pre = [f"PRE-version: {pre_version}"] + pre_game + ["", " Audio Packages:"] + pre_audio
            game_data.append((f"{game_name} Pre-Download", combined_pre))

        # ✅ Pre-Download Patches
        for patch in pre.get("patches", []):
            patch_version = patch["version"]
            game, audio = extract_game_audio(patch)
            combined_pre_patch = [f"Pre-Patch version: {patch_version}"] + game + ["", " Audio Packages:"] + audio
            game_data.append((f"{game_name} Pre-Download {patch_version} - Hdiff", combined_pre_patch))

        # ✅ ส่งไปยัง Webhook
        for webhook_url in webhook_urls:
            for title, lines in game_data:
                split_and_send(webhook_url, title, lines)

    except Exception as e:
        for webhook_url in webhook_urls:
            split_and_send(webhook_url, "❌ Error", [f"Source {index} error: {e}"])

print("✅ ส่งข้อมูลไปยัง Webhook ทั้งหมดเรียบร้อยแล้ว")
