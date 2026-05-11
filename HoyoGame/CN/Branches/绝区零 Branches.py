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

bot = discord.Client(
    intents=intents
)

# =========================================================
# Branding
# =========================================================

BOT_NAME = "绝区零 Branches"

BOT_ICON = (
    "https://raw.githubusercontent.com/"
    "horoyoi-san/Hoyo/refs/heads/Webhook/assets/nap_cn.png"
)

# =========================================================
# Channels
# =========================================================

CHANNELS = [
    1292097230924283965, # Test
    1291728736739131402, # 1
    1267379122338791435, # 2
]

# =========================================================
# API
# =========================================================

BRANCH_API_URL = (
    "https://hyp-api.mihoyo.com/"
    "hyp/hyp-connect/api/getGameBranches?"
    "game_ids[]=x6znKlJ0xK&launcher_id=jGHBHlcOq1"
)

GAME_INFO_URL = (
    "https://hyp-api.mihoyo.com/"
    "hyp/hyp-connect/api/getGames?"
    "launcher_id=jGHBHlcOq1"
)

GAME_ID = "x6znKlJ0xK"

GAME_NAME = "ZZZBranches"

# =========================================================
# Utils
# =========================================================

def safe_asset(obj):

    if isinstance(obj, dict):

        return obj.get(
            "url",
            ""
        )

    return ""

# =========================================================
# Discord Send
# =========================================================

async def send_embed_message(
    channel_id,
    title,
    description,
    icon_url,
    bg_url,
    footer_text
):

    try:

        channel = await bot.fetch_channel(
            channel_id
        )

    except Exception as e:

        print(
            f"❌ Channel fetch error: {channel_id}"
        )

        print(e)

        return

    embed = discord.Embed(
        title=title,
        description=description,
        color=0xFF9700,
        timestamp=datetime.now(
            timezone.utc
        )
    )

    # =====================================================
    # Thumbnail
    # =====================================================

    if icon_url:

        embed.set_thumbnail(
            url=icon_url
        )

    # =====================================================
    # Background
    # =====================================================

    if bg_url:

        embed.set_image(
            url=bg_url
        )

    # =====================================================
    # Footer
    # =====================================================

    embed.set_footer(
        text=footer_text,
        icon_url=icon_url
    )

    # =====================================================
    # Send
    # =====================================================

    try:

        await channel.send(
            embed=embed
        )

        print(
            f"✅ Sent -> {channel_id}"
        )

        # anti rate limit
        await asyncio.sleep(1)

    except Exception as e:

        print(
            f"❌ Send error -> {channel_id}"
        )

        print(e)

# =========================================================
# Split Long Message
# =========================================================

async def split_and_send(
    channel_id,
    title,
    lines,
    icon_url,
    bg_url,
    footer_text
):

    max_length = 4000

    message = ""

    for line in lines:

        if len(message) + len(line) + 1 > max_length:

            await send_embed_message(
                channel_id,
                title,
                message,
                icon_url,
                bg_url,
                footer_text
            )

            message = ""

        message += line + "\n"

    if message.strip():

        await send_embed_message(
            channel_id,
            title,
            message,
            icon_url,
            bg_url,
            footer_text
        )

# =========================================================
# Change Detection
# =========================================================

