use std::panic::{AssertUnwindSafe, catch_unwind};
use std::path::Path;
use std::sync::mpsc::{Receiver, Sender};
use std::sync::{Arc, Mutex};

use gpui::RenderImage;

use super::model::{PreviewReq, ThumbReq, UnpackMsg};

const THUMB_SIZE: u32 = 28;

pub(super) fn spawn_thumb_worker(rx: Receiver<ThumbReq>, tx: Sender<UnpackMsg>) {
    let rx = Arc::new(Mutex::new(rx));
    let workers = std::thread::available_parallelism()
        .map_or(4, |n| n.get().clamp(2, 6));
    for _ in 0..workers {
        let rx = rx.clone();
        let tx = tx.clone();
        std::thread::spawn(move || {
            while let Ok(req) = rx.lock().unwrap().recv() {
                let thumb = make_thumb(&req.block, req.path_id);
                let _ = tx.send(UnpackMsg::Thumb(req.path_id, thumb));
            }
        });
    }
}

fn make_thumb(block: &Path, path_id: i64) -> Option<Arc<RenderImage>> {
    let decoded = catch_unwind(AssertUnwindSafe(|| {
        unpacker::decode_texture(block, path_id)
    }))
    .ok()?
    .ok()?;
    let mut thumb = image::imageops::thumbnail(&decoded, THUMB_SIZE, THUMB_SIZE);
    for px in thumb.pixels_mut() {
        px.0.swap(0, 2);
    }
    Some(Arc::new(RenderImage::new(vec![image::Frame::new(thumb)])))
}

pub(super) fn spawn_preview_worker(rx: Receiver<PreviewReq>, tx: Sender<UnpackMsg>) {
    let _ = std::thread::Builder::new()
        .name("unp-preview".into())
        .spawn(move || {
            while let Ok(mut req) = rx.recv() {
                while let Ok(newer) = rx.try_recv() {
                    req = newer;
                }
                let decoded = catch_unwind(AssertUnwindSafe(|| {
                    unpacker::decode_texture(&req.block, req.path_id)
                }));
                let msg = match decoded {
                    Ok(Ok(image)) => {
                        let rgba = Arc::new(image);
                        UnpackMsg::Preview(req.path_id, rgba_to_render_image(&rgba), rgba)
                    }
                    Ok(Err(e)) => UnpackMsg::PreviewFailed(req.path_id, e.to_string()),
                    Err(_) => UnpackMsg::PreviewFailed(req.path_id, "decoder panicked".into()),
                };
                let _ = tx.send(msg);
            }
        });
}

fn rgba_to_render_image(image: &image::RgbaImage) -> Arc<RenderImage> {
    let mut bgra = image.clone();
    for px in bgra.pixels_mut() {
        px.0.swap(0, 2);
    }
    Arc::new(RenderImage::new(vec![image::Frame::new(bgra)]))
}

pub(super) fn copy_rgba_to_clipboard(rgba: &image::RgbaImage) -> Result<(), String> {
    let mut clipboard = arboard::Clipboard::new().map_err(|e| e.to_string())?;
    clipboard
        .set_image(arboard::ImageData {
            width: rgba.width() as usize,
            height: rgba.height() as usize,
            bytes: std::borrow::Cow::Borrowed(rgba.as_raw()),
        })
        .map_err(|e| e.to_string())
}
