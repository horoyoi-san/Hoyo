use gpui::{prelude::FluentBuilder as _, *};
use gpui_component::{h_flex, scroll::Scrollbar};

use super::pill::pill;

#[derive(Clone, Copy)]
pub struct PacketTableColors {
    pub foreground: Hsla,
    pub muted: Hsla,
    pub selected: Hsla,
    pub hover: Hsla,
    pub body: Hsla,
}

pub struct PacketTableRow {
    pub row_id: String,
    pub display: String,
    pub cmd_cell_id: String,
    pub cmd_id: String,
    pub source: String,
    pub source_color: Hsla,
    pub pid_cell_id: String,
    pub pid: String,
    pub name_cell_id: String,
    pub name: String,
    pub len: String,
    pub body: String,
    pub selected: bool,
}

pub fn packet_header(c_muted: Hsla, border: Hsla) -> Div {
    h_flex()
        .gap_2()
        .px_2()
        .py(px(6.))
        .text_sm()
        .font_weight(FontWeight::BOLD)
        .text_color(c_muted)
        .border_b_1()
        .border_color(border)
        .child(div().w(px(44.)).flex_none().child("#"))
        .child(div().w(px(64.)).flex_none().child("CmdID"))
        .child(div().w(px(70.)).flex_none().child("Source"))
        .child(div().w(px(56.)).flex_none().child("PID"))
        .child(div().w(px(240.)).flex_none().child("Name"))
        .child(div().w(px(64.)).flex_none().child("Len"))
        .child(div().flex_1().min_w_0().child("Body"))
}

pub fn copy_on_double_click(text: String) -> impl Fn(&ClickEvent, &mut Window, &mut App) + 'static {
    move |event, _window, cx| {
        if event.standard_click() && event.click_count() == 2 {
            cx.write_to_clipboard(ClipboardItem::new_string(text.clone()));
            cx.stop_propagation();
        }
    }
}

pub fn packet_scrollbar(id: &'static str, scroll: &UniformListScrollHandle) -> Div {
    div()
        .absolute()
        .top_0()
        .left_0()
        .right_0()
        .bottom_0()
        .child(Scrollbar::vertical(scroll).id(id))
}

pub fn packet_row(
    row: PacketTableRow,
    colors: PacketTableColors,
    on_select: impl Fn(&ClickEvent, &mut Window, &mut App) + 'static,
) -> AnyElement {
    let cmd_id = row.cmd_id;
    let pid = row.pid;
    let name = row.name;

    div()
        .id(SharedString::from(row.row_id))
        .cursor_pointer()
        .w_full()
        .px_2()
        .py(px(3.))
        .min_h(px(26.))
        .when(row.selected, |row| row.bg(colors.selected))
        .hover(|row| row.bg(colors.hover))
        .on_click(on_select)
        .child(
            h_flex()
                .gap_2()
                .items_center()
                .text_sm()
                .child(
                    div()
                        .w(px(44.))
                        .flex_none()
                        .text_color(colors.muted)
                        .child(row.display),
                )
                .child(
                    div()
                        .id(SharedString::from(row.cmd_cell_id))
                        .w(px(64.))
                        .flex_none()
                        .text_color(colors.muted)
                        .on_click(copy_on_double_click(cmd_id.clone()))
                        .child(cmd_id),
                )
                .child(
                    h_flex()
                        .w(px(70.))
                        .flex_none()
                        .justify_center()
                        .child(pill(row.source, row.source_color).w(px(64.))),
                )
                .child(
                    div()
                        .id(SharedString::from(row.pid_cell_id))
                        .w(px(56.))
                        .flex_none()
                        .text_color(colors.muted)
                        .on_click(copy_on_double_click(pid.clone()))
                        .child(pid),
                )
                .child(
                    div()
                        .id(SharedString::from(row.name_cell_id))
                        .w(px(240.))
                        .flex_none()
                        .truncate()
                        .text_color(colors.foreground)
                        .on_click(copy_on_double_click(name.clone()))
                        .child(name),
                )
                .child(
                    div()
                        .w(px(64.))
                        .flex_none()
                        .text_color(colors.muted)
                        .child(row.len),
                )
                .child(
                    div()
                        .flex_1()
                        .min_w_0()
                        .truncate()
                        .text_color(colors.body)
                        .child(row.body),
                ),
        )
        .into_any_element()
}
