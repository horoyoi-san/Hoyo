use std::sync::Mutex;
use std::sync::atomic::Ordering;
use std::thread;

fn icon_urls(item_id: u32) -> [String; 1] {
    if item_id < 10000 {
        [format!(
            "https://cdn.neonteam.dev/neonteam/assets/spriteoutput/avatarshopicon/avatar/{item_id}.webp"
        )]
    } else {
        [format!(
            "https://cdn.neonteam.dev/neonteam/assets/spriteoutput/itemfigures/lightcone/{item_id}.webp"
        )]
    }
}

fn looks_like_image(b: &[u8]) -> bool {
    if b.len() < 12 {
        return false;
    }
    let png = b[..4] == [0x89, b'P', b'N', b'G'];
    let webp = &b[..4] == b"RIFF" && &b[8..12] == b"WEBP";
    png || webp
}

fn download_icon_bytes(agent: &ureq::Agent, item_id: u32) -> Option<Vec<u8>> {
    icon_urls(item_id).into_iter().find_map(|url| {
        let resp = agent.get(&url).call().ok()?;
        let bytes = resp.into_body().read_to_vec().ok()?;
        looks_like_image(&bytes).then_some(bytes)
    })
}

pub fn fetch_icon_bytes(
    item_ids: &[u32],
    progress: Option<&crate::Progress>,
) -> Vec<(u32, Vec<u8>)> {
    let mut ids: Vec<u32> = item_ids.iter().copied().filter(|id| *id != 0).collect();
    ids.sort_unstable();
    ids.dedup();
    if let Some(p) = progress {
        p.icons_total.store(ids.len(), Ordering::Relaxed);
    }
    if ids.is_empty() {
        return Vec::new();
    }

    let agent = crate::fetch::build_agent();
    let out: Mutex<Vec<(u32, Vec<u8>)>> = Mutex::new(Vec::with_capacity(ids.len()));
    for chunk in ids.chunks(12) {
        thread::scope(|s| {
            for &id in chunk {
                let agent = &agent;
                let out = &out;
                s.spawn(move || {
                    let bytes = download_icon_bytes(agent, id);
                    if let Some(p) = progress {
                        p.icons_done.fetch_add(1, Ordering::Relaxed);
                    }
                    if let Some(b) = bytes {
                        out.lock().unwrap().push((id, b));
                    }
                });
            }
        });
    }
    out.into_inner().unwrap()
}
