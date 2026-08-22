# HSR-OWNER

An all-in-one reverse-engineering and modding toolkit for **Honkai: Star Rail** on Windows. To keep things legit, all illicit cheat features have been completely stripped out. Once compiled, you'll get `StarRail.exe` (it already has the anti-anti-cheat built in).

> **Disclaimer** — This project is provided for research and educational purposes only. It is not affiliated with or endorsed by miHoYo / HoYoverse / Cognosphere. Using third-party tools against an online game may violate its Terms of Service and applicable local laws. Use at your own risk.

---

## OWNER

This runtime layer pretty much adapts itself to any new game version — the only crates you'll ever need to touch are `il2cpp`, `reflection`, `morax`, and `dumper`.

How do you update? Barely any manual work. `morax` is fully commented, so just hook up IDA Pro through its MCP server and let an AI agent take it from start to finish. Same with `dumper` — hand it to an AI too. All it needs is admin rights; just make sure it saves `dump.log`.

Once it's running, you get the whole client figured out: how gacha fetching works, how images and text get unpacked, all of it.

You can even mess with the game's data and build your own characters. NeonTeam's former reverse master made a real "OWN" once — go see it for yourself: [BiliBili](https://www.bilibili.com/video/BV1KpP8z9EtQ).

But he’s totally done with reverse engineering — he finds it way too easy, so it just got boring for him. That’s also why we can’t provide any of the anti-cheat stuff: we simply don’t have the chops to reverse those parts ourselves, and he never leaked enough info anyway, just leaving behind a single architecture diagram. Everything here is his old code (Just HSR is over 100k lines)—we basically just cleaned it up a bit and pushed it out. Honestly, it’s only because he got sick of RE that any of this got open-sourced in the first place (“I don’t care anything about Hoyo shit, if you want then do it”)... which is also why NeonTeam only open-sourced shit Private Servers before.

## Building

Requirements:

- **Windows** (x86_64) with the MSVC toolchain (latest nightly).

```powershell
cargo build --release
```

## NeonTeam

- [Discord](https://discord.gg/RQfpnaPtRV) — official discord
- [YouTube](https://www.youtube.com/@neon7team) — YouTube

## Credits

- [gpui](https://github.com/zed-industries/zed) and [gpui-component](https://github.com/longbridge/gpui-component) — frontend UI framework
- [texture2ddecoder](https://github.com/UniversalGameExtraction/texture2ddecoder) (vendored, MIT/Apache-2.0) — block-compressed texture decoding
- [HoYo.Gacha](https://github.com/lgou2w/HoYo.Gacha) — gacha record fetching via Chromium disk-cache reading (reference for `crates/gacha`)
- Oodle (`oo2core_win64.lib`) — asset decompression (statically linked, © Epic Games/RAD Game Tools)

## License

This project is licensed under the [MIT License](LICENSE).
