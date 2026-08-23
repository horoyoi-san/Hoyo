use std::collections::{HashMap, HashSet};

use crate::script_v2::constants;

pub fn fix_name(mut s: String) -> String {
    if s.is_empty() {
        return String::from("unk");
    }

    if constants::BASE_KEYWORDS.contains(&s.as_ref()) {
        s = format!("_{s}");
    } else if constants::SPECIAL_KEYWORDS.contains(&s.as_ref()) {
        s = format!("_{s}_");
    }

    // starts with digit
    if s.chars()
        .next()
        .map(|c| c.is_ascii_digit())
        .unwrap_or_default()
    {
        return format!("_{s}");
    }

    // replace non alphanumeric with "_"
    s.chars()
        .map(|c| match c {
            '*' => '*',
            c if c.is_ascii_alphanumeric() || c == '_' => c,
            _ => '_',
        })
        .collect()
}

#[derive(Default)]
pub struct FieldNameReserver {
    pub reserved_names: HashSet<String>,
    pub name_counters: HashMap<String, i32>,
}

impl FieldNameReserver {
    pub fn reserve_name(&mut self, original: &mut String, reserved: &str) {
        if original.trim().is_empty() {
            return;
        }

        if original == reserved {
            let counter = self
                .name_counters
                .entry(original.to_string())
                .or_insert_with(|| 1);

            let mut new_name = format!("{original}_{counter}");
            while self.reserved_names.contains(&new_name) {
                new_name = format!("{original}_{counter}");
                *counter += 1;
            }

            *original = new_name;
        }

        self.reserved_names.insert(original.to_string());
    }
}
