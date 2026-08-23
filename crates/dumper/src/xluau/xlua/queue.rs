use std::sync::atomic::Ordering;

use crate::xluau::xluau_compile;

use super::{
    exec::{execute_bytecode_realtime, execute_script_realtime},
    init::init,
    state::{
        GAME_LUA_STATE, HOOK_READY, ORIGINAL_LUA_LOAD_FN, PCALL_FN, PENDING_EXEC,
        PENDING_ON_LOAD_BYTECODES, PENDING_REALTIME_BYTECODES, PENDING_SCRIPTS, XLUA_LOADBUFFER_FN,
    },
    types::MAX_PENDING_BYTECODES,
};

pub fn execute_script_string(script: String) -> Result<(), String> {
    if script.trim().is_empty() {
        return Err("script is empty".to_string());
    }

    if !HOOK_READY.load(Ordering::SeqCst) {
        init()?;
    }

    if ORIGINAL_LUA_LOAD_FN.get().is_some() {
        queue_script_bytecode(script, LuaQueueKind::Realtime)?;
    } else {
        PENDING_SCRIPTS
            .lock()
            .map_err(|_| "pending Lua script queue lock poisoned".to_string())?
            .push_back(script);
    }

    Ok(())
}

pub fn execute_script_on_load_string(script: String) -> Result<(), String> {
    if script.trim().is_empty() {
        return Err("script is empty".to_string());
    }

    if !HOOK_READY.load(Ordering::SeqCst) {
        init()?;
    }

    queue_script_bytecode(script, LuaQueueKind::OnLoad)
}

pub fn drain_pending_scripts() {
    if GAME_LUA_STATE.load(Ordering::SeqCst) == 0 || PCALL_FN.get().is_none() {
        return;
    }

    loop {
        let Some(bytecode) = PENDING_REALTIME_BYTECODES.lock().unwrap().pop_front() else {
            break;
        };

        if let Err(e) = execute_bytecode_realtime(&bytecode) {
            log::debug!("[XLua] bytecode execute failed: {e}");
        }
    }

    if XLUA_LOADBUFFER_FN.get().is_none() {
        return;
    }

    loop {
        let Some(script) = PENDING_SCRIPTS.lock().unwrap().pop_front() else {
            break;
        };

        if let Err(e) = execute_script_realtime(&script) {
            log::debug!("[XLua] realtime execute failed: {e}");
        }
    }
}

enum LuaQueueKind {
    Realtime,
    OnLoad,
}

fn queue_script_bytecode(script: String, kind: LuaQueueKind) -> Result<(), String> {
    let bytecode = unsafe { xluau_compile::compile(script) };
    if bytecode.is_empty() {
        return Err("compile failed".to_string());
    }

    match kind {
        LuaQueueKind::Realtime => push_limited(&PENDING_REALTIME_BYTECODES, bytecode.to_vec())?,
        LuaQueueKind::OnLoad => {
            push_limited(&PENDING_ON_LOAD_BYTECODES, bytecode.to_vec())?;
            PENDING_EXEC.store(true, Ordering::SeqCst);
        }
    }

    Ok(())
}

fn push_limited(
    queue: &std::sync::Mutex<std::collections::VecDeque<Vec<u8>>>,
    bytecode: Vec<u8>,
) -> Result<(), String> {
    let mut pending = queue
        .lock()
        .map_err(|_| "pending Lua bytecode queue lock poisoned".to_string())?;
    while pending.len() >= MAX_PENDING_BYTECODES {
        pending.pop_front();
    }
    pending.push_back(bytecode);
    Ok(())
}
