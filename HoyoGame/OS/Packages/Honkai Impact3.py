import discord
import asyncio
import time

import requests
from datetime import datetime, timezone

import os
import hashlib
import json

from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

session = requests.Session()

retry = Retry(
    total=5,
    connect=5,
    read=5,
    backoff_factor=2,
    status_forcelist=[500, 502, 503, 504],
)

adapter = HTTPAdapter(max_retries=retry)

session.mount("https://", adapter)
session.mount("http://", adapter)

# =========================================================
# Discord
# =========================================================

TOKEN = os.environ.get("DISCORD_TOKEN")

intents = discord.Intents.default()

bot = discord.Client(intents=intents)

# =========================================================
# Branding
# =========================================================

BOT_NAME = "Honkai Impact3 PROD"

BOT_ICON = (
    "https://raw.githubusercontent.com/"
    "horoyoi-san/Hoyo/refs/heads/Webhook/assets/bh3_global.png"
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
# API Targets
# =========================================================

api_targets = [
    (
        "bh3_tw",
        "wkE5P5WsIf",
        "https://sg-hyp-api.hoyoverse.com/"
        "hyp/hyp-connect/api/getGamePackages?"
        "game_ids[]=wkE5P5WsIf&launcher_id=VYTpXlbWo8",
    ),
    (
        "bh3_glb",
        "5TIVvvcwtM",
        "https://sg-hyp-api.hoyoverse.com/"
        "hyp/hyp-connect/api/getGamePackages?"
        "game_ids[]=5TIVvvcwtM&launcher_id=VYTpXlbWo8",
    ),
    (
        "bh3_jp",
        "g0mMIvshDb",
        "https://sg-hyp-api.hoyoverse.com/"
        "hyp/hyp-connect/api/getGamePackages?"
        "game_ids[]=g0mMIvshDb&launcher_id=VYTpXlbWo8",
    ),
    (
        "bh3_kr",
        "uxB4MC7nzC",
        "https://sg-hyp-api.hoyoverse.com/"
        "hyp/hyp-connect/api/getGamePackages?"
        "game_ids[]=uxB4MC7nzC&launcher_id=VYTpXlbWo8",
    ),
    (
        "bh3_overseas",
        "bxPTXSET5t",
        "https://sg-hyp-api.hoyoverse.com/"
        "hyp/hyp-connect/api/getGamePackages?"
        "game_ids[]=bxPTXSET5t&launcher_id=VYTpXlbWo8",
    ),
]

# =========================================================
# Discord Send
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
        color=0xFFD700,
        timestamp=datetime.now(timezone.utc),
    )

    if icon_url:

        embed.set_thumbnail(url=icon_url)

    if bg_url:

        embed.set_image(url=bg_url)

    embed.set_footer(
        text=f"{game_name} Update Monitor", icon_url=icon_url if icon_url else None
    )

    try:

        await channel.send(embed=embed)

        print(f"✅ Sent -> {channel_id}")

        await asyncio.sleep(1)

    except Exception as e:

        print(f"❌ Send error -> {channel_id}")

        print(e)


# =========================================================
# Split Message
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

        data_text = session.get(api_url, timeout=10).text

    except Exception as e:

        print(f"❌ Error fetching API {game_name}: {e}")

        return False

    current_hash = hashlib.md5(data_text.encode()).hexdigest()

    # =====================================================
    # Log Path
    # =====================================================

    log_dir = os.path.join(os.getcwd(), "log", "OSHoyo", "Packages", game_name)

    os.makedirs(log_dir, exist_ok=True)

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

    except Exception as e:

        print(f"❌ Error writing log file for {game_name}: {e}")

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
    # Loop Regions
    # =====================================================

    for region, game_id, api_url in api_targets:

        game_name = region

        print(f"🔹 Starting fetch for {game_name}")

        try:

            changed = has_changed(api_url, game_name)

            print(f"[{game_name}] has_changed={changed}")

            if not changed:

                print(f"[{game_name}] No change")

                continue

            # =================================================
            # Package API
            # =================================================

            try:

                data = session.get(api_url, timeout=10).json()

                game_package = data["data"]["game_packages"][0]

            except Exception as e:

                print(f"❌ Error parsing API response for {game_name}: {e}")

                continue

            # =================================================
            # Display API
            # =================================================

            try:

                game_info_url = (
                    "https://sg-hyp-api.hoyoverse.com/"
                    "hyp/hyp-connect/api/getGames?"
                    "launcher_id=VYTpXlbWo8"
                )

                try:
                    r = session.get(GAME_INFO_URL, timeout=30)
                    r.raise_for_status()
                    resp = r.json()

                except requests.exceptions.RequestException as e:
                    print(f"❌ Game Info API Error: {e}")
                    await bot.close()
                    return

                game_data = next(
                    g for g in resp["data"]["games"] if g["id"] == "5TIVvvcwtM"
                )

                display_name = game_data["display"]["name"]

                icon_url = game_data["display"]["icon"]["url"]

                bg_url = game_data["display"]["background"]["url"]

            except Exception as e:

                print(f"❌ Error fetching display info for {game_name}: {e}")

                display_name = game_name

                icon_url = ""

                bg_url = ""

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
            # Predownload
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
            # Predownload Patches
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

            print(f"✅ Finished fetch for {game_name}")

        except Exception as e:

            print(f"❌ Unexpected exception for {game_name}: {e}")

            for channel_id in CHANNELS:

                await split_and_send(
                    channel_id,
                    "❌ Error",
                    [f"[{game_name}] unexpected error: {e}"],
                    "",
                    "",
                    "",
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
