# Covenant_of_Dayat

**Covenant_of_Dayat** is a client patch for the game **Zenless Zone Zero**. It's designed to work with the [Sunbringer Server Emulator](https://git.xeondev.com/Sunbringer/Sunbringer).

## Requirements
To build **Covenant_of_Dayat** from sources you need:
- Zig Compiler, version `0.16.0`: [Linux](https://ziglang.org/download/0.16.0/zig-x86_64-linux-0.16.0.tar.xz)/[Windows](https://ziglang.org/download/0.16.0/zig-x86_64-windows-0.16.0.zip)

#### Currently supported client version: `CNBetaWin3.2.0`, it can be found in our [discord server](https://discord.xeondev.com/)

## Steps to compile and run
```sh
git clone https://git.xeondev.com/Sunbringer/Covenant_of_Dayat.git
cd Covenant_of_Dayat
zig build -Doptimize=ReleaseSmall
mv zig-out/bin/Sunbringer.exe zig-out/bin/Covenant_of_Dayat.dll PATH_TO_CLIENT/
```
#### NOTE: "PATH_TO_CLIENT" must be replaced with the actual path to the game directory.

## Configuration
**Covenant_of_Dayat** is configured by editing files in the `assets` directory and (re-)compiling its source code.
- URL from `login_setting.json` are used to communicate with the dispatch server (dpsv)
- URLs from `server_pc.json` are used to communicate with the SDK server (sdksv)
- `sdk_public_key.xml` is the RSA key used for communication with the SDK server
- `server_public_key.xml` is the RSA key used for communication with dispatch and game servers
- `offsets.zon` contains version-specific values

## Contributing
[Donate](https://boosty.to/xeondev/donate).

[Join project-specific discord server](https://Sunbringer.xeondev.com).

[Join ReversedRooms discord server](https://discord.xeondev.com).

[Join ReversedRooms telegram channel](https://t.me/reversedrooms).

The contributions (in form of patches) can be submitted in one of our discord servers. You can also get an account on [our git instance](https://git.xeondev.com/) after a number of accepted contributions.

## License
This repository was made public in the hopes that it will be useful. However, it comes with no warranty whatsoever (expressed or implied).
It's licensed under [GNU Affero General Public License v3](LICENSE).
