use gpui::*;
use gpui_component::ActiveTheme;

type MouseHandler = Box<dyn Fn(&MouseDownEvent, &mut Window, &mut App) + 'static>;

pub struct Bind {
    id: ElementId,
    label: SharedString,
    listening: bool,
    on_request: Option<MouseHandler>,
}

impl Bind {
    pub fn new(id: impl Into<ElementId>, label: impl Into<SharedString>) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
            listening: false,
            on_request: None,
        }
    }

    pub fn listening(mut self, listening: bool) -> Self {
        self.listening = listening;
        self
    }

    pub fn on_request(
        mut self,
        handler: impl Fn(&MouseDownEvent, &mut Window, &mut App) + 'static,
    ) -> Self {
        self.on_request = Some(Box::new(handler));
        self
    }

    pub fn render(self, cx: &App) -> Stateful<Div> {
        let theme = cx.theme();
        let (fg, bg, border) = if self.listening {
            (
                rgb(0x12141a).into(),
                crate::theme::gold_strong(),
                crate::theme::gold_flash(),
            )
        } else {
            (
                theme.foreground,
                rgba(0x181e2ecc).into(),
                rgba(0xffffff26).into(),
            )
        };
        let label = if self.listening {
            SharedString::from("Press…")
        } else {
            self.label
        };

        let mut chip = div()
            .id(self.id)
            .flex()
            .items_center()
            .justify_center()
            .min_w(px(56.))
            .px(px(8.))
            .py(px(2.))
            .rounded(px(4.))
            .border_1()
            .border_color(border)
            .bg(bg)
            .text_xs()
            .font_family(theme.mono_font_family.clone())
            .text_color(fg)
            .cursor_pointer()
            .hover(|chip| chip.border_color(crate::theme::gold_strong()))
            .child(label);

        if let Some(handler) = self.on_request {
            chip = chip.on_mouse_down(MouseButton::Left, handler);
        }

        chip
    }
}
