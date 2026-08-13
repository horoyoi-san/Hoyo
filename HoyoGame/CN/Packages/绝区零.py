import discord
import asyncio
import time

import requests
from datetime import datetime, timezone

import os
import hashlib
import json

# =========================================================
# Discord
# =========================================================

TOKEN = os.environ.get("DISCORD_TOKEN")
intents = discord.Intents.default()

bot = discord.Client(intents=intents)

# =========================================================
# Branding
# =========================================================

BOT_NAME = "绝区零"

BOT_ICON = (
    "https://raw.githubusercontent.com/"
    "horoyoi-san/Hoyo/refs/heads/Webhook/assets/nap_global.png"
)

# =========================================================
# Channels
# =========================================================

CHANNELS = [
    1292097230924283965,  # Test
    1291728736739131402,  # 1
    1267379122338791435,  # 2
]

# =========================================================
# API
# =========================================================

api_urls = [
    "https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGamePackages?game_ids[]=x6znKlJ0xK&launcher_id=jGHBHlcOq1",
]

# =========================================================
# Discord Embed Send
# =========================================================


async def send_embed_message(
    channel_id, title, description, icon_url, bg_url, game_name
):

    try:

        channel = await bot.fetch_channel(channel_id)

    except Exception as e:

        print(f"❌ Channel fetch error: {channel_id}")

        print(e)

        return

    embed = discord.Embed(
        title=title,
        description=description,
        color=0xFF9700,
        timestamp=datetime.now(timezone.utc),
    )

    embed.set_thumbnail(url=icon_url)

    embed.set_image(url=bg_url)

    embed.set_footer(text=f"{game_name} Update Monitor", icon_url=icon_url)

    try:

        await channel.send(embed=embed)

        print(f"✅ Sent -> {channel_id}")

        # anti rate limit
        await asyncio.sleep(1)

    except Exception as e:

        print(f"❌ Send error -> {channel_id}")

        print(e)


# =========================================================
# Split Long Message
# =========================================================


async def split_and_send(channel_id, title, lines, icon_url, bg_url, game_name):

    max_length = 4000

    message = ""

    for line in lines:

        if len(message) + len(line) + 1 > max_length:

            await send_embed_message(
                channel_id, title, message, icon_url, bg_url, game_name
            )

            message = ""

        message += line + "\n"

    if message.strip():

        await send_embed_message(
            channel_id, title, message, icon_url, bg_url, game_name
        )


# =========================================================
# Extract Packages
# =========================================================


def extract_game_audio(pkg):

    game_links = [p["url"] for p in pkg.get("game_pkgs", [])]

    audio_links = [f"{a['language']}: {a['url']}" for a in pkg.get("audio_pkgs", [])]

    return game_links, audio_links


# =========================================================
# Hash Check
# =========================================================


def has_changed(api_url, game_name):

    try:

        response = requests.get(
            api_url,
            timeout=10
        )

        response.raise_for_status()

        data_text = response.text

        data_json = response.json()

    except Exception as e:

        try:

            with open(raw_file, "a", encoding="utf-8") as f:

                f.write(
                    json.dumps(
                        {
                            "timestamp": datetime.now(timezone.utc).isoformat(),
                            "data": json.loads(data_text),
                        },
                        ensure_ascii=False,
                    )
                    + "\n"
                )

            print(f"❌ API error logged -> {raw_file}")

        except Exception as log_error:

            print(f"❌ Failed to write error log: {log_error}")

        print(f"❌ Error fetching API: {e}")

        return False

    current_hash = hashlib.md5(data_text.encode()).hexdigest()

    # =====================================================
    # Log Path
    # =====================================================

    log_dir = os.path.join(os.getcwd(), "log", "CNHoyo", "Packages", game_name)

    os.makedirs(log_dir, exist_ok=True)

    print(f"📂 Creating log directory: {log_dir}")

    hash_file = os.path.join(log_dir, "last_hash.txt")

    raw_file = os.path.join(
    log_dir,
    f"raw_{datetime.now(timezone.utc).date()}.jsonl"
)

    # =====================================================
    # Raw Log
    # =====================================================

    try:

        with open(raw_file, "a", encoding="utf-8") as f:

            f.write(
                json.dumps(
                    {
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "data": json.loads(data_text),
                    },
                    ensure_ascii=False,
                )
                + "\n"
            )

        print(f"✅ Wrote raw log: {raw_file}")

    except Exception as e:

        print(f"❌ Error writing log file: {e}")

    # =====================================================
    # Last Hash
    # =====================================================

    last_hash = ""

    if os.path.exists(hash_file):

        with open(hash_file, "r", encoding="utf-8") as f:

            last_hash = f.read().strip()

    # =====================================================
    # Changed
    # =====================================================

    if current_hash != last_hash:

        with open(hash_file, "w", encoding="utf-8") as f:

            f.write(current_hash)

        return True

    return False


