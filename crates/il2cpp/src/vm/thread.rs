use crate::{api, vm::domain::Il2CppDomain};

#[derive(Clone, Copy)]
#[repr(transparent)]
pub struct Il2CppThread(pub usize);

#[allow(unused)]
impl Il2CppThread {
    #[inline]
    pub fn attach(domain: Il2CppDomain) -> Self {
        api::il2cpp_thread_attach(domain)
    }
}
