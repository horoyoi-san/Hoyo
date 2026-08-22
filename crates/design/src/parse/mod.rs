use std::sync::atomic::AtomicI32;

pub mod config;
pub mod excel;
pub mod textmap;

pub static COUNTER_CONFIGS: AtomicI32 = AtomicI32::new(0);
pub static COUNTER_EXCELS: AtomicI32 = AtomicI32::new(0);
pub static COUNTER_TEXTMAPS: AtomicI32 = AtomicI32::new(0);
