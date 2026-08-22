pub type LuaState = *mut std::ffi::c_void;
pub type LuaLoad = unsafe extern "system" fn(LuaState, *const i8, *const u8, usize, i32) -> i32;
pub type XLuaLoadBuffer = unsafe extern "system" fn(LuaState, *const i8, usize, *const i8) -> i32;
pub type LuaPCall = unsafe extern "system" fn(LuaState, i32, i32, i32) -> i32;
pub type LuaSetTop = unsafe extern "system" fn(LuaState, i32);

pub const MAX_PENDING_BYTECODES: usize = 4;
