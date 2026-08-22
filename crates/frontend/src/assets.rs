use std::borrow::Cow;

use gpui::{AssetSource, Result, SharedString};

const UID_SVG: &str = r#"<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h2"/></svg>"#;
const HSR_STAR_SVG: &str = r#"<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0 C12 6.5 17.5 12 24 12 C17.5 12 12 17.5 12 24 C12 17.5 6.5 12 0 12 C6.5 12 12 6.5 12 0 Z"/></svg>"#;
const HSR_STAR_SLENDER_SVG: &str = r#"<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M 8.58 2.6 L 12.87 9.13 L 18.39 9.67 L 14.51 13.64 L 15.42 21.4 L 11.13 14.87 L 5.61 14.33 L 9.49 10.36 Z"/></svg>"#;
const DUMPER_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Dumper.png");
const MORAX_PNG: &[u8] = include_bytes!("../../../Assets/Icon/morax.png");
const SNIFFER_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Sniffer.png");
const CHEAT_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Cheat.png");
const LUA_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Lua.png");
const CONFIG_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Config.png");
const TERMINAL_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Terminal.png");
const UNPACKER_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Unpacker.png");
const DESIGN_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Design.png");
const GACHA_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Gacha.png");
const JADE_PNG: &[u8] = include_bytes!("../../../Assets/PNG/Jade.png");
const SHARD_PNG: &[u8] = include_bytes!("../../../Assets/PNG/648.png");
const STANDARD_WARP_PNG: &[u8] = include_bytes!("../../../Assets/PNG/StandardWarp.png");
const UP_WARP_PNG: &[u8] = include_bytes!("../../../Assets/PNG/UpWarp.png");
const SWORD_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Sword.png");
const EYE_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Eye.png");
const KEYBIND_PNG: &[u8] = include_bytes!("../../../Assets/Icon/KeyBind.png");
const AUTO_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Auto.png");
const WORLD_PNG: &[u8] = include_bytes!("../../../Assets/Icon/World.png");
const MISC_PNG: &[u8] = include_bytes!("../../../Assets/Icon/Misc.png");

pub struct Assets;

impl AssetSource for Assets {
    fn load(&self, path: &str) -> Result<Option<Cow<'static, [u8]>>> {
        match path {
            "icons/uid.svg" => Ok(Some(Cow::Borrowed(UID_SVG.as_bytes()))),
            "icons/hsr_star.svg" => Ok(Some(Cow::Borrowed(HSR_STAR_SVG.as_bytes()))),
            "icons/hsr_star_slender.svg" => {
                Ok(Some(Cow::Borrowed(HSR_STAR_SLENDER_SVG.as_bytes())))
            }
            "icons/Dumper.png" => Ok(Some(Cow::Borrowed(DUMPER_PNG))),
            "icons/Morax.png" => Ok(Some(Cow::Borrowed(MORAX_PNG))),
            "icons/Sniffer.png" => Ok(Some(Cow::Borrowed(SNIFFER_PNG))),
            "icons/Cheat.png" => Ok(Some(Cow::Borrowed(CHEAT_PNG))),
            "icons/Lua.png" => Ok(Some(Cow::Borrowed(LUA_PNG))),
            "icons/Config.png" => Ok(Some(Cow::Borrowed(CONFIG_PNG))),
            "icons/Terminal.png" => Ok(Some(Cow::Borrowed(TERMINAL_PNG))),
            "icons/Unpacker.png" => Ok(Some(Cow::Borrowed(UNPACKER_PNG))),
            "icons/Design.png" => Ok(Some(Cow::Borrowed(DESIGN_PNG))),
            "icons/Gacha.png" => Ok(Some(Cow::Borrowed(GACHA_PNG))),
            "images/jade.png" => Ok(Some(Cow::Borrowed(JADE_PNG))),
            "images/shard.png" => Ok(Some(Cow::Borrowed(SHARD_PNG))),
            "images/standard-warp.png" => Ok(Some(Cow::Borrowed(STANDARD_WARP_PNG))),
            "images/up-warp.png" => Ok(Some(Cow::Borrowed(UP_WARP_PNG))),
            "icons/Sword.png" => Ok(Some(Cow::Borrowed(SWORD_PNG))),
            "icons/Eye.png" => Ok(Some(Cow::Borrowed(EYE_PNG))),
            "icons/KeyBind.png" => Ok(Some(Cow::Borrowed(KEYBIND_PNG))),
            "icons/Auto.png" => Ok(Some(Cow::Borrowed(AUTO_PNG))),
            "icons/World.png" => Ok(Some(Cow::Borrowed(WORLD_PNG))),
            "icons/Misc.png" => Ok(Some(Cow::Borrowed(MISC_PNG))),
            _ => gpui_component_assets::Assets.load(path),
        }
    }

    fn list(&self, path: &str) -> Result<Vec<SharedString>> {
        gpui_component_assets::Assets.list(path)
    }
}
