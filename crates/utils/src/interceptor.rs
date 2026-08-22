use ilhook::x64::{
    CallbackOption, HookFlags, HookPoint, HookType, Hooker, JmpBackRoutine, RetnRoutine,
};

pub struct Interceptor {
    pub hooks: Vec<HookPoint>,
}

#[allow(unused)]
impl Interceptor {
    #[allow(clippy::new_without_default)]
    pub const fn new() -> Self {
        Self { hooks: Vec::new() }
    }

    pub fn attach(&mut self, addr: usize, routine: JmpBackRoutine) {
        let hooker = Hooker::new(
            addr,
            HookType::JmpBack(routine),
            CallbackOption::None,
            0,
            HookFlags::empty(),
        );
        unsafe {
            let Ok(hook_point) = hooker.hook() else {
                panic!("Failed to attach 0x{addr:X}")
            };
            self.hooks.push(hook_point);
        }
    }

    pub fn replace(&mut self, addr: usize, routine: RetnRoutine) {
        let hooker = Hooker::new(
            addr,
            HookType::Retn(routine),
            CallbackOption::None,
            0,
            HookFlags::empty(),
        );

        unsafe {
            let Ok(hook_point) = hooker.hook() else {
                panic!("Failed to replace 0x{addr:X}")
            };
            self.hooks.push(hook_point);
        }
    }

    /// # Safety
    pub unsafe fn detach(&mut self) {
        for hook in self.hooks.drain(..) {
            unsafe {
                let _ = hook.unhook();
            }
        }
    }
}
