# Moonlight_Whispers

**Moonlight_Whispers** is a client patch for the game **Zenless Zone Zero**. It's main goal is to redirect your client requests to another destination, such as server emulator. Codebase should be kept simple and easily extensible.

Currently supported game version is: `CNBetaWin3.1.x`

## Requirements

- Zig 0.16.0
  - [Windows x86_64](https://ziglang.org/download/0.16.0/zig-x86_64-windows-0.16.0.zip)
  - [Linux x86_64](https://ziglang.org/download/0.16.0/zig-x86_64-linux-0.16.0.tar.xz)

## Building from source

```sh
git clone https://git.xeondev.com/ESD/Moonlight_Whispers.git
cd Moonlight_Whispers
zig build -Dtarget=x86_64-windows -Doptimize=ReleaseSmall
mv zig-out/bin/velina.exe zig-out/bin/Moonlight_Whispers.dll PATH_TO_CLIENT/
```

## Configuration

**Moonlight_Whispers** can be easily configured by changing destination addresses inside `assets/login_setting.json` and `assets/server_pc.json`. In case you want to adapt it for a different game version - just swap out offsets in `assets/offsets.zon`.

## รองรับชื่อไฟล์ที่ต้องการ: 
ในฟังก์ชัน loadUidCustom ได้ปรับลำดับให้อ่านไฟล์ดังต่อไปนี้เป็นลำดับแรกๆ:
```
        "crypto_custom.txt",
        "crypto_custom",
        "Crypto_Custom.txt",
        "crypto.txt",
        "message.txt", 
        "UID_Custom.txt", 
        "uid_custom.txt", 
        "uid_custom"
```