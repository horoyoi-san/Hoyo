use gpui::*;
use gpui_component::{ActiveTheme, h_flex};

type MouseHandler = Box<dyn Fn(&MouseDownEvent, &mut Window, &mut App) + 'static>;

pub struct Expand {
    id: ElementId,
    label: SharedString,
    leading: Option<AnyElement>,
    control: Option<AnyElement>,
    bind: Option<AnyElement>,
    listening: bool,
    on_bind: Option<MouseHandler>,
}

impl Expand {
    pub fn new(id: impl Into<ElementId>, label: impl Into<SharedString>) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
            leading: None,
            control: None,
            bind: None,
            listening: false,
            on_bind: None,
        }
    }

    pub fn leading(mut self, leading: impl IntoElement) -> Self {
        self.leading = Some(leading.into_any_element());
        self
    }

    pub fn control(mut self, control: impl IntoElement) -> Self {
        self.control = Some(control.into_any_element());
        self
    }

    pub fn bind(mut self, bind: impl IntoElement) -> Self {
        self.bind = Some(bind.into_any_element());
        self
    }

    pub fn listening(mut self, listening: bool) -> Self {
        self.listening = listening;
        self
    }

    pub fn on_bind(
        mut self,
        handler: impl Fn(&MouseDownEvent, &mut Window, &mut App) + 'static,
    ) -> Self {
        self.on_bind = Some(Box::new(handler));
        self
    }

    pub fn render(self, cx: &App) -> Stateful<Div> {
        let theme = cx.theme();

        let mut right = h_flex().gap_2().items_center().flex_none();
        if let Some(bind) = self.bind {
            right = right.child(bind);
        }
        if let Some(control) = self.control {
            right = right.child(control);
        }

        let leading = if let Some(leading) = self.leading {
            div().flex_1().min_w_0().child(leading)
        } else {
            div()
                .flex_1()
                .min_w_0()
                .text_sm()
                .text_color(theme.foreground)
                .child(self.label)
        };

        let mut row = div()
            .id(self.id)
            .flex()
            .flex_row()
            .items_center()
            .justify_between()
            .gap_3()
            .px(px(6.))
            .py(px(4.))
            .rounded(px(4.))
            .hover(|row| row.bg(rgba(0xffffff0d)))
            .child(leading)
            .child(right);

        if self.listening {
            row = row.bg(rgba(0xd2a04a26));
        }

        if let Some(handler) = self.on_bind {
            row = row.on_mouse_down(MouseButton::Middle, handler);
        }

        row
    }
}