# =========================================================
# Main
# =========================================================


async def main():

    await bot.login(TOKEN)

    print(f"✅ Logged in as {bot.user}")

    # =====================================================
    # Loop APIs
    # =====================================================

    for api_url in api_urls:

        game_name = "nap"

        try:

            if not has_changed(api_url, game_name):

                print(f"[{game_name}] No change")

                continue

            # =================================================
            # Package API
            # =================================================

            data = requests.get(api_url, timeout=10).json()

            game_package = data["data"]["game_packages"][0]

            # =================================================
            # Game Display API
            # =================================================

            game_info_url = (
                "https://hyp-api.mihoyo.com/"
                "hyp/hyp-connect/api/getGames?"
                "launcher_id=jGHBHlcOq1"
            )

            resp = requests.get(game_info_url, timeout=10).json()

            game_data = next(
                g for g in resp["data"]["games"] if g["id"] == "x6znKlJ0xK"
            )

            display_name = game_data["display"]["name"]

            icon_url = game_data["display"]["icon"]["url"]

            bg_url = game_data["display"]["background"]["url"]

            game_data_list = []

            # =================================================
            # Main Version
            # =================================================

            version = game_package["main"]["major"]["version"]

            main_game, main_audio = extract_game_audio(game_package["main"]["major"])

            combined_main = (
                [f"version: {version}"]
                + main_game
                + ["", "Audio Packages:"]
                + main_audio
            )

            game_data_list.append((display_name, combined_main))

            # =================================================
            # Main Patches
            # =================================================

            for patch in game_package["main"].get("patches", []):

                patch_version = patch["version"]

                game, audio = extract_game_audio(patch)

                combined_patch = (
                    [f"patch-version: {patch_version}"]
                    + game
                    + ["", "Audio Packages:"]
                    + audio
                )

                game_data_list.append(
                    (f"{display_name} {patch_version} - Hdiff", combined_patch)
                )

            # =================================================
            # Pre-Download Major
            # =================================================

            pre = game_package.get("pre_download", {})

            pre_major = pre.get("major")

            if pre_major:

                pre_version = pre_major["version"]

                pre_game, pre_audio = extract_game_audio(pre_major)

                combined_pre = (
                    [f"PRE-version: {pre_version}"]
                    + pre_game
                    + ["", "Audio Packages:"]
                    + pre_audio
                )

                game_data_list.append((f"{display_name} Pre-Download", combined_pre))

            # =================================================
            # Pre-Download Patches
            # =================================================

            for patch in pre.get("patches", []):

                patch_version = patch["version"]

                game, audio = extract_game_audio(patch)

                combined_pre_patch = (
                    [f"Pre-Patch version: {patch_version}"]
                    + game
                    + ["", "Audio Packages:"]
                    + audio
                )

                game_data_list.append(
                    (
                        f"{display_name} Pre-Download {patch_version} - Hdiff",
                        combined_pre_patch,
                    )
                )

            # =================================================
            # Send Discord
            # =================================================

            for channel_id in CHANNELS:

                for title, lines in game_data_list:

                    await split_and_send(
                        channel_id, title, lines, icon_url, bg_url, display_name
                    )

        except Exception as e:

            print(f"❌ Exception: {e}")

            for channel_id in CHANNELS:

                await split_and_send(
                    channel_id, "❌ Error", [f"[{game_name}] error: {e}"], "", "", ""
                )


# =========================================================
# Start
# =========================================================


async def runner():

    task = asyncio.create_task(bot.start(TOKEN))

    await asyncio.sleep(5)

    await main()

    await asyncio.sleep(15)

    await bot.close()

    await task


asyncio.run(runner())
