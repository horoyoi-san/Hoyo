use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ApiKind {
    Runtime,
    Native,
}

#[derive(Debug, Clone, Copy)]
pub struct ApiEntry {
    pub class: &'static str,
    pub member: &'static str,
    pub index: u32,
    pub kind: ApiKind,
    pub owner: &'static str,
    pub rust_fn: &'static str,
}

impl ApiEntry {
    #[inline]
    pub fn signature(&self) -> String {
        format!("{}::{}{}", self.class, self.member, self.index)
    }
}

inventory::collect!(ApiEntry);

#[inline]
pub fn all_entries() -> impl Iterator<Item = &'static ApiEntry> {
    inventory::iter::<ApiEntry>()
}

pub fn signature_of(owner: &str, rust_fn: &str) -> Option<String> {
    all_entries()
        .find(|e| e.owner == owner && e.rust_fn == rust_fn)
        .map(ApiEntry::signature)
}

pub fn assert_no_collisions() {
    let mut by_signature: HashMap<String, &'static ApiEntry> = HashMap::new();
    for entry in all_entries() {
        let sig = entry.signature();
        if let Some(existing) = by_signature.insert(sig.clone(), entry) {
            panic!(
                "[Reflection] duplicate ApiEntry signature {sig}: {}::{} and {}::{} both declare it",
                existing.owner, existing.rust_fn, entry.owner, entry.rust_fn
            );
        }
    }
    log::debug!(
        "[Reflection] api_table: {} declared APIs, no collisions",
        by_signature.len()
    );
}
