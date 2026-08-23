use std::sync::atomic::Ordering;

use windows::Win32::System::Memory::{
    MEM_COMMIT, MEM_RESERVE, PAGE_EXECUTE_READWRITE, VirtualAlloc,
};

use super::{
    state::{
        EXEC_LOCK, GAME_LUA_STATE, LUA_SETTOP_FN, ORIGINAL_LUA_LOAD_FN, PCALL_FN,
        XLUA_LOADBUFFER_FN,
    },
    types::LuaState,
};

pub fn execute_bytecode_realtime(bytecode: &[u8]) -> Result<(), String> {
    let state = GAME_LUA_STATE.load(Ordering::SeqCst) as LuaState;
    if state.is_null() {
        return Err("lua state is not ready".to_string());
    }

    let Some(luau_load) = ORIGINAL_LUA_LOAD_FN.get() else {
        return Err("luau_load trampoline is not ready".to_string());
    };
    let Some(pcall) = PCALL_FN.get() else {
        return Err("lua_pcall is not ready".to_string());
    };

    let _exec_guard = EXEC_LOCK
        .lock()
        .map_err(|_| "XLua exec lock poisoned".to_string())?;

    let len = bytecode.len();
    let ptr = unsafe {
        VirtualAlloc(None, len, MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE) as *mut u8
    };
    if ptr.is_null() {
        return Err("VirtualAlloc failed".to_string());
    }

    unsafe { std::ptr::copy_nonoverlapping(bytecode.as_ptr(), ptr, len) };
    let load_result = unsafe { luau_load(state, c"frontend".as_ptr(), ptr, len, 0) };
    if load_result != 0 {
        pop_lua_stack(state, 1);
        return Err(format!("luau_load failed: {load_result}"));
    }

    let call_result = unsafe { pcall(state, 0, 0, 0) };
    if call_result != 0 {
        pop_lua_stack(state, 1);
        return Err(format!("lua_pcall failed: {call_result}"));
    }

    Ok(())
}

pub fn execute_script_realtime(script: &str) -> Result<bool, String> {
    let state = GAME_LUA_STATE.load(Ordering::SeqCst) as LuaState;
    if state.is_null() {
        return Ok(false);
    }

    let Some(loadbuffer) = XLUA_LOADBUFFER_FN.get() else {
        return Ok(false);
    };
    let Some(pcall) = PCALL_FN.get() else {
        return Ok(false);
    };

    let _exec_guard = EXEC_LOCK
        .lock()
        .map_err(|_| "XLua exec lock poisoned".to_string())?;

    let load_result = unsafe {
        loadbuffer(
            state,
            script.as_bytes().as_ptr() as *const i8,
            script.len(),
            c"frontend".as_ptr(),
        )
    };
    if load_result != 0 {
        pop_lua_stack(state, 1);
        return Err(format!("xluaL_loadbuffer failed: {load_result}"));
    }

    let call_result = unsafe { pcall(state, 0, 0, 0) };
    if call_result != 0 {
        pop_lua_stack(state, 1);
        return Err(format!("lua_pcall failed: {call_result}"));
    }

    Ok(true)
}

fn pop_lua_stack(state: LuaState, amount: i32) {
    if let Some(settop) = LUA_SETTOP_FN.get() {
        unsafe { settop(state, -amount - 1) };
    }
}
