use std::time::Duration;

use gpui::Context;

use super::model::UnpackMsg;
use super::{THUMB_CAP, UnpackerPage};

const PUMP_INTERVAL: Duration = Duration::from_millis(30);

impl UnpackerPage {
    pub(super) fn start_pump(&mut self, cx: &mut Context<Self>) {
        let Some(rx) = self.rx.take() else {
            return;
        };
        let task = cx.spawn(async move |this, cx| {
            loop {
                smol::Timer::after(PUMP_INTERVAL).await;
                let msgs: Vec<UnpackMsg> = std::iter::from_fn(|| rx.try_recv().ok()).collect();
                let alive = this
                    .update(cx, |page, cx| {
                        if !msgs.is_empty() {
                            for m in msgs {
                                page.apply(m, cx);
                            }
                            cx.notify();
                        }
                    })
                    .is_ok();
                if !alive {
                    break;
                }
            }
        });
        self.pump = Some(task);
    }

    fn apply(&mut self, msg: UnpackMsg, cx: &mut Context<Self>) {
        match msg {
            UnpackMsg::ScanProgress(done, total) => {
                self.status = format!("Loading… {done}/{total} blocks");
            }
            UnpackMsg::ScanDone(assets) => {
                self.busy = false;
                self.assets = assets;
                self.selected = None;
                self.preview = None;
                self.preview_error = None;
                self.pending_drops
                    .extend(self.thumbs.drain().filter_map(|(_, v)| v));
                self.thumb_order.clear();
                self.thumb_requested.lock().unwrap().clear();
                self.expanded.clear();
                self.rebuild_tree(cx);
                self.status = format!("Loaded {} SpriteOutput textures.", self.assets.len());
                log::info!("[Unpacker] loaded {} sprite textures", self.assets.len());
            }
            UnpackMsg::ExtractProgress(done, total, stats) => {
                self.status = format!(
                    "Exporting… {done}/{total} blocks · {} files",
                    stats.extracted
                );
            }
            UnpackMsg::ExtractDone(stats) => {
                self.busy = false;
                self.status = format!(
                    "Export done. {} files, {} errors.",
                    stats.extracted, stats.errors
                );
                log::info!(
                    "[Unpacker] export complete: {} files, {} errors",
                    stats.extracted,
                    stats.errors
                );
            }
            UnpackMsg::Preview(path_id, image, rgba) => {
                if self.selected_path_id() == Some(path_id) {
                    self.preview = Some(image);
                    self.preview_rgba = Some(rgba);
                    self.preview_error = None;
                }
            }
            UnpackMsg::PreviewFailed(path_id, err) => {
                if self.selected_path_id() == Some(path_id) {
                    self.preview = None;
                    self.preview_rgba = None;
                    self.preview_error = Some(err);
                }
            }
            UnpackMsg::Thumb(path_id, image) => {
                if self.thumbs.insert(path_id, image).is_none() {
                    self.thumb_order.push_back(path_id);
                }
                while self.thumb_order.len() > THUMB_CAP {
                    if let Some(old) = self.thumb_order.pop_front() {
                        if let Some(Some(img)) = self.thumbs.remove(&old) {
                            self.pending_drops.push(img);
                        }
                        self.thumb_requested.lock().unwrap().remove(&old);
                    }
                }
            }
        }
    }

    pub(super) fn selected_path_id(&self) -> Option<i64> {
        self.selected
            .and_then(|i| self.assets.get(i))
            .map(|e| e.path_id)
    }
}
