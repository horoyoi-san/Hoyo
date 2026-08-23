use il2cpp::get_cached_class;
use reflection::{method_info::MethodInfo, runtime_type::RuntimeType};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy)]
pub enum ExtractMode {
    FirstParam,
    SecondParam,
    #[allow(dead_code)]
    ThirdParam,
    ReturnType,
}

fn get_method(class_name: &str, method_name: &str) -> Option<il2cpp::vm::method::Il2CppMethod> {
    let runtime_type = RuntimeType::from_class(get_cached_class(class_name)?).ok()?;
    let method_info = runtime_type.get_method(method_name.into(), 62).ok()?;
    if method_info.0 == 0 {
        None
    } else {
        Some(method_info.get_il2cpp_method())
    }
}

fn get_param_type(method_info: &MethodInfo, mode: ExtractMode) -> Option<RuntimeType> {
    let params = method_info.get_parameters();
    match mode {
        ExtractMode::FirstParam => params.first()?.get_parameter_type().ok(),
        ExtractMode::SecondParam => params.get(1)?.get_parameter_type().ok(),
        ExtractMode::ThirdParam => params.get(2)?.get_parameter_type().ok(),
        ExtractMode::ReturnType => method_info.get_return_type().ok(),
    }
}

fn clean_type_name(runtime_type: RuntimeType, il_name: &str) -> String {
    let generics = runtime_type.get_generic_arguments();

    if !generics.is_empty() {
        generics
            .last().map_or_else(|| il_name.to_string(), |t| t.il_name().into_owned())
    } else if il_name.ends_with("[]") {
        runtime_type
            .get_element_type()
            .ok().map_or_else(|| il_name.trim_end_matches("[]").to_string(), |t| t.il_name().into_owned())
    } else {
        il_name.to_string()
    }
}

pub fn process_table(
    table: &[(&str, &str, &str, ExtractMode)],
) -> (HashMap<String, Vec<String>>, HashMap<String, String>) {
    let mut method_map: HashMap<String, Vec<String>> = HashMap::new();
    let mut proto_name_map: HashMap<String, String> = HashMap::new();

    for (class_name, method_name, output_key, mode) in table {
        let Some(native_method) = get_method(class_name, method_name) else {
            log::debug!("[Param NT] method not found: {class_name}::{method_name}");
            continue;
        };
        let rva = native_method.rva();

        if let Ok(method_info) = MethodInfo::from_handle(native_method)
            && let Some(param_type) = get_param_type(&method_info, *mode)
        {
            let il_name = param_type.il_name();
            let clean = clean_type_name(param_type, &il_name);
            if clean.len() == 11 && clean.chars().all(char::is_uppercase) {
                proto_name_map.insert(clean, output_key.to_string());
            } else {
                log::debug!(
                    "[Param NT] param name mismatch: {class_name}::{method_name} -> {output_key}, got \"{clean}\""
                );
            }
        }

        if rva != 0 {
            method_map
                .entry(output_key.to_string())
                .or_default()
                .push(format!("0x{rva:X}"));
        }
    }

    (method_map, proto_name_map)
}
