use super::model::{CheatAction, CheatModule};

pub fn toggle(module_id: &'static str, enabled: bool) {
    let module_name = super::get_modules()
        .into_iter()
        .find(|module| module.id == module_id)
        .map_or(module_id, |module| module.name);

    let (state, color) = if enabled {
        ("ON", "#00FF7F")
    } else {
        ("OFF", "#FF6B6B")
    };

    log::info!("[Cheat] toggle {module_id} -> {state}");
    toast(format!("<color={color}>{module_name} {state}</color>"));
}

pub fn action(module: &CheatModule, action: &CheatAction) {
    log::info!("[Cheat] run {}::{}", module.id, action.id);
    toast(format!(
        "<color=#FFD166>Run {}</color>: {}",
        module.name, action.label
    ));
}

pub fn toast(message: impl AsRef<str>) {
    super::model::notification::toast(message);
}
