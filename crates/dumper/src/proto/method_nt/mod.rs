use crate::proto::get_cached_class;
use crate::proto::util;
use il2cpp::vm::{metadata_cache, value::Il2CppValue};
use reflection::method_info::MethodInfo;
use reflection::runtime_type::RuntimeType;
use std::collections::{HashMap, HashSet};
use std::sync::OnceLock;
use std::sync::atomic::Ordering;

pub static CACHED_NT_MAP: OnceLock<HashMap<String, String>> = OnceLock::new();

pub mod method;
mod param_nt;
mod param_table;

pub fn get_method_nt_map() -> (HashMap<String, Vec<String>>, HashMap<String, String>) {
    let (method_map, mut proto_name_map) = param_nt::process_table(param_table::PARAM_NT_MAP);

    let method_entries = method::get_method_nt_entries();
    let method_count = method_entries.len();
    proto_name_map.extend(method_entries);

    let enum_map = get_enum_names();
    let enum_count = enum_map.len();
    proto_name_map.extend(enum_map);

    let deobf_to_obf: HashMap<&str, &str> = proto_name_map
        .iter()
        .map(|(k, v)| (v.as_str(), k.as_str()))
        .collect();

    let param_output: Vec<String> = param_table::PARAM_NT_MAP
        .iter()
        .filter_map(|(_, _, output_key, _)| {
            deobf_to_obf
                .get(output_key)
                .map(|obf| format!("{obf} {output_key}"))
        })
        .collect();

    let method_output: Vec<String> = proto_name_map
        .iter()
        .filter(|(obf, _)| !param_output.iter().any(|l| l.starts_with(obf.as_str())))
        .map(|(obf, deobf)| format!("{obf} {deobf}"))
        .collect();

    let param_count = param_output.len();
    let output_lines: Vec<String> = param_output.into_iter().chain(method_output).collect();

    if !output_lines.is_empty() {
        std::fs::write("./DUMP/method_nt.txt", output_lines.join("\n"))
            .expect("Failed to write method_nt.txt");
    }

    log::debug!(
        "[Method NT] total: {} | param_nt: {} | method_nt: {} | enum_nt: {}",
        proto_name_map.len(),
        param_count,
        method_count,
        enum_count,
    );

    let _ = CACHED_NT_MAP.set(proto_name_map.clone());

    (method_map, proto_name_map)
}

pub fn dump_global_field_map() -> HashMap<String, String> {
    let mut proto_props = HashSet::<String>::new();

    for i in il2cpp::RPG_NETWORK_PROTO_START.load(Ordering::Relaxed)..il2cpp::RPG_NETWORK_PROTO_END.load(Ordering::Relaxed) {
        let Ok(runtime_type) =
            RuntimeType::from_class(metadata_cache::get_typeinfo_from_typedefindex(i))
        else {
            continue;
        };
        for prop in runtime_type.get_properties(62) {
            proto_props.insert(prop.get_name().unwrap().as_str().to_string());
        }
    }

    let mut map = HashMap::<String, String>::new();

    for i in 0..il2cpp::MAX_TYPEDEFINDEX.load(Ordering::Relaxed) {
        let Ok(runtime_type) =
            RuntimeType::from_class(metadata_cache::get_typeinfo_from_typedefindex(i))
        else {
            continue;
        };

        for prop in runtime_type.get_properties(62) {
            let prop_name = prop.get_name().unwrap().as_str();
            if !proto_props.contains(prop_name.as_ref()) || map.contains_key(prop_name.as_ref()) {
                continue;
            }

            if let Ok(get_method) = prop.get_get_method(true)
                && !get_method.is_null()
                && let Some(name) = get_method
                    .get_name()
                    .unwrap()
                    .as_str()
                    .strip_prefix("get_")
                    .filter(|n| *n != prop_name.as_ref())
            {
                map.insert(prop_name.to_string(), name.to_string());
                continue;
            }

            if let Ok(set_method) = prop.get_set_method(true)
                && !set_method.is_null()
                && let Some(name) = set_method
                    .get_name()
                    .unwrap()
                    .as_str()
                    .strip_prefix("set_")
                    .filter(|n| *n != prop_name.as_ref())
            {
                map.insert(prop_name.to_string(), name.to_string());
            }
        }
    }
    map
}

pub fn get_enum_names() -> HashMap<String, String> {
    let mut output = HashMap::new();

    let class = get_cached_class("XLua.ObjectTranslator.IniterAdderUnityEngineVector2").unwrap();
    for method in class.get_methods() {
        let m_name = method.get_name();

        if !m_name.starts_with("Proto") {
            continue;
        }

        let mi = MethodInfo::from_handle(method).unwrap();

        let args = mi.get_parameters();

        let Some(first_arg) = args.first() else {
            continue;
        };

        let obf_name = first_arg.get_parameter_type().unwrap().il_name();

        if !util::is_obf(&obf_name) {
            continue;
        }

        let Some(deobf_name) = m_name
            .strip_prefix("Proto")
            .and_then(|sp| sp.strip_suffix("_cast"))
        else {
            continue;
        };

        output.insert(obf_name.to_string(), deobf_name.to_string());
    }

    output
}
