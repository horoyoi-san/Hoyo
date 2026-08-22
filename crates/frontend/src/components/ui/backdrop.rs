use gpui::*;

pub fn dialog_backdrop_scrim() -> Div {
    div()
        .absolute()
        .top_0()
        .left_0()
        .right_0()
        .bottom_0()
        .bg(rgba(0x000000a6))
}
