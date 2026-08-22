use super::{AvatarEntry, PlayerSummary, UidPage, calc, own, resources, schema};
use gpui::*;
use rayon::prelude::*;
use resources::ResourceDb;
use schema::{AvatarDataRsp, BagRsp, DisplayAvatar, UidDump};
use smol::Timer;
use std::sync::Arc;
use std::time::Duration;

impl UidPage {
    pub(crate) fn load_source(&mut self, json: String, cx: &mut Context<Self>) {
        if self.busy {
            return;
        }
        self.busy = true;
        *self.progress.lock().unwrap() = "Loading panel data…".into();
        cx.notify();

        let db = self.db.clone();
        let language = self.language;
        let progress = self.progress.clone();
        let view = cx.entity();

        {
            let view = view.clone();
            let progress = progress.clone();
            cx.spawn(async move |_this, cx| {
                loop {
                    Timer::after(Duration::from_millis(120)).await;
                    let busy = view.update(cx, |this, cx| {
                        if this.busy {
                            this.status = Some(progress.lock().unwrap().clone());
                            cx.notify();
                        }
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
            let result = cx
                .background_executor()
                .spawn(async move {
                    let db = if let Some(db) = db { db } else {
                        let report = {
                            let progress = progress.clone();
                            move |s: String| {
                                *progress.lock().unwrap() = format!("Fetching {s}…");
                            }
                        };
                        Arc::new(ResourceDb::fetch_online(&report)?)
                    };

                    *progress.lock().unwrap() = "Parsing panels…".into();
                    let dump: UidDump = serde_json::from_str(&json)?;
                    let info = dump.detail_info;

                    if info.uid == 0
                        && info.display_avatar_list.is_empty()
                        && info.assist_avatar_list.is_empty()
                    {
                        anyhow::bail!("empty response (invalid UID, or fetch it while in-game)");
                    }

                    let player = PlayerSummary {
                        nickname: info.nickname.clone(),
                        uid: info.uid,
                        level: info.level,
                        world_level: info.world_level,
                        signature: info.signature.clone(),
                        friend_count: info.friend_count,
                        birthday: info.birthday,
                        achievement_count: info.record_info.achievement_count,
                        avatar_count: info.record_info.avatar_count,
                        lightcone_count: info.record_info.lightcone_count,
                        su_count: info.record_info.su_count,
                    };

                    let mut raw: Vec<(bool, DisplayAvatar)> = Vec::new();
                    for avatar in info.assist_avatar_list {
                        raw.push((true, avatar));
                    }
                    for avatar in info.display_avatar_list {
                        raw.push((false, avatar));
                    }

                    let entries: Vec<AvatarEntry> = raw
                        .iter()
                        .filter_map(|(assist, avatar)| {
                            if let Some(panel) = calc::build_panel(&db, language, avatar) { Some(AvatarEntry {
                                panel,
                                assist: *assist,
                            }) } else {
                                log::warn!("uid: cannot resolve avatar {}", avatar.avatar_id);
                                None
                            }
                        })
                        .collect();

                    anyhow::Ok((db, player, raw, entries))
                })
                .await;

            view.update(cx, |this, cx| {
                match result {
                    Ok((db, player, raw, entries)) => {
                        this.db = Some(db);
                        this.player = Some(player);
                        this.raw = raw;
                        this.entries = entries;
                        this.selected = 0;
                        this.status = None;
                    }
                    Err(e) => this.status = Some(format!("Load failed: {e:#}")),
                }
                this.busy = false;
                cx.notify();
            });
        })
        .detach();
    }

    pub(crate) fn load_own(
        &mut self,
        avatar_json: String,
        bag_json: String,
        cx: &mut Context<Self>,
    ) {
        if self.busy {
            return;
        }
        self.busy = true;
        *self.progress.lock().unwrap() = "Loading your panels…".into();
        cx.notify();

        let db = self.db.clone();
        let language = self.language;
        let progress = self.progress.clone();
        let view = cx.entity();

        {
            let view = view.clone();
            let progress = progress.clone();
            cx.spawn(async move |_this, cx| {
                loop {
                    Timer::after(Duration::from_millis(120)).await;
                    let busy = view.update(cx, |this, cx| {
                        if this.busy {
                            this.status = Some(progress.lock().unwrap().clone());
                            cx.notify();
                        }
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
            let result = cx
                .background_executor()
                .spawn(async move {
                    let db = if let Some(db) = db { db } else {
                        let report = {
                            let progress = progress.clone();
                            move |s: String| {
                                *progress.lock().unwrap() = format!("Fetching {s}…");
                            }
                        };
                        Arc::new(ResourceDb::fetch_online(&report)?)
                    };

                    *progress.lock().unwrap() = "Parsing your account…".into();
                    let data: AvatarDataRsp = serde_json::from_str(&avatar_json)?;
                    let bag: BagRsp = serde_json::from_str(&bag_json)?;
                    let avatars = own::to_display_avatars(&data, &bag, &db);
                    if avatars.is_empty() {
                        anyhow::bail!("no avatars (open the character screen in-game and retry)");
                    }

                    let mut built: Vec<(DisplayAvatar, calc::AvatarPanel)> = avatars
                        .into_iter()
                        .filter_map(|a| calc::build_panel(&db, language, &a).map(|p| (a, p)))
                        .collect();
                    built.sort_by_key(|(_, p)| {
                        (
                            std::cmp::Reverse(p.rarity),
                            std::cmp::Reverse(p.level),
                            std::cmp::Reverse((p.relics.len() == 6) as u8),
                            std::cmp::Reverse((p.total_score * 1000.0) as i64),
                            std::cmp::Reverse(p.avatar_id),
                        )
                    });
                    let (raw, entries): (Vec<(bool, DisplayAvatar)>, Vec<AvatarEntry>) = built
                        .into_iter()
                        .map(|(a, p)| {
                            (
                                (false, a),
                                AvatarEntry {
                                    panel: p,
                                    assist: false,
                                },
                            )
                        })
                        .unzip();

                    anyhow::Ok((db, raw, entries))
                })
                .await;

            view.update(cx, |this, cx| {
                match result {
                    Ok((db, raw, entries)) => {
                        this.db = Some(db);
                        this.player = None;
                        this.raw = raw;
                        this.entries = entries;
                        this.selected = 0;
                        this.status = None;
                    }
                    Err(e) => this.status = Some(format!("Own load failed: {e:#}")),
                }
                this.busy = false;
                cx.notify();
            });
        })
        .detach();
    }

    pub(crate) fn dispatch_pending_icons(&mut self, cx: &mut Context<Self>) {
        let pending: Vec<(String, u32)> = self.pending_icons.borrow_mut().drain(..).collect();
        let mut to_fetch: Vec<(String, u32)> = Vec::new();
        for (url, target) in pending {
            let key = format!("{url}#{target}");
            if self.icons_requested.insert(key) {
                to_fetch.push((url, target));
            }
        }
        if to_fetch.is_empty() {
            return;
        }

        let view = cx.entity();
        cx.spawn(async move |_this, cx| {
            let decoded = cx
                .background_executor()
                .spawn(async move {
                    to_fetch
                        .into_par_iter()
                        .filter_map(|(url, target)| {
                            let (fetch_url, tint) = match url.split_once('|') {
                                Some((u, hex)) => (u, u32::from_str_radix(hex, 16).ok()),
                                None => (url.as_str(), None),
                            };
                            let bytes = resources::http_get_bytes(fetch_url).ok()?;
                            let mut image = image::load_from_memory(&bytes).ok()?;
                            if fetch_url.contains("/avataricon/") {
                                let (w, h) = (image.width(), image.height());
                                let side = w.min(h);
                                let x = (w - side) / 2;
                                image = image.crop_imm(x, 0, side, side);
                            }
                            if image.width().max(image.height()) > target {
                                image = image.resize(target, target, image::imageops::Lanczos3);
                            }
                            let mut bgra = image.to_rgba8();
                            if let Some(tint) = tint {
                                let [r, g, b] = [(tint >> 16) as u8, (tint >> 8) as u8, tint as u8];
                                for px in bgra.pixels_mut() {
                                    px.0[0] = r;
                                    px.0[1] = g;
                                    px.0[2] = b;
                                }
                            }
                            for px in bgra.pixels_mut() {
                                px.0.swap(0, 2);
                            }
                            Some((
                                format!("{url}#{target}"),
                                Arc::new(RenderImage::new(vec![image::Frame::new(bgra)])),
                            ))
                        })
                        .collect::<Vec<_>>()
                })
                .await;

            if decoded.is_empty() {
                return;
            }
            view.update(cx, |this, cx| {
                for (key, tex) in decoded {
                    this.icons.insert(key, tex);
                }
                cx.notify();
            });
        })
        .detach();
    }

    pub(crate) fn icon_tex(&self, url: &str, size: f32) -> Option<Arc<RenderImage>> {
        if url.is_empty() {
            return None;
        }
        let target = ((size * 2.0).ceil() as u32).max(1);
        let key = format!("{url}#{target}");
        self.icons.get(&key).cloned().or_else(|| {
            if !self.icons_requested.contains(&key) {
                self.pending_icons
                    .borrow_mut()
                    .push((url.to_string(), target));
            }
            None
        })
    }
}
