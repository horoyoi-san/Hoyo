use std::io::{self, Error};

use iced_x86::{
    Code, Decoder, DecoderOptions, Encoder, Instruction, MemoryOperand, Mnemonic, OpKind, Register,
};
use patternscan::scan_first_match;
use windows::{
    Win32::System::{
        Diagnostics::Debug::FlushInstructionCache,
        LibraryLoader::{GetModuleHandleA, GetModuleHandleW, GetProcAddress},
        Memory::{PAGE_EXECUTE_READWRITE, PAGE_PROTECTION_FLAGS, VirtualProtect},
        Threading::GetCurrentProcess,
    },
    core::{s, w},
};

use crate::scanner::game_assembly_slice;

/*
 [Bug & Issue]
 Target Component: GameAssembly.dll
 Subsystem:        metadata::Initialize
 Vulnerability:    Hardcoded Allocation Limit

 1. EXECUTIVE SUMMARY
    In HoYoverse's customized native IL2CPP, a hardcoded static ceiling of 350 MB
    (0x15E00000 bytes) was imposed on the native metadata bump/linear allocator. When dynamic
    generic inflation, runtime reflection, or heavy scene asset loading exhausts this pool.

 2. DISCOVERY & ROOT CAUSE ANALYSIS
    - While reverse-engineering and developing the dumper, full Reflection dump trigger crash.
    - After a long time(3 Prod version),We found this issue.
    - Unlike open-source Unity IL2CPP, HoYoverse engineered an in-house static linear allocator.
      However, they hardcoded an immutable buffer size:
      mov edi, 0x15E00000 (0x15E00000 = 367,001,600 bytes = 350 MB)
    - This native C++ memory pool is monotonically allocated and completely
      independent of the C# managed GC domain, meaning allocated metadata is never freed.

 3. PRODUCTION IMPACT
    - Baseline static metadata in modern versions already occupies ~300 MB on launch.
    - In long production game sessions, it will reach the limit and crash.
    - Once exhausted, subsequent allocations fail, crashing the next arbitrary game logic that
      accesses the returned pointer. Because crash callstacks randomly point to unrelated gameplay
      scripts, developers could never reproduce or identify the underlying engine flaw.
      In their code its just a normal code like: #DEFINE_MAX_MEMORY 0x0F00000
*/
const MEMORY_POOL_350MB_PATTERN: &str = "BF 00 00 E0 15";
const SIGN_STR_PATTERN: &str = "6D 69 48 6F 59 6F 20 43 6F 2E 2C 4C 74 64 2E";
const SIGN_PATTERN: &str = "8B 1D ? ? ? ? 83 FB ? BD 20 00 00 00 0F 4D DD 29 DD";

pub fn patch_memory_pool() -> io::Result<()> {
    let ga_slice = game_assembly_slice();
    let ga_base = ga_slice.as_ptr() as usize;

    let mut slice = ga_slice;
    if let Some(offset) = scan_first_match(&mut slice, MEMORY_POOL_350MB_PATTERN)
        .map_err(|e| Error::other(format!("Pattern scan failed: {e}")))?
    {
        let target_addr = ga_base + offset;
        let imm_addr = (target_addr + 1) as *mut u32;
        let old_val = unsafe { std::ptr::read_volatile(imm_addr) };

        if old_val == 0x40000000 {
            log::info!("pool1 size RVA 0x{offset:X} already patched to 1GB");
            return Ok(());
        }

        let mut old_protection = PAGE_PROTECTION_FLAGS(0);
        unsafe {
            VirtualProtect(
                imm_addr as _,
                4,
                PAGE_EXECUTE_READWRITE,
                &mut old_protection,
            )
            .map_err(|e| Error::other(format!("VirtualProtect failed: {e}")))?;

            std::ptr::write_volatile(imm_addr, 0x40000000u32);

            FlushInstructionCache(GetCurrentProcess(), Some(imm_addr as _), 4)
                .map_err(|e| Error::other(format!("FlushInstructionCache failed: {e}")))?;

            let mut ignored = PAGE_PROTECTION_FLAGS(0);
            VirtualProtect(imm_addr as _, 4, old_protection, &mut ignored).ok();
        }

        let new_val = unsafe { std::ptr::read_volatile(imm_addr) };
        log::info!(
            "pool1 size RVA 0x{offset:X} {}MB -> 1GB (0x{old_val:X} -> 0x{new_val:X})",
            old_val / 0x100000
        );
    } else {
        log::warn!("pool1 size pattern not found, skipping patch");
    }

    Ok(())
}


