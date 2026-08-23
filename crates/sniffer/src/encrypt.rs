use std::sync::{
    Mutex,
    atomic::{AtomicUsize, Ordering},
};

use base64::Engine;
use il2cpp::{api::Il2CppArray, vm::object::Il2CppObject};

const KEY_LEN: usize = 4096;

static XOR_THIS: AtomicUsize = AtomicUsize::new(0);
static KEYS: Mutex<Vec<Vec<u8>>> = Mutex::new(Vec::new());

pub fn save_xor_this(this: usize) {
    XOR_THIS.store(this, Ordering::Release);
}

pub fn dump_current_key() {
    let this = XOR_THIS.load(Ordering::Acquire);
    if this == 0 {
        return;
    }

    let Ok(Some((holder, array, key))) = microseh::try_seh(|| unsafe {
        let field = super::init::EC2B_XOR_KEY_FIELD.as_ref()?;
        let holder = *(field.get_field_data_ptr(&Il2CppObject(this)) as *const usize);
        if holder == 0 {
            return None;
        }

        let array = *((holder + 0x10) as *const usize);
        if array == 0 {
            return None;
        }

        let array = Il2CppArray(array);
        (array.len() == KEY_LEN).then(|| (holder, array.0, array.to_vec::<u8>()))
    }) else {
        return;
    };

    let key_index = {
        let mut keys = KEYS.lock().unwrap_or_else(|e| e.into_inner());

        if keys.last().is_some_and(|last| last == &key) {
            return;
        }

        if keys
            .first()
            .is_some_and(|dispatch_key| dispatch_key == &key)
        {
            keys.truncate(1);
            super::handlers::PACKET_ORDER.store(0, Ordering::SeqCst);
        } else if keys.len() == 2 {
            keys[1] = key.clone();
        } else {
            keys.push(key.clone());
        }

        keys.len()
    };

    log::debug!(
        "[Sniffer][KEY #{key_index}] holder=0x{holder:X} array=0x{array:X} len={} base64={}",
        key.len(),
        base64::engine::general_purpose::STANDARD.encode(&key)
    );
}

pub fn xor_packet(data: &mut [u8], seq_id: u32) {
    let (key_index, key_name) = match seq_id {
        0 | 1 => (0, "dispatch"),
        _ => (1, "session"),
    };

    if KEYS
        .lock()
        .unwrap_or_else(|e| e.into_inner())
        .get(key_index)
        .cloned()
        .is_some_and(|key| {
            data.iter_mut()
                .zip(key.iter().cycle())
                .for_each(|(byte, key)| *byte ^= key);
            true
        })
    {
        return;
    }

    log::debug!("[Sniffer] missing captured {key_name} key for seq_id={seq_id}");
}
