use std::io::{self, Error};

use patternscan::scan_first_match;
use windows::Win32::System::{
    Diagnostics::Debug::FlushInstructionCache,
    Memory::{PAGE_EXECUTE_READWRITE, PAGE_PROTECTION_FLAGS, VirtualProtect},
    Threading::GetCurrentProcess,
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
        log::debug!(
            "pool1 size RVA 0x{offset:X} {}MB -> 1GB (0x{old_val:X} -> 0x{new_val:X})",
            old_val / 0x100000
        );
    } else {
        log::warn!("pool1 size pattern not found, skipping patch");
    }

    Ok(())
}