/// # Safety
pub unsafe fn patch_sign(base: usize, image_size: usize) -> io::Result<()> {
    let size = if image_size != 0 {
        image_size
    } else {
        unsafe {
            let pe = std::ptr::read_unaligned((base + 0x3C) as *const i32) as usize;
            std::ptr::read_unaligned((base + pe + 80) as *const u32) as usize
        }
    };
    let slice = unsafe { std::slice::from_raw_parts(base as *const u8, size) };

    if let (Some(str_off), Some(code_off)) = (
        scan_first_match(&mut &slice[..], SIGN_STR_PATTERN)
            .ok()
            .flatten(),
        scan_first_match(&mut &slice[..], SIGN_PATTERN)
            .ok()
            .flatten(),
    ) {
        let (site_ip, str_addr) = (base as u64 + code_off as u64, base as u64 + str_off as u64);
        let window = 0x100.min(slice.len().saturating_sub(code_off));
        let code = &slice[code_off..code_off + window];

        let mut decoder = Decoder::with_ip(64, code, site_ip, DecoderOptions::NONE);
        let (mut mov_ebx, mut jbe, mut mov_rdx) = (None, None, None);
        let mut insn = Instruction::default();

        while decoder.can_decode() && mov_rdx.is_none() {
            decoder.decode_out(&mut insn);
            let off = (insn.ip() - site_ip) as usize;
            match (off, insn.mnemonic(), insn.op0_register(), insn.op1_kind()) {
                (0, Mnemonic::Mov, Register::EBX, OpKind::Memory) => {
                    mov_ebx = Some((off, insn.len()))
                }
                (_, Mnemonic::Jbe, _, _) => jbe = Some((off, insn.len())),
                (_, Mnemonic::Mov, Register::RDX, OpKind::Memory) => {
                    mov_rdx = Some((off, insn.len()))
                }
                _ => {}
            }
        }

        if let (Some((ebx_off, ebx_len)), Some((jbe_off, jbe_len)), Some((rdx_off, rdx_len))) =
            (mov_ebx, jbe, mov_rdx)
        {
            let total_len = rdx_off + rdx_len;
            if total_len <= code.len() {
                let encode = |insn: Instruction, ip: u64| -> Option<Vec<u8>> {
                    let mut enc = Encoder::new(64);
                    enc.encode(&insn, ip).ok()?;
                    Some(enc.take_buffer())
                };

                let mov_len = Instruction::with2(Code::Mov_r32_imm32, Register::EBX, 0x0Fu32).ok();
                let lea_str = Instruction::with2(
                    Code::Lea_r64_m,
                    Register::RDX,
                    MemoryOperand::new(
                        Register::RIP,
                        Register::None,
                        1,
                        str_addr as i64,
                        4,
                        false,
                        Register::None,
                    ),
                )
                .ok();

                if let (Some(m), Some(l)) = (
                    mov_len.and_then(|i| encode(i, site_ip + ebx_off as u64)),
                    lea_str.and_then(|i| encode(i, site_ip + rdx_off as u64)),
                ) {
                    let mut patch = code[..total_len].to_vec();
                    let replace = |buf: &mut [u8], off: usize, orig_len: usize, bytes: &[u8]| {
                        buf[off..off + bytes.len()].copy_from_slice(bytes);
                        buf[off + bytes.len()..off + orig_len].fill(0x90);
                    };

                    replace(&mut patch, ebx_off, ebx_len, &m);
                    patch[jbe_off..jbe_off + jbe_len].fill(0x90);
                    replace(&mut patch, rdx_off, rdx_len, &l);

                    let target = (base + code_off) as *mut u8;
                    let mut old = PAGE_PROTECTION_FLAGS(0);
                    unsafe {
                        VirtualProtect(target as _, patch.len(), PAGE_EXECUTE_READWRITE, &mut old)
                            .map_err(|e| Error::other(format!("VirtualProtect failed: {e}")))?;
                        std::ptr::copy_nonoverlapping(patch.as_ptr(), target, patch.len());
                        FlushInstructionCache(GetCurrentProcess(), Some(target as _), patch.len())
                            .map_err(|e| {
                                Error::other(format!("FlushInstructionCache failed: {e}"))
                            })?;
                        let mut ignored = PAGE_PROTECTION_FLAGS(0);
                        VirtualProtect(target as _, patch.len(), old, &mut ignored).ok();
                    }

                    log::info!("sign check patched successfully at RVA 0x{code_off:X}");
                }
            }
        }
    }

    Ok(())
}

