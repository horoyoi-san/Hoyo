use std::{borrow::Cow, sync::LazyLock};

use il2cpp::{get_cached_class, vm::string::Il2CppString};
use reflection::runtime_type::RuntimeType;

use super::{decoder, region};

pub static DISPATCH_SEED: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let gv = RuntimeType::from_class(get_cached_class("RPG.Client.GlobalVars").unwrap()).unwrap();
    let seed = gv
        .get_field("s_VersionData".into(), 62)
        .unwrap()
        .get_value(il2cpp::vm::object::Il2CppObject::NULL)
        .unwrap();
    RuntimeType::from_object(seed)
        .unwrap()
        .get_method("GetDispatchSeed".into(), 62)
        .unwrap()
        .get_il2cpp_method()
        .invoke::<Il2CppString>(seed, &[])
        .unwrap()
        .as_str()
});

pub fn get_dispatch_url() -> Option<String> {
    let cfg = (|| {
        let rt = get_cached_class("RPG.Client.ClientStartupConfig")?;
        let rt = RuntimeType::from_class(rt).ok()?;
        rt.get_property("Data".into(), 62)
            .ok()?
            .get_get_method(true)
            .ok()?
            .get_il2cpp_method()
            .invoke(il2cpp::vm::object::Il2CppObject::NULL, &[])
            .ok()
    })()?;

    (|| {
        let rt = RuntimeType::from_object(cfg).ok()?;
        let f = rt.get_field("GlobalDispatchUrlList".into(), 62).ok()?;
        let v = f.get_value(cfg).ok()?;
        let arr = il2cpp::vm::array::Il2CppArray(v.0);
        arr.to_vec::<Il2CppString>()
            .into_iter()
            .next()
            .map(|s| s.as_str().to_string())
    })()
}

fn http_get(url: &str) -> Option<Vec<u8>> {
    ureq::get(url).call().ok()?.into_body().read_to_vec().ok()
}

fn base64_decode(data: &str) -> Option<Vec<u8>> {
    use base64::Engine;
    base64::engine::general_purpose::STANDARD
        .decode(data.trim())
        .ok()
}

pub fn fetch_gateway_url(dispatch_url: &str, version: &str) -> Option<String> {
    let path = format!(
        "{dispatch_url}?version={version}&language_type=3&platform_type=3&channel_id=1&sub_channel_id=1&is_new_format=1"
    );
    let resp = http_get(&path)?;
    let blob = base64_decode(&String::from_utf8_lossy(&resp))?;
    let mut d = decoder::Decoder::new(blob);
    let result = d.decode().ok()?;
    let dispatch = region::Dispatch::from_wire(result)?;

    if dispatch.retcode != 0 {
        let msg = if dispatch.stop_desc.is_empty() {
            format!("dispatch retcode={}", dispatch.retcode)
        } else {
            format!(
                "dispatch retcode={}: {}",
                dispatch.retcode, dispatch.stop_desc
            )
        };
        log::debug!("[Gateway] {msg}");
        return None;
    }

    let region = dispatch.region_list.first()?;

    if !region.dispatch_url.is_empty() {
        Some(region.dispatch_url.clone())
    } else if !region.sub_dispatch_url.is_empty() {
        log::debug!("[Gateway] dispatch_url empty, using sub_dispatch_url");
        Some(region.sub_dispatch_url.clone())
    } else {
        log::debug!("[Gateway] both dispatch_url and sub_dispatch_url are empty");
        None
    }
}

pub fn fetch_gateway_response(
    gateway_url: &str,
    version: &str,
    seed: &str,
) -> Option<decoder::DecodingResult> {
    let path = format!(
        "{gateway_url}?version={version}&platform_type=1&language_type=3&dispatch_seed={seed}&channel_id=1&sub_channel_id=1&is_need_url=1"
    );
    let resp = http_get(&path)?;
    let blob = base64_decode(&String::from_utf8_lossy(&resp))?;
    let mut d = decoder::Decoder::new(blob);
    d.decode().ok()
}
