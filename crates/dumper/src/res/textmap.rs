use std::path::Path;

use il2cpp::{
    get_cached_class,
    vm::{boxed_value::BoxedBool, object::Il2CppObject},
};
use reflection::{runtime_type::RuntimeType, serializer::BoxedSerializer};

#[allow(unused)]
pub fn dump() {
    log::debug!("[Textmap Dumper] Dumping Textmaps");

    // Check TextMap directory
    if !Path::new("./DUMP/Resources/TextMap").is_dir() {
        std::fs::create_dir_all("./DUMP/Resources/TextMap").unwrap();
    }

    let excel_table =
        RuntimeType::from_class(get_cached_class("RPG.GameCore.TextmapExcelTable").unwrap())
            .unwrap();

    let name = "RPG.GameCore.TextmapExcelTable";
    let path = "TextMapEN";

    let methods = excel_table.get_methods_il2cpp();
    let Some(get_enumerator) = methods.iter().find(|m| {
        m.get_return_type()
            .unwrap()
            .get_name()
            .unwrap()
            .as_str()
            .contains("Enumerator")
    }) else {
        log::debug!("[Textmap Dumper] {name} -> {path} | Error: No Enumerator");
        return;
    };

    let adapter_enumerator_type = get_enumerator.get_return_type().unwrap();
    let current_property = adapter_enumerator_type
        .get_property("Current".into(), 62)
        .unwrap(); // TRow
    let trow_type = current_property.get_property_type().unwrap();

    let enumerator = get_enumerator
        .get_il2cpp_method()
        .invoke::<Il2CppObject>(Il2CppObject::NULL, &[])
        .unwrap(); // TEnumerator<TIndexKey, TRow>

    let move_next = RuntimeType::from_object(enumerator)
        .unwrap()
        .find_method_il2cpp("MoveNext")
        .unwrap()
        .get_il2cpp_method();

    let mut serializer = BoxedSerializer::default();
    let mut out = Vec::new();
    while move_next
        .invoke::<BoxedBool>(Il2CppObject(enumerator.0 + 16), &[])
        .map(|v| v.unbox())
        .unwrap_or_default()
    {
        if let Ok(current) = current_property.get_value(enumerator)
            && let Ok(serialized) = serializer.serialize(trow_type, current)
        {
            out.push(serialized);
        }
    }

    std::fs::write(
        format!("./DUMP/Resources/TextMap/{path}.json"),
        serde_json::to_string_pretty(&out).unwrap(),
    )
    .unwrap();
}
