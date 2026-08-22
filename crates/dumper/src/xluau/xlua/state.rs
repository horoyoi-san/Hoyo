use std::{
    collections::VecDeque,
    sync::{
        Mutex, OnceLock,
        atomic::{AtomicBool, AtomicUsize},
    },
};

use super::types::{LuaLoad, LuaPCall, LuaSetTop, XLuaLoadBuffer};

pub static GAME_LUA_STATE: AtomicUsize = AtomicUsize::new(0);
pub static PENDING_SCRIPTS: Mutex<VecDeque<String>> = Mutex::new(VecDeque::new());
pub static PENDING_REALTIME_BYTECODES: Mutex<VecDeque<Vec<u8>>> = Mutex::new(VecDeque::new());
pub static PENDING_ON_LOAD_BYTECODES: Mutex<VecDeque<Vec<u8>>> = Mutex::new(VecDeque::new());
pub static PENDING_EXEC: AtomicBool = AtomicBool::new(false);
pub static HOOK_READY: AtomicBool = AtomicBool::new(false);
pub static INIT_LOCK: Mutex<()> = Mutex::new(());
pub static EXEC_LOCK: Mutex<()> = Mutex::new(());
pub static ORIGINAL_LUA_LOAD_FN: OnceLock<LuaLoad> = OnceLock::new();
pub static XLUA_LOADBUFFER_FN: OnceLock<XLuaLoadBuffer> = OnceLock::new();
pub static PCALL_FN: OnceLock<LuaPCall> = OnceLock::new();
pub static LUA_SETTOP_FN: OnceLock<LuaSetTop> = OnceLock::new();
