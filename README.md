# RobinSR on Android (but without termux)
I haven't tested this myself since my device can't run HSR, but I did test the server with my phone as the host while running the game on PC. This is just a proof of concept anyway (I'm new to Android development 😭).

## Building from Source  
**Note:** This README might not include all steps. If you encounter any errors, you may need to look up additional information yourself.  

### Prerequisites  

You'll need:  
- Android Studio  
- Android SDK & NDK  
- Rust nightly  

### 1. Install Android SDK & NDK  

Install [Android Studio](https://developer.android.com/studio) and set up the required SDKs.  

### 2. Install Rust & Cargo NDK  

Install [Rust](https://www.rust-lang.org/tools/install). RobinSR requires Rust nightly:  

```sh
rustup toolchain install nightly
rustup default nightly
```  

Add required targets:  

```sh
rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android
```  

Install `cargo-ndk`:  

```sh
cargo install cargo-ndk
```  

### 3. Configure Android NDK Path  

Set `ANDROID_NDK_HOME`:  

```sh
set ANDROID_NDK_HOME=%ANDROID_SDK_ROOT%\ndk\{ndk-version}
```  

For PowerShell:  

```powershell
$env:ANDROID_NDK_HOME="$env:ANDROID_SDK_ROOT\ndk\{ndk-version}"
```  

Replace `{ndk-version}` accordingly.  

### 4. Verify Installation  

Check if everything is installed:  

```sh
rustc --version
cargo --version
cargo ndk --help
```  

After this, build the project from android studio.  