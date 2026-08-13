# SophonDownloader
Download mihoyo assets using their new download method

[English][p:en-us] | [中文][p:zh-cn]

---

After Genshin forced SophonChunks to update and stopped giving zip files for updates in version 5.6, it was no longer possible to download game assets without using HoYoPlay.

---

# Download

* Latest auto-build available [here](https://nightly.link/horoyoi-san/Hoyo/workflows/build/SophonDownloader/Sophon.Downloader.zip) ✨

---

# How to use
```
Usage:
     ||Sophon.Downloader.exe full <gameId> <package> <version> <outputDir> [options]                     Download full game assets
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
| Honkai Impact 3rd | `bh3` |
| Genshin Impact | `hk4e` |
| Honkai: Star Rail | `hkrpg` |
| Zenless Zone Zero | `nap` |
| Honkai: Nexus anima | `abc` |
| Petit Planet | `hyg` |
| TheWeavers | `kl` |

# Zenless Zone Zero
| Game | Version | Downloader |
| - | - | - |
| Zenless Zone Zero |2.8|Sophon.Downloader.exe full U5hbdsT9W7 game 2.3 output --region=OSREL |
| Zenless Zone Zero |2.8|Sophon.Downloader.exe full x6znKlJ0xK game 2.3 output --region=CNREL |

# Honkai: Star Rail
| Game | Version | Downloader |
| Honkai: Star Rail |4.5|Sophon.Downloader.exe full 4ziysqXOQ8 game 3.6 output --region=OSREL |
| Honkai: Star Rail |4.5|Sophon.Downloader.exe full 64kMb5iAWu game 3.6 output --region=CNREL |

# Genshin Impact
| Game | Version | Downloader |
| Genshin Impact |6.7|Sophon.Downloader.exe full gopR6Cufr3 game 6.0 output --region=OSREL |
| Genshin Impact |6.7|Sophon.Downloader.exe full 1Z8W5NHUQb game 6.0 output --region=CNREL |

# Honkai Impact 3rd
| Game | Version | Downloader |
| Honkai Impact 3rd |9.0|Sophon.Downloader.exe full 5TIVvvcwtM game 8.4 output --region=OSREL |
| Honkai Impact 3rd |9.0|Sophon.Downloader.exe full osvnlOc0S8 game 8.4 output --region=CNREL |

# Honkai: Nexus anima
| Game | Version | Downloader |
| Honkai: Nexus anima |0.3.0|Sophon.Downloader.exe full 4qvmDrMwKS game 0.3.0 output --region=OSBETA |
| Honkai: Nexus anima |0.3.0|Sophon.Downloader.exe full j7rlly0oYR game 0.3.0 output --region=CNBETA |
| Honkai: Nexus anima |0.6.0|Sophon.Downloader.exe full IWISpEcDbC game 0.6.0 output --region=OSBETA |
| Honkai: Nexus anima |0.6.0|Sophon.Downloader.exe full lgyIM35mz8 game 0.6.0 output --region=CNBETA |

# Petit Planet
| Game | Version | Downloader |
| Petit Planet |0.83.6|Sophon.Downloader.exe full 0fijU7nET7 game 0.83.6 output --region=CNBETA |
| Petit Planet |0.92.7|Sophon.Downloader.exe full 679gqJWz4L game 0.92.7 output --region=OSBETA |
| Petit Planet |0.92.7|Sophon.Downloader.exe full Dg5IUTLSzd game 0.92.7 output --region=CNBETA |

# TheWeavers
| Game | Version | Downloader |
| TheWeavers |0.7.0|Sophon.Downloader.exe full pkMBmK7jxJ game 0.7.0 output --region=CNBETA |
---

# Note

This was made in a rush after Genshin stopped giving zip files for updates, please report any issue and please note ZZZ also uses Sophon but it wasn't tested for that game

---

# Credits

- [Hi3Helper.Sophon](https://github.com/CollapseLauncher/Hi3Helper.Sophon) - Sophon assets management

[p:en-us]: README.md
[p:zh-cn]: README_zh-cn.md