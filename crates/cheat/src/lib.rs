pub mod function;

pub use function::battle_speed::set_battle_speed_enabled;
pub use function::censorship::set_censorship_enabled;
pub use function::fov::set_fov_unlock_enabled;
pub use function::fps_unlock::set_fps_unlock_enabled;
pub use function::hide_ui::set_hide_ui_enabled;
pub use function::keybind::{register_keybind, take_triggered};
pub use function::on_frame_update;