def has_changed(
    api_url,
    log_name
):

    log_dir = os.path.join(
        os.getcwd(),
        "log",
        "CNHoyo",
        "log",
        log_name
    )

    os.makedirs(
        log_dir,
        exist_ok=True
    )

    raw_file = os.path.join(
        log_dir,
        f"raw_{datetime.now(timezone.utc).date()}.jsonl"
    )

    hash_file = os.path.join(
        log_dir,
        "last_hash.txt"
    )

    try:

        r = requests.get(
            api_url,
            timeout=10
        )

        r.raise_for_status()

        data_text = r.text

        data_json = json.loads(
            data_text
        )

    except Exception as e:

        # =================================================
        # Error Log
        # =================================================

        with open(
            raw_file,
            "a",
            encoding="utf-8"
        ) as f:

            f.write(json.dumps({

                "timestamp":
                datetime.now(
                    timezone.utc
                ).isoformat(),

                "error":
                str(e)

            }, ensure_ascii=False) + "\n")

        print(
            "❌ API error but log written"
        )

        return False

    # =====================================================
    # Normal Log
    # =====================================================

    with open(
        raw_file,
        "a",
        encoding="utf-8"
    ) as f:

        f.write(json.dumps({

            "timestamp":
            datetime.now(
                timezone.utc
            ).isoformat(),

            "data":
            data_json

        }, ensure_ascii=False) + "\n")

    current_hash = hashlib.md5(
        data_text.encode()
    ).hexdigest()

    last_hash = ""

    if os.path.exists(hash_file):

        with open(
            hash_file,
            "r",
            encoding="utf-8"
        ) as f:

            last_hash = f.read().strip()

    # =====================================================
    # Changed
    # =====================================================

    if current_hash != last_hash:

        with open(
            hash_file,
            "w",
            encoding="utf-8"
        ) as f:

            f.write(current_hash)

        return True

    return False

# =========================================================
# Extract Branch Data
# =========================================================

def extract_game_branches(data):

    lines = []

    branch = data["data"]["game_branches"][0]

    # =====================================================
    # Main
    # =====================================================

    main = branch.get("main")

    if main:

        lines += [

            "## Main Branch",

            f"Tag: `{main['tag']}`",

            f"Package ID: `{main['package_id']}`",

            f"Diff from: `{', '.join(main.get('diff_tags', []))}`",

            f"Password: `{main['password']}`",

            ""
        ]

    # =====================================================
    # Pre Download
    # =====================================================

    pre = branch.get(
        "pre_download"
    )

    if pre:

        lines += [

            "## Pre-Download Branch",

            f"Tag: `{pre['tag']}`",

            f"Package ID: `{pre['package_id']}`",

            f"Diff from: `{', '.join(pre.get('diff_tags', []))}`",

            f"Password: `{pre['password']}`"
        ]

    return lines

# =========================================================
# Main
# =========================================================

async def main():

    # =====================================================
    # Login
    # =====================================================

    await bot.login(TOKEN)

    print(
        f"✅ Logged in as {bot.user}"
    )

    # =====================================================
    # Game Info
    # =====================================================

    resp = requests.get(
        GAME_INFO_URL,
        timeout=10
    ).json()

    game_data = next(

        (
            g

            for g in resp["data"]["games"]

            if g["id"] == GAME_ID
        ),

        None
    )

    if not game_data:

        print(
            f"❌ Game ID not found: {GAME_ID}"
        )

        await bot.close()

        return

    DISPLAY_NAME = (
        game_data["display"]["name"]
    )

    icon_url = safe_asset(
        game_data["display"].get(
            "icon"
        )
    )

    bg_url = safe_asset(
        game_data["display"].get(
            "background"
        )
    )

    # =====================================================
    # Branch Update
    # =====================================================

    try:

        if has_changed(
            BRANCH_API_URL,
            GAME_NAME
        ):

            data = requests.get(
                BRANCH_API_URL,
                timeout=10
            ).json()

            lines = extract_game_branches(
                data
            )

            for channel_id in CHANNELS:

                await split_and_send(
                    channel_id,
                    f"{DISPLAY_NAME} Branch Update",
                    lines,
                    icon_url,
                    bg_url,
                    f"{DISPLAY_NAME} Branch Monitor"
                )

        else:

            print(
                "[GI_BRANCH] No change"
            )

    except Exception as e:

        print(
            f"❌ Branch Error: {e}"
        )

        for channel_id in CHANNELS:

            await split_and_send(
                channel_id,
                "❌ Error",
                [f"[{GAME_NAME}] error: {e}"],
                "",
                "",
                ""
            )

    # =====================================================
    # Close
    # =====================================================

    await bot.close()

    print(
        "✅ Finished checking Branch API"
    )

# =========================================================
# Run
# =========================================================

asyncio.run(main())