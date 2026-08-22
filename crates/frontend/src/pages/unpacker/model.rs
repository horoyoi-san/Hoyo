use std::path::PathBuf;
use std::sync::Arc;

use gpui::RenderImage;
use unpacker::{AssetEntry, ExtractStats};

pub(super) enum UnpackMsg {
    ScanProgress(usize, usize),
    ScanDone(Vec<AssetEntry>),
    ExtractProgress(usize, usize, ExtractStats),
    ExtractDone(ExtractStats),
    Preview(i64, Arc<RenderImage>, Arc<image::RgbaImage>),
    PreviewFailed(i64, String),
    Thumb(i64, Option<Arc<RenderImage>>),
}

pub(super) struct ThumbReq {
    pub(super) block: PathBuf,
    pub(super) path_id: i64,
}

pub(super) struct PreviewReq {
    pub(super) block: PathBuf,
    pub(super) path_id: i64,
}
