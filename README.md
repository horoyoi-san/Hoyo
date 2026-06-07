# Vortex

**Vortex** is a client patch for the game **Zenless Zone Zero**. It's main goal is to redirect your client requests to another destination, such as server emulator. Codebase should be kept simple and easily extensible.

Currently supported game version is: `CNBetaWin3.1.x`

## Requirements

- Zig 0.16.0
  - [Windows x86_64](https://ziglang.org/download/0.16.0/zig-x86_64-windows-0.16.0.zip)
  - [Linux x86_64](https://ziglang.org/download/0.16.0/zig-x86_64-linux-0.16.0.tar.xz)

## Building from source

```sh
git clone https://git.xeondev.com/ESD/vortex.git
cd vortex
zig build -Dtarget=x86_64-windows -Doptimize=ReleaseSmall
mv zig-out/bin/velina.exe zig-out/bin/vortex.dll PATH_TO_CLIENT/
```

## Configuration

**Vortex** can be easily configured by changing destination addresses inside `assets/login_setting.json` and `assets/server_pc.json`. In case you want to adapt it for a different game version - just swap out offsets in `assets/offsets.zon`.