#[repr(C)]
struct UnicodeString {
    length: u16,
    maximum_length: u16,
    buffer: *const u16,
}

impl UnicodeString {
    unsafe fn as_slice(&self) -> &[u16] {
        unsafe { std::slice::from_raw_parts(self.buffer, self.length as usize / 2) }
    }

    unsafe fn ends_with_ignore_case(&self, suffix: &str) -> bool {
        String::from_utf16_lossy(unsafe { self.as_slice() })
            .to_ascii_lowercase()
            .ends_with(suffix)
    }
}

#[repr(C)]
struct LdrDllNotificationData {
    flags: u32,
    _pad: u32,
    full_dll_name: *const UnicodeString,
    base_dll_name: *const UnicodeString,
    dll_base: *mut core::ffi::c_void,
    size_of_image: u32,
}

type FnLdrRegisterDllNotification = unsafe extern "system" fn(
    flags: u32,
    notify: Option<
        unsafe extern "system" fn(
            u32,
            *const LdrDllNotificationData,
            *mut core::ffi::c_void,
        ) -> i32,
    >,
    context: *mut core::ffi::c_void,
    cookie: *mut *mut core::ffi::c_void,
) -> i32;

unsafe extern "system" fn unity_load_notify(
    reason: u32,
    data: *const LdrDllNotificationData,
    _context: *mut core::ffi::c_void,
) -> i32 {
    if reason == 1 && !data.is_null() {
        let data = unsafe { &*data };
        let is_unity = [data.base_dll_name, data.full_dll_name]
            .into_iter()
            .filter_map(|p| unsafe { p.as_ref() })
            .any(|u| unsafe { u.ends_with_ignore_case("unityplayer.dll") });

        if is_unity && data.dll_base as usize != 0 {
            let _ = unsafe { patch_sign(data.dll_base as usize, data.size_of_image as usize) };
        }
    }
    0
}

pub fn hook_unity_player() {
    static ONCE: std::sync::Once = std::sync::Once::new();
    ONCE.call_once(|| unsafe {
        if let Ok(unity) = GetModuleHandleW(w!("UnityPlayer.dll")) {
            let _ = patch_sign(unity.0 as usize, 0);
        } else if let Some(proc) = GetModuleHandleA(s!("ntdll.dll"))
            .ok()
            .and_then(|h| GetProcAddress(h, s!("LdrRegisterDllNotification")))
        {
            let reg_fn: FnLdrRegisterDllNotification = std::mem::transmute(proc);
            let mut cookie = std::ptr::null_mut();
            let _ = reg_fn(
                0,
                Some(unity_load_notify),
                std::ptr::null_mut(),
                &mut cookie,
            );
        }
    });
}