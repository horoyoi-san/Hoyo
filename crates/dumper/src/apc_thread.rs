use il2cpp::get_native_method;
use ilhook::x64::Registers;
use std::{
    collections::VecDeque,
    sync::{
        Arc, LazyLock, Mutex, OnceLock,
        atomic::{AtomicBool, Ordering},
    },
};
use utils::Interceptor;
use windows::Win32::System::Threading::{GetCurrentThreadId, OpenThread, THREAD_ALL_ACCESS};

type MainThreadTask = Box<dyn FnOnce() + Send + 'static>;

static IS_THREAD_SET: AtomicBool = AtomicBool::new(false);
static THREAD_HANDLE: LazyLock<Arc<Mutex<usize>>> = LazyLock::new(|| Arc::new(Mutex::new(0)));
static UPDATE_INTERCEPTOR: OnceLock<usize> = OnceLock::new();
static TASK_QUEUE: LazyLock<Mutex<VecDeque<MainThreadTask>>> =
    LazyLock::new(|| Mutex::new(VecDeque::new()));

extern "win64" fn routine(_: *mut Registers, _: usize) {
    if IS_THREAD_SET
        .compare_exchange(false, true, Ordering::Release, Ordering::Relaxed)
        .is_ok()
    {
        set_thread_handle();
    }

    drain_pending_tasks();
    crate::xluau::xlua::drain_pending_scripts();
    cheat::on_frame_update();
    crate::ipc::flush_keybind_triggers();
}

#[inline(always)]
pub fn init_apc_thread() {
    let mut interceptor = Interceptor::new();
    interceptor.attach(
        get_native_method("RPG.Client.Main::Update()").unwrap().va(),
        routine,
    );
    let interceptor_ptr = Box::into_raw(Box::new(interceptor)) as usize;
    let _ = UPDATE_INTERCEPTOR.set(interceptor_ptr);

    log::debug!("[APC Thread] Main::Update hook installed");
}

#[inline(always)]
fn set_thread_handle() {
    let mut handle_guard = THREAD_HANDLE.lock().unwrap();
    let new_handle = unsafe { OpenThread(THREAD_ALL_ACCESS, false, GetCurrentThreadId()) }.unwrap();
    if !new_handle.is_invalid() {
        *handle_guard = new_handle.0 as usize;
    }
}

fn drain_pending_tasks() {
    loop {
        let task = TASK_QUEUE.lock().unwrap().pop_front();
        let Some(task) = task else {
            break;
        };

        task();
    }
}

#[allow(dead_code)]
#[inline(always)]
pub fn call_in_thread<F>(closure: F)
where
    F: FnOnce() + Send + 'static,
{
    TASK_QUEUE.lock().unwrap().push_back(Box::new(closure));
}
