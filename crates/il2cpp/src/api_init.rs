use indexmap::IndexMap;

use crate::{
    CLASS_TABLE, CLASS_TABLE_VEC, FUNCTIONS_TABLE, api,
    vm::{thread::Il2CppThread, r#type::Il2CppTypeNameFormat},
};

pub fn init_il2cpp(debug: bool) {
    unsafe {
        log::debug!("[Il2Cpp Init] initializing il2cpp");
        let domain = api::il2cpp_domain_get();
        Il2CppThread::attach(domain);

        let mut method_maps = IndexMap::with_capacity(700_000);
        let mut type_map = IndexMap::with_capacity(81_000);
        let mut type_vec = Vec::with_capacity(81_000);

        let mut assembly_count = 0;
        let assembly_array = api::il2cpp_domain_get_assemblies(domain, &mut assembly_count);

        let mut type_def_index = 0;
        for i in 0..assembly_count {
            let assembly = *assembly_array.wrapping_add(i);
            let image = api::il2cpp_assembly_get_image(assembly);
            let module = image.get_name();
            let class_count = image.get_count();

            crate::MAX_TYPEDEFINDEX += class_count;

            if module == "RPG.Network.Proto.dll" {
                crate::RPG_NETWORK_PROTO_START = type_def_index;
            } else if module == "Assembly-CSharp.dll" {
                crate::ASSEMBLY_CSHARP_START = type_def_index;
            } else if module == "RPG.Profiler.dll" {
                crate::RPG_NETWORK_PROTO_END = type_def_index;
            }

            for class_index in 0..class_count {
                let class = api::il2cpp_image_get_class(image, class_index as usize);

                if debug {
                    log::debug!("{type_def_index} 0x{:X}", class.0);
                }

                let type_name = class.byval_arg().get_name(Il2CppTypeNameFormat::IL);
                let methods = class.get_methods();
                for (i, method) in methods.iter().enumerate() {
                    let params = method.signature(i);
                    method_maps.insert(format!("{type_name}::{params}"), *method);
                }
                type_map.insert(type_name, class);
                type_vec.push(class);
                type_def_index += 1;
            }
        }

        log::debug!(
            "[Il2Cpp Init] initialized {} methods and {} types",
            method_maps.len(),
            crate::MAX_TYPEDEFINDEX - 1
        );
        FUNCTIONS_TABLE.set(method_maps).unwrap();
        CLASS_TABLE.set(type_map).unwrap();
        CLASS_TABLE_VEC.set(type_vec).unwrap();
        dump_methods_json();
    }
}

pub fn dump_methods_json() {
    let hm = FUNCTIONS_TABLE
        .get()
        .unwrap()
        .iter()
        .map(|(k, v)| (k, format!("0x{:X}", v.rva())))
        .collect::<IndexMap<_, _>>();
    let _ = std::fs::write(
        "./DUMP/methods.json",
        serde_json::to_string_pretty(&hm).unwrap(),
    );
}
