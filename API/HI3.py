import requests

# ✅ ใส่ API URLs ทั้ง 5 อัน
api_urls = [
    "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids%5B%5D=wkE5P5WsIf&launcher_id=VYTpXlbWo8",
    "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids%5B%5D=5TIVvvcwtM&launcher_id=VYTpXlbWo8",
    "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids%5B%5D=g0mMIvshDb&launcher_id=VYTpXlbWo8",
    "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids%5B%5D=uxB4MC7nzC&launcher_id=VYTpXlbWo8",
    "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids%5B%5D=bxPTXSET5t&launcher_id=VYTpXlbWo8",
]


# ✅ ใส่ Discord Webhook URLs ทั้ง 5 อันให้ตรงกับ API
discord_webhook_urls = [
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
            "color": 5814783  # สามารถเปลี่ยนสีของ Embed ได้
        }]
    }
    requests.post(webhook_url, json=embed)

def send_message(webhook_url, content):
    requests.post(webhook_url, json={"content": content})

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

# ========================
# 🔁 วนผ่านแต่ละ API และ Webhook
# ========================
for index, (api_url, webhook_url) in enumerate(zip(api_urls, discord_webhook_urls), start=1):
    try:
        response = requests.get(api_url)
        data = response.json()
        game_package = data["data"]["game_packages"][0]

        # ✅ MAIN GAME
        version = game_package["main"]["major"]["version"]
        main_game, main_audio = extract_game_audio(game_package["main"]["major"])
        split_and_send(webhook_url, "Genshin Impact PROD", [f"version: {version}"] + main_game)
        split_and_send(webhook_url, "Genshin Impact PROD audio", main_audio)

        for patch in game_package["main"].get("patches", []):
            patch_version = patch["version"]
            game, audio = extract_game_audio(patch)
            split_and_send(webhook_url, f"Genshin Impact PROD  {patch_version} - Patch", game)
            split_and_send(webhook_url, f"Genshin Impact PROD  {patch_version} - audio", audio)

        # ✅ PRE-DOWNLOAD
        pre = game_package.get("pre_download", {})
        pre_major = pre.get("major")
        if pre_major:
            pre_version = pre_major["version"]
            pre_game, pre_audio = extract_game_audio(pre_major)
            split_and_send(webhook_url, "Genshin Impact Pre-Download ", [f"PRE-version: {pre_version}"] + pre_game)
            split_and_send(webhook_url, "Genshin Impact Pre-Download audio", pre_audio)

        for patch in pre.get("patches", []):
            patch_version = patch["version"]
            game, audio = extract_game_audio(patch)
            split_and_send(webhook_url, f"Genshin Impact Pre-Download  {patch_version} - audio", game)
            split_and_send(webhook_url, f"Genshin Impact Pre-Download audio {patch_version} - audio", audio)

        print(f"✅ ส่งข้อมูลจาก Source {index} ไปยัง Discord เรียบร้อยแล้ว")

    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดจาก Source {index}: {e}")