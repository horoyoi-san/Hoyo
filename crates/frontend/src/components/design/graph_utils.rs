pub(crate) fn short_type(t: &str) -> String {
    t.rsplit('.').next().unwrap_or(t).to_string()
}

pub(crate) fn last_seg(pointer: &str) -> String {
    pointer.rsplit('/').next().unwrap_or(pointer).to_string()
}

pub(crate) fn ptr_seg(s: &str) -> String {
    s.replace('~', "~0").replace('/', "~1")
}

pub(crate) fn truncate(s: &str, max: usize) -> String {
    if s.chars().count() <= max {
        s.to_string()
    } else {
        let cut: String = s.chars().take(max.saturating_sub(1)).collect();
        format!("{cut}…")
    }
}

pub(crate) fn preview_of(v: &serde_json::Value) -> String {
    match v {
        serde_json::Value::Object(m) => format!("{{ {} keys }}", m.len()),
        serde_json::Value::Array(a) => format!("[ {} items ]", a.len()),
        serde_json::Value::String(s) => truncate(&s.replace('\n', " "), 40),
        serde_json::Value::Number(n) => n.to_string(),
        serde_json::Value::Bool(b) => b.to_string(),
        serde_json::Value::Null => "null".to_string(),
    }
}
