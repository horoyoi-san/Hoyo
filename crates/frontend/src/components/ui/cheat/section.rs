use gpui::*;
use gpui_component::{ActiveTheme, h_flex, v_flex};

type MouseHandler = Box<dyn Fn(&MouseDownEvent, &mut Window, &mut App) + 'static>;

pub struct Section {
    title: SharedString,
    description: Option<SharedString>,
    bind: Option<AnyElement>,
    control: Option<AnyElement>,
    rows: Vec<AnyElement>,
    on_bind: Option<MouseHandler>,
}

impl Section {
    pub fn new(title: impl Into<SharedString>) -> Self {
        Self {
            title: title.into(),
            description: None,
            bind: None,
            control: None,
            rows: Vec::new(),
            on_bind: None,
        }
    }

    pub fn description(mut self, description: impl Into<SharedString>) -> Self {
        self.description = Some(description.into());
        self
    }

    pub fn bind(mut self, bind: impl IntoElement) -> Self {
        self.bind = Some(bind.into_any_element());
        self
    }

    pub fn on_bind(
        mut self,
        handler: impl Fn(&MouseDownEvent, &mut Window, &mut App) + 'static,
    ) -> Self {
        self.on_bind = Some(Box::new(handler));
        self
    }

    pub fn control(mut self, control: impl IntoElement) -> Self {
        self.control = Some(control.into_any_element());
        self
    }

    #[allow(dead_code)]
    pub fn child(mut self, row: impl IntoElement) -> Self {
        self.rows.push(row.into_any_element());
        self
    }

    pub fn children(mut self, rows: impl IntoIterator<Item = impl IntoElement>) -> Self {
        self.rows
            .extend(rows.into_iter().map(IntoElement::into_any_element));
        self
    }

    pub fn render(self, cx: &App) -> Stateful<Div> {
        let theme = cx.theme();
        let id = SharedString::from(format!("section-{}", self.title));

        let mut title_block = v_flex().flex_1().min_w_0().child(
            div()
                .text_sm()
                .font_weight(FontWeight::BOLD)
                .text_color(theme.foreground)
                .child(self.title),
        );
        if let Some(description) = self.description {
            title_block = title_block.child(
                div()
                    .text_xs()
                    .text_color(theme.muted_foreground)
                    .child(description),
            );
        }

        let mut right = h_flex().gap_2().items_center().flex_none();
        if let Some(bind) = self.bind {
            right = right.child(bind);
        }
        if let Some(control) = self.control {
            right = right.child(control);
        }

        let header = h_flex()
            .relative()
            .justify_between()
            .items_center()
            .gap_3()
            .px_3()
            .py_2()
            .rounded(px(4.))
            .border_1()
            .border_color(rgba(0xd2a04a4d))
            .bg(rgba(0x1c2334f2))
            .child(crate::ui::hsr_star(18.0, rgb(0xd2a04a).into()))
            .child(title_block)
            .child(right)
            .child(
                div()
                    .absolute()
                    .left_0()
                    .right_0()
                    .top_0()
                    .h(px(2.))
                    .bg(rgba(0xd2a04a80)),
            );

        let mut panel = div()
            .id(id)
            .flex()
            .flex_col()
            .w(px(360.))
            .p_3()
            .gap_3()
            .rounded(px(6.))
            .border_1()
            .border_color(rgba(0xffffff1a))
            .bg(rgba(0x141824d9))
            .shadow_sm()
            .child(header);

        if let Some(handler) = self.on_bind {
            panel = panel.on_mouse_down(MouseButton::Middle, handler);
        }

        if !self.rows.is_empty() {
            panel = panel
                .child(div().h(px(1.)).bg(rgba(0xffffff14)))
                .child(v_flex().gap_1().children(self.rows));
        }

        panel
    }
}
