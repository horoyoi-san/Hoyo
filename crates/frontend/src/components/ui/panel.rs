use gpui::{App, Styled, px, rgba};

pub trait PanelExt: Styled + Sized {
    fn panel(self, _cx: &App) -> Self {
        self.rounded(px(6.))
            .border_1()
            .border_color(rgba(0xffffff1a))
            .bg(rgba(0x141824cc))
    }
}

impl<T: Styled + Sized> PanelExt for T {}
