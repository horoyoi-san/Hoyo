pub mod function;

pub use function::censorship::set_censorship_enabled;
pub use function::hide_ui::set_hide_ui_enabled;
pub use function::keybind::{register_keybind, take_triggered};
pub use function::on_frame_update;
