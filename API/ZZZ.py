import requests
from datetime import datetime

# ✅ ใส่ API URLs ทั้ง 5 อัน
api_urls = [
    "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids%5B%5D=U5hbdsT9W7&launcher_id=VYTpXlbWo8",


]

# ✅ ใส่ Discord Webhook URLs ทั้ง 5 อันให้ตรงกับ API
webhook_urls = [
    "https://discord.com/api/webhooks/1291725154937999444/CeBZotZNDREE7KM7mFx7DJ--Z2TD8tKKmfgZ8gqPUrLs2Bs2rALXjm6HPqv_VKNxGfQJ",
    "https://discord.com/api/webhooks/1313090257628954644/Hk00YkdPJUxqEjjXJLIOJjg6zNnxYFeyNd7J0nYE_JXf1Nh1rHUbxbjBIJP6CYRZA07o",
    "https://discord.com/api/webhooks/1315273814132785273/KCEkUloeo75HpgwrEVhXDfRzLSuOB7LHf0Nm1zCme0I1s-bl_jkujpcVZC8KSKifEkNU",
    "https://discord.com/api/webhooks/1313874393532989532/0mN1RuiIcN9zDC4HmE4PIOcAPN7B73tgX2TUHMpQH3EkmRTiy5LizlR1PZsnf-J0RSQs",

]

def send_embed_message(webhook_url, title, description):
    embed = {
        "embeds": [{
            "title": title,
            "description": description,
            "color": 16753920,
            "thumbnail": {
                "url": "https://play-lh.googleusercontent.com/DEkjrvPufl6TG4Gxq4m8goCSLYiE1bLNOTnlKrJbHDOAWZT40qG3oyALMZJ2BPHJoe8"
            },
            "image": {
                "url": "https://i0.wp.com/www.consolecreatures.com/wp-content/uploads/2024/05/zenless-zone-zero-july.webp"
            },
            "footer": {
                "text": "Zenless Zone Zero Update Monitor",
                "icon_url": "https://cdn.discordapp.com/emojis/1065830078086393876.webp?size=96"
            },
            "timestamp": datetime.utcnow().isoformat()
        }]
    }
    requests.post(webhook_url, json=embed)


def split_and_send(webhook_url, title, lines):
    max_length = 3000
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


# 🧠 เก็บข้อมูลจากทุก API และส่งไปยัง Webhook ที่ตรงกัน
all_game_data = []

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
        game_data.append(("Zenless Zone Zero ", combined_main))

        # ✅ Main Patches
        for patch in game_package["main"].get("patches", []):
            patch_version = patch["version"]
            game, audio = extract_game_audio(patch)
            combined_patch = [f"patch-version: {patch_version}"] + game + ["", " Audio Packages:"] + audio
            game_data.append((f"Zenless Zone Zero  {patch_version} - Hdiff", combined_patch))

        # ✅ Pre-Download Major
        pre = game_package.get("pre_download", {})
        pre_major = pre.get("major")
        if pre_major:
            pre_version = pre_major["version"]
            pre_game, pre_audio = extract_game_audio(pre_major)
            combined_pre = [f"PRE-version: {pre_version}"] + pre_game + ["", " Audio Packages:"] + pre_audio
            game_data.append(("Zenless Zone Zero Pre-Download", combined_pre))

        # ✅ Pre-Download Patches
        for patch in pre.get("patches", []):
            patch_version = patch["version"]
            game, audio = extract_game_audio(patch)
            combined_pre_patch = [f"Pre-Patch version: {patch_version}"] + game + ["", " Audio Packages:"] + audio
            game_data.append((f"Zenless Zone Zero Pre-Download {patch_version} - Hdiff", combined_pre_patch))

        # ✅ ส่งทุก data ไปยัง Webhook ทั้งหมด
        for webhook_url in webhook_urls:
            for title, lines in game_data:
                split_and_send(webhook_url, title, lines)

    except Exception as e:
        for webhook_url in webhook_urls:
            split_and_send(webhook_url, "❌ Error", [f"Source {index} error: {e}"])
print("✅ ส่งข้อมูลไปยัง Webhook ทั้งหมดเรียบร้อยแล้ว")
