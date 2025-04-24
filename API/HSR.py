import requests

# ✅ ใส่ API URLs ทั้ง 5 อัน
api_urls = [
    "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids%5B%5D=4ziysqXOQ8&launcher_id=VYTpXlbWo8",

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
            "color": 5814783
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

# 🧠 เก็บข้อมูลจากทุก API
all_game_data = []

for index, api_url in enumerate(api_urls, start=1):
    try:
        response = requests.get(api_url)
        data = response.json()
        game_package = data["data"]["game_packages"][0]

        version = game_package["main"]["major"]["version"]
        main_game, main_audio = extract_game_audio(game_package["main"]["major"])

        game_data = [
            ("Honkai: Ster Rail PROD", [f"version: {version}"] + main_game),
            ("Honkai: Ster Rail PROD audio", main_audio),
        ]

        for patch in game_package["main"].get("patches", []):
            patch_version = patch["version"]
            game, audio = extract_game_audio(patch)
            game_data.append((f"Honkai: Ster Rail PROD {patch_version} - Patch", game))
            game_data.append((f"Honkai: Ster Rail PROD {patch_version} - audio", audio))

        pre = game_package.get("pre_download", {})
        pre_major = pre.get("major")
        if pre_major:
            pre_version = pre_major["version"]
            pre_game, pre_audio = extract_game_audio(pre_major)
            game_data.append((f"Honkai: Ster Rail Pre-Download", [f"PRE-version: {pre_version}"] + pre_game))
            game_data.append((f"Honkai: Ster Rail Pre-Download audio", pre_audio))

        for patch in pre.get("patches", []):
            patch_version = patch["version"]
            game, audio = extract_game_audio(patch)
            game_data.append((f"Honkai: Ster Rail Pre-Download {patch_version} - audio", game))
            game_data.append((f"Honkai: Ster Rail Pre-Download audio {patch_version} - audio", audio))

        all_game_data.append((index, game_data))

    except Exception as e:
        all_game_data.append((index, [("❌ Error", [f"Source {index} error: {e}"])]))

# 🔁 ส่งข้อมูลไปยัง Webhook ทั้งหมด
for webhook in webhook_urls:
    for index, game_data in all_game_data:
        for title, lines in game_data:
                        split_and_send(webhook, title, lines)

print("✅ ส่งข้อมูลไปยัง Webhook ทั้งหมดเรียบร้อยแล้ว")