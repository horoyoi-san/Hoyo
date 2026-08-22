use std::path::PathBuf;
use std::sync::Arc;
use std::time::Duration;

use gpui::*;
use smol::Timer;

use super::GachaPage;

impl GachaPage {
    pub(super) fn fetch(&mut self, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }
        self.busy = true;
        self.report = None;
        self.pending_drops
            .extend(self.icons.drain().map(|(_, tex)| tex));
        self.progress = Arc::new(gacha::Progress::new());
        self.status = "Locating Warp link…".into();
        cx.notify();

        let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let view = cx.entity();
        let progress = self.progress.clone();

        {
            let view = view.clone();
            cx.spawn(async move |_this, cx| {
                loop {
                    Timer::after(Duration::from_millis(80)).await;
                    let busy = view.update(cx, |this, cx| {
                        cx.notify();
                        this.busy
                    });
                    if !busy {
                        break;
                    }
                }
            })
            .detach();
        }

        cx.spawn(async move |_this, cx| {
            let link_res = {
                let cwd = cwd.clone();
                cx.background_executor()
                    .spawn(async move {
                        gacha::find_link(&cwd).map(|u| {
                            let fresh = u.is_fresh();
                            let server = u.server;
                            (u.raw, fresh, server)
                        })
                    })
                    .await
            };
            view.update(cx, |this, cx| {
                match &link_res {
                    Ok((_raw, _fresh, server)) => {
                        this.server = Some(*server);
                    }
                    Err(e) => {
                        this.status = e.clone();
                        this.busy = false;
                    }
                }
                cx.notify();
            });
            if link_res.is_err() {
                return;
            }

            let data_res = {
                let cwd = cwd.clone();
                let progress = progress.clone();
                cx.background_executor()
                    .spawn(async move {
                        gacha::fetch_and_analyze_with_progress(&cwd, &progress).map(|d| d.report)
                    })
                    .await
            };
            let prefetch = view.update(cx, |this, cx| {
                let result = match data_res {
                    Ok(report) => {
                        this.status = format!(
                            "Done — {} pulls, {} × 5★.",
                            report.total_pulls, report.total_five
                        );
                        let ids: Vec<u32> = report
                            .categories
                            .iter()
                            .flat_map(|c| c.five_stars.iter().chain(c.four_stars.iter()))
                            .filter_map(|p| p.item_id.parse::<u32>().ok())
                            .collect();
                        this.odds = report
                            .categories
                            .iter()
                            .map(|c| {
                                let max = c.category.max_pity();
                                let gt = c.category.gacha_type();
                                (gt, gacha::pity_odds(c.current_pity, max))
                            })
                            .collect();
                        this.report = Some(report);
                        Some(ids)
                    }
                    Err(e) => {
                        this.status = format!("Fetch failed: {e}");
                        this.busy = false;
                        None
                    }
                };
                cx.notify();
                result
            });

            if let Some(ids) = prefetch {
                if !ids.is_empty() {
                    progress
                        .phase
                        .store(3, std::sync::atomic::Ordering::Relaxed);
                    let progress2 = progress.clone();
                    let bytes = cx
                        .background_executor()
                        .spawn(
                            async move { gacha::fetch_icon_bytes(&ids, Some(progress2.as_ref())) },
                        )
                        .await;
                    let decoded = cx
                        .background_executor()
                        .spawn(async move { super::shared::decode_icons(bytes) })
                        .await;
                    if !decoded.is_empty() {
                        view.update(cx, |this, cx| {
                            for (id, tex) in decoded {
                                this.icons.insert(id, tex);
                            }
                            cx.notify();
                        });
                    }
                }
                progress
                    .phase
                    .store(4, std::sync::atomic::Ordering::Relaxed);
                view.update(cx, |this, cx| {
                    this.busy = false;
                    cx.notify();
                });
            }
        })
        .detach();
    }

    pub(super) fn server_label(&self) -> &'static str {
        match self.server {
            Some(gacha::Server::Official) => "CN",
            Some(gacha::Server::Oversea) => "Global",
            None => "?",
        }
    }

    pub(super) fn is_event(cat: gacha::Category) -> bool {
        matches!(
            cat,
            gacha::Category::Character
                | gacha::Category::LightCone
                | gacha::Category::CollabCharacter
                | gacha::Category::CollabLightCone
        )
    }
}
