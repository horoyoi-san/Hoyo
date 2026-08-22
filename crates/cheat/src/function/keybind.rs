use std::sync::Mutex;

static REGISTRY: Mutex<Vec<(i32, String, String)>> = Mutex::new(Vec::new());
static TRIGGERED: Mutex<Vec<(String, String)>> = Mutex::new(Vec::new());

pub fn register_keybind(name: String, key: String, key_code: i32) {
    let mut registry = REGISTRY.lock().unwrap();
    registry.retain(|(_, n, k)| !(n == &name && k == &key));
    if key_code != 0 {
        registry.push((key_code, name, key));
    }
}

pub(crate) fn tick() {
    let registry = REGISTRY.lock().unwrap();
    if registry.is_empty() {
        return;
    }

    let mut hits = Vec::new();
    for (key_code, name, key) in registry.iter() {
        if super::get_key_down(*key_code) {
            hits.push((name.clone(), key.clone()));
        }
    }
    drop(registry);

    if !hits.is_empty() {
        TRIGGERED.lock().unwrap().extend(hits);
    }
}

pub fn take_triggered() -> Vec<(String, String)> {
    std::mem::take(&mut *TRIGGERED.lock().unwrap())
}
