# SophonDownloader
Download mihoyo assets using their new download method

[English][p:en-us] | [中文][p:zh-cn]

---

After Genshin forced SophonChunks to update and stopped giving zip files for updates in version 5.6, it was no longer possible to download game assets without using HoYoPlay.

---

# Download

* Latest auto-build available [here](https://nightly.link/Escartem/SophonDownloader/workflows/build/master/Sophon.Downloader.zip) ✨

---

# How to use
```
Usage:
    Sophon.Downloader.exe full <gameId> <package> <version> <outputDir> [options]                     Download full game assets
    Sophon.Downloader.exe update <gameId> <package> <updateFrom> <updateTo> <outputDir> [options]     Download update assets

Arguments:
    <gameId>        Game ID, either hoyo id (hk4e, hkrpg, nap, bh2) or REL id (gopR6Cufr3, ...)
    <package>       What to download, either "game" or for audio "zh-cn", "en-us", "ja-jp" or "ko-kr"
    <version>       Version to download
    <updateFrom>    Version to update from
    <updateTo>      Version to update to
    <outputDir>     Output directory to save the downloaded files

Options:
    --region=<value>            Region to use, either OSREL (overseas) or CNREL (china), defaults to OSREL
    --branch=<value>            Override branch name of the game data
    --launcherId=<value>        Override launcher ID used when fetching packages
    --platApp=<value>           Override platform application ID used when fetching packages
    --threads=<value>           Number of threads to use, defaults to the number of processors
    --handles=<value>           Number of HTTP handles to use, defaults to 128
    --silent                    Suppress confirmation message and output
    -h, --help                  Show this help message
```

---

# Game ID

| Game | ID |
| - | - |
| Honkai Impact 3rd | `bh2` |
| Genshin Impact | `hk4e` |
| Honkai: Star Rail | `hkrpg` |
| Zenless Zone Zero | `nap` |

---

# Note

This was made in a rush after Genshin stopped giving zip files for updates, please report any issue and please note ZZZ also uses Sophon but it wasn't tested for that game

---

# Credits

- [Hi3Helper.Sophon](https://github.com/CollapseLauncher/Hi3Helper.Sophon) - Sophon assets management

[p:en-us]: README.md
[p:zh-cn]: README_zh-cn.md