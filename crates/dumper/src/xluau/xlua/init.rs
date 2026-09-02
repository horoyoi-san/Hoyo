use std::sync::atomic::Ordering;

use utils::interceptor::Interceptor;
use windows::Win32::System::LibraryLoader::{GetModuleHandleW, GetProcAddress};

use super::{
    hooks::{luau_load_hook, xlua_loadbuffer_hook},
    state::{HOOK_READY, INIT_LOCK, LUA_SETTOP_FN, PCALL_FN, XLUA_LOADBUFFER_FN},
    types::{LuaPCall, LuaSetTop, XLuaLoadBuffer},
};

pub fn init() -> Result<(), String> {
    if HOOK_READY.load(Ordering::SeqCst) {
        return Ok(());
    }

    let _init_guard = INIT_LOCK
        .lock()
        .map_err(|_| "XLua init lock poisoned".to_string())?;
    if HOOK_READY.load(Ordering::SeqCst) {
        return Ok(());
    }

    let dll = unsafe { GetModuleHandleW(windows::core::w!("xluau.dll")) }
        .or_else(|_| unsafe { GetModuleHandleW(windows::core::w!("xlua.dll")) })
        .or_else(|_| unsafe { GetModuleHandleW(windows::core::w!("lua51.dll")) })
        .or_else(|_| unsafe { GetModuleHandleW(windows::core::w!("GameAssembly.dll")) })
        .map_err(|_| String::new())?;

    let addr = unsafe {
        GetProcAddress(
            dll,
            windows::core::PCSTR::from_raw(c"luau_load".as_ptr() as *const u8),
        )
    }
    .or_else(|| unsafe {
        GetProcAddress(
            dll,
            windows::core::PCSTR::from_raw(c"luaL_loadbuffer".as_ptr() as *const u8),
        )
    })
    .or_else(|| unsafe {
        GetProcAddress(
            dll,
            windows::core::PCSTR::from_raw(c"xluaL_loadbuffer".as_ptr() as *const u8),
        )
    })
    .ok_or("Lua/Luau load export not found")? as usize;

    let xlua_loadbuffer_addr = unsafe {
        GetProcAddress(
            dll,
            windows::core::PCSTR::from_raw(c"xluaL_loadbuffer".as_ptr() as *const u8),
        )
    }
    .or_else(|| unsafe {
        GetProcAddress(
            dll,
            windows::core::PCSTR::from_raw(c"luaL_loadbuffer".as_ptr() as *const u8),
        )
    })
    .or_else(|| unsafe {
        GetProcAddress(
            dll,
            windows::core::PCSTR::from_raw(c"luaL_loadbufferx".as_ptr() as *const u8),
        )
    })
    .map(|p| p as usize);

    if let Some(p) = unsafe {
        GetProcAddress(
            dll,
            windows::core::PCSTR::from_raw(c"lua_pcall".as_ptr() as *const u8),
        )
    }.or_else(|| unsafe {
        GetProcAddress(
            dll,
            windows::core::PCSTR::from_raw(c"lua_pcallk".as_ptr() as *const u8),
        )
    }) {
        let pcall: LuaPCall = unsafe { std::mem::transmute(p) };
        let _ = PCALL_FN.set(pcall);
    }

    if let Some(p) = unsafe {
        GetProcAddress(
            dll,
            windows::core::PCSTR::from_raw(c"lua_settop".as_ptr() as *const u8),
        )
    } {
        let settop: LuaSetTop = unsafe { std::mem::transmute(p) };
        let _ = LUA_SETTOP_FN.set(settop);
    }

    if let Some(addr) = xlua_loadbuffer_addr {
        let xlua_loadbuffer: XLuaLoadBuffer = unsafe { std::mem::transmute(addr) };
        let _ = XLUA_LOADBUFFER_FN.set(xlua_loadbuffer);
    }

    let mut interceptor = Interceptor::new();
    interceptor.replace(addr, luau_load_hook);
    if let Some(addr) = xlua_loadbuffer_addr {
        interceptor.replace(addr, xlua_loadbuffer_hook);
    }
    Box::leak(Box::new(interceptor));
    HOOK_READY.store(true, Ordering::SeqCst);
    log::debug!("[XLua] hook installed for module");

    Ok(())
}
