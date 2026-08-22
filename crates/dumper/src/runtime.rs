use std::sync::OnceLock;

static RUNTIME_INIT: OnceLock<()> = OnceLock::new();

pub fn init_default() {
    RUNTIME_INIT.get_or_init(|| {
        il2cpp::init_il2cpp(false);
        reflection::init_reflection_methods();
    });
}

pub fn attach_current_thread_to_il2cpp() {
    let domain = il2cpp::api::il2cpp_domain_get();
    il2cpp::vm::thread::Il2CppThread::attach(domain);
}
