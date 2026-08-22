use std::sync::atomic::Ordering;

use ilhook::x64::Registers;
use windows::Win32::System::Memory::{
    MEM_COMMIT, MEM_RESERVE, PAGE_EXECUTE_READWRITE, VirtualAlloc,
};

use super::{
    state::{
        GAME_LUA_STATE, ORIGINAL_LUA_LOAD_FN, PCALL_FN, PENDING_EXEC, PENDING_ON_LOAD_BYTECODES,
    },
    types::{LuaLoad, LuaState, XLuaLoadBuffer},
};

pub unsafe extern "win64" fn luau_load_hook(
    reg: *mut Registers,
    actual_func: usize,
    _: usize,
) -> usize {
    unsafe { GAME_LUA_STATE.store((*reg).rcx as usize, Ordering::SeqCst) };
    let luau_load: LuaLoad = unsafe { std::mem::transmute(actual_func) };
    let _ = ORIGINAL_LUA_LOAD_FN.set(luau_load);

    if PENDING_EXEC.swap(false, Ordering::SeqCst) {
        let bytecode = {
            let mut pending = PENDING_ON_LOAD_BYTECODES.lock().unwrap();
            let bytecode = pending.pop_front();
            if !pending.is_empty() {
                PENDING_EXEC.store(true, Ordering::SeqCst);
            }
            bytecode
        };

        if let Some(bytecode) = bytecode {
            let len = bytecode.len();
            let ptr = unsafe {
                VirtualAlloc(None, len, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE) as *mut u8
            };
            if !ptr.is_null() {
                unsafe { std::ptr::copy_nonoverlapping(bytecode.as_ptr(), ptr, len) };
                let state = unsafe { (*reg).rcx as usize as LuaState };
                let chunkname = unsafe { (*reg).rdx as *const i8 };
                unsafe { luau_load(state, chunkname, ptr, len, 0) };
                if let Some(pcall) = PCALL_FN.get() {
                    unsafe { pcall(state, 0, 0, 0) };
                }
            }
        }
    }

    unsafe {
        luau_load(
            (*reg).rcx as usize as LuaState,
            (*reg).rdx as *const i8,
            (*reg).r8 as *const u8,
            (*reg).r9 as usize,
            0,
        ) as usize
    }
}

pub unsafe extern "win64" fn xlua_loadbuffer_hook(
    reg: *mut Registers,
    actual_func: usize,
    _: usize,
) -> usize {
    unsafe { GAME_LUA_STATE.store((*reg).rcx as usize, Ordering::SeqCst) };

    let xlua_loadbuffer: XLuaLoadBuffer = unsafe { std::mem::transmute(actual_func) };
    unsafe {
        xlua_loadbuffer(
            (*reg).rcx as usize as LuaState,
            (*reg).rdx as *const i8,
            (*reg).r8 as usize,
            (*reg).r9 as *const i8,
        ) as usize
    }
}
