use gpui::*;
use image::Frame;
use std::sync::{Arc, OnceLock};

pub const ANIM_BIN_BYTES: &[u8] = include_bytes!("../../../../../Assets/BackGround/anim.bin");

static DECOMPRESSED_ANIM_DATA: OnceLock<Vec<u8>> = OnceLock::new();

pub fn get_anim_raw_data(data: &'static [u8]) -> &'static [u8] {
    if data.len() >= 16 && &data[0..8] == b"HSR_OODL" {
        DECOMPRESSED_ANIM_DATA.get_or_init(|| {
            let uncompressed_size =
                u64::from_le_bytes(data[8..16].try_into().unwrap_or([0; 8])) as usize;
            unpacker::oodle::decompress(&data[16..], uncompressed_size).unwrap_or_default()
        })
    } else {
        data
    }
}

#[derive(Clone)]
pub struct CosmicStar {
    pub x: f32,
    pub y: f32,
    pub vx: f32,
    pub vy: f32,
    pub size: f32,
    pub phase: f32,
    pub speed: f32,
    pub color_type: u8,
}

pub fn create_cosmic_stars(count: usize) -> Vec<CosmicStar> {
    let mut stars = Vec::with_capacity(count);
    for i in 0..count {
        let fi = i as f32;
        let seed = (fi * 17.13 + 3.7).fract();
        let seed_y = (fi * 31.41 + 7.1).fract();
        let speed = 0.025 + (fi * 13.37).fract() * 0.035;
        let size = 2.5 + (fi * 23.1).fract() * 3.5;
        let color_type = (i % 3) as u8;
        let vx = -0.00015 - (fi * 7.7).fract() * 0.00025;
        let vy = -0.00035 - (fi * 11.3).fract() * 0.00055;
        stars.push(CosmicStar {
            x: seed,
            y: seed_y,
            vx,
            vy,
            size,
            phase: (fi * 2.1).fract() * std::f32::consts::TAU,
            speed,
            color_type,
        });
    }
    stars
}

pub fn update_cosmic_stars(stars: &mut [CosmicStar]) {
    for s in stars {
        s.phase += s.speed;
        if s.phase > std::f32::consts::TAU {
            s.phase -= std::f32::consts::TAU;
        }
        s.x += s.vx;
        if s.x < 0.0 {
            s.x += 1.0;
        }
        s.y += s.vy;
        if s.y < 0.0 {
            s.y += 1.0;
        }
    }
}

pub fn render_starfield(stars: &[CosmicStar]) -> Canvas<()> {
    let stars_clone = stars.to_vec();
    canvas(
        move |_bounds, _window, _cx| {},
        move |bounds, _state, window, _cx| {
            let bw = f32::from(bounds.size.width);
            let bh = f32::from(bounds.size.height);
            let ox = f32::from(bounds.origin.x);
            let oy = f32::from(bounds.origin.y);

            for star in &stars_clone {
                let px_coord = ox + star.x * bw;
                let py_coord = oy + star.y * bh;
                let pulse = (star.phase.sin() * 0.5 + 0.5).powf(1.5);
                let opacity = (0.25 + 0.75 * pulse).clamp(0.0, 1.0);
                let current_size = star.size * (0.8 + 0.4 * pulse);
                let radius = current_size * 0.5;

                let color: Hsla = match star.color_type {
                    0 => hsla(45.0 / 360.0, 0.85, 0.82, opacity),
                    1 => hsla(190.0 / 360.0, 0.75, 0.88, opacity),
                    _ => hsla(0.0, 0.0, 1.0, opacity),
                };

                let dot_bounds = Bounds::new(
                    point(px(px_coord - radius), px(py_coord - radius)),
                    size(px(current_size), px(current_size)),
                );

                let mut quad = fill(dot_bounds, color);
                quad.corner_radii = Corners::all(px(radius));
                window.paint_quad(quad);
            }
        },
    )
}

pub fn load_anim_bin(data: &'static [u8]) -> Vec<&'static [u8]> {
    let data = get_anim_raw_data(data);
    if data.len() < 24 || &data[0..8] != b"HSR_ANIM" {
        return Vec::new();
    }
    let frame_count = u32::from_le_bytes(data[8..12].try_into().unwrap_or([0; 4])) as usize;
    let mut index_offset = 24;
    let mut frames = Vec::with_capacity(frame_count);
    for _ in 0..frame_count {
        if index_offset + 12 > data.len() {
            break;
        }
        let offset = u64::from_le_bytes(
            data[index_offset..index_offset + 8]
                .try_into()
                .unwrap_or([0; 8]),
        ) as usize;
        let length = u32::from_le_bytes(
            data[index_offset + 8..index_offset + 12]
                .try_into()
                .unwrap_or([0; 4]),
        ) as usize;
        index_offset += 12;
        if offset + length <= data.len() {
            frames.push(&data[offset..offset + length]);
        }
    }
    frames
}

pub fn decode_bg_frame(bytes: &[u8]) -> Option<Arc<RenderImage>> {
    let img = image::load_from_memory(bytes).ok()?;
    let mut rgba = img.into_rgba8();
    for pixel in rgba.as_chunks_mut::<4>().0 {
        pixel.swap(0, 2);
    }
    Some(Arc::new(RenderImage::new(vec![Frame::new(rgba)])))
}

pub fn render_background_video(current_bg: Option<Arc<RenderImage>>) -> Canvas<()> {
    canvas(
        move |_bounds, _window, _cx| {},
        move |bounds, _state, window, _cx| {
            if let Some(render_image) = &current_bg {
                let _ =
                    window.paint_image(bounds, Corners::default(), render_image.clone(), 0, false);
            }
        },
    )
}
