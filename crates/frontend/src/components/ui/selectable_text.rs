use gpui::*;
use gpui_component::text::TextView;

pub fn maybe_selectable_text(
    selected: bool,
    id: impl Into<ElementId>,
    text: impl AsRef<str>,
) -> AnyElement {
    if selected {
        selectable_text(id, text)
    } else {
        div().child(text.as_ref().to_string()).into_any_element()
    }
}

pub fn selectable_text(id: impl Into<ElementId>, text: impl AsRef<str>) -> AnyElement {
    TextView::markdown(id, markdown_plain(text.as_ref()))
        .selectable(true)
        .into_any_element()
}

pub fn markdown_plain(text: &str) -> String {
    let mut out = String::with_capacity(text.len());
    for ch in text.chars() {
        if matches!(
            ch,
            '`' | '*'
                | '_'
                | '{'
                | '}'
                | '['
                | ']'
                | '('
                | ')'
                | '#'
                | '+'
                | '-'
                | '.'
                | '!'
                | '<'
                | '>'
                | '|'
        ) {
            out.push('\\');
        }
        out.push(ch);
    }
    out
}
