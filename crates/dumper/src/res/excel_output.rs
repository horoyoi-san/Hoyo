use crate::res::LOAD_METHOD_NAME;
use il2cpp::{
    get_cached_class, get_native_method,
    vm::{
        array::Il2CppArray, boxed_value::BoxedBool, object::Il2CppObject, string::Il2CppString,
        value::Void,
    },
};
use indicatif::{ProgressBar, ProgressStyle};
use reflection::{
    assembly, field_info::FieldInfo, runtime_type::RuntimeType, serializer::BoxedSerializer,
};
use std::{borrow::Cow, path::Path, sync::LazyLock};

pub static LOAD_DATA_FUNCS: LazyLock<[Cow<'static, str>; 2]> =
    LazyLock::new(|| [Cow::Borrowed("LoadData"), Cow::Borrowed(&*LOAD_METHOD_NAME)]);

pub const UNLOAD_DATA_FUNCS: [&str; 1] = ["UnloadData"];

#[allow(unused)]
pub fn dump() {
    log::debug!("[Excel Output Dumper] Dumping Excels");

    // Check ExcelOutput directory
    if !Path::new("./DUMP/Resources/ExcelOutput").is_dir() {
        std::fs::create_dir_all("./DUMP/Resources/ExcelOutput").unwrap();
    }

    let assemblies = assembly::get_assemblies();
    let assembly = assemblies
        .iter()
        .find(|v| v.get_name() == "RPG.GameCore.Config")
        .unwrap();
    let types = assembly.get_types();

    let pb = ProgressBar::new(types.len() as u64);
    pb.set_style(
        ProgressStyle::default_bar()
            .template(
                "{spinner:.green} [{elapsed_precise}] [{bar:40.cyan/blue}] {pos}/{len}\n  {msg}",
            )
            .unwrap()
            .progress_chars("=>-"),
    );
    pb.enable_steady_tick(std::time::Duration::from_millis(100));

    for excel_table in types {
        dump_excel_table(excel_table, &pb);
        pb.inc(1);
    }

    pb.finish_with_message("Done");
}

fn dump_excel_table(excel_table: RuntimeType, pb: &ProgressBar) {
    let fields = excel_table.get_fields_il2cpp();
    let mut path_list = None;
    let mut has_indexkey_field = false;
    let mut should_unload_first = false; // TODO

    for field in fields {
        let type_name = field.get_field_type().unwrap().format_type_name(true);

        if type_name == "string[]" {
            path_list = Some(field);
        } else if type_name.contains("Dictionary")
            && (type_name.contains("Row") || type_name.contains("CommonIndexKey"))
        {
            if type_name.contains(".IndexKey") {
                should_unload_first = false;
            }

            has_indexkey_field = true;
        }
    }

    let Some(path_list) = path_list else { return };

    if !has_indexkey_field {
        return;
    }

    let paths = Il2CppArray(path_list.get_value(Il2CppObject::NULL).unwrap().0)
        .to_vec::<Il2CppString>()
        .iter()
        .map(|v| v.as_str().to_string())
        .collect::<Vec<_>>();

    for path in paths {
        dump_excel_row(excel_table, path_list, path, should_unload_first, pb);
    }
}

fn dump_excel_row(
    excel_table: RuntimeType,
    path_list_field: FieldInfo,
    path: String,
    should_unload_fisrt: bool,
    pb: &ProgressBar,
) {
    let name = excel_table.il_name();

    pb.set_message(format!("Dumping: {name} -> {path}"));

    if should_unload_fisrt {
        // Create new path list array
        let mut arr = Il2CppArray::new(
            get_cached_class("System.String")
                .unwrap()
                .get_array_class(1),
            1,
        );
        arr.as_mut_slice::<Il2CppString>()[0] = Il2CppString::from(path.as_str());

        // Merge the s_PathList
        path_list_field
            .set_value(Il2CppObject::NULL, Il2CppObject(arr.0))
            .unwrap();

        // Unload
        let mut unloaded = true; // TODO: always assume excel unloaded
        for unload_name in UNLOAD_DATA_FUNCS {
            if let Some(unload_func) = get_native_method(&format!("{name}::{unload_name}()")) {
                unload_func.invoke::<Void>(Il2CppObject::NULL, &[]).unwrap();
                unloaded = true;
                break;
            }
        }
        if !unloaded {
            log::debug!(
                "{name} -> {path} | Error: Failed to dump because didn't have UnloadData func!"
            );
            return;
        }

        // Load
        let mut loaded = false;
        for load_name in &*LOAD_DATA_FUNCS {
            if let Some(load_func) = get_native_method(&format!("{name}::{load_name}()")) {
                load_func.invoke::<Void>(Il2CppObject::NULL, &[]).unwrap();
                loaded = true;
                break;
            }
        }
        if !loaded {
            log::debug!(
                "{name} -> {path} | Error: Failed to dump because data didn't have LoadData func!"
            );
            return;
        }
    }

    let methods = excel_table.get_methods_il2cpp();
    let Some(get_enumerator) = methods.iter().find(|m| {
        m.get_return_type()
            .unwrap()
            .get_name()
            .unwrap()
            .as_str()
            .contains("Enumerator")
    }) else {
        log::debug!("{name} -> {path} | Error: No Enumerator");
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
        .unwrap()
    {
        if let Ok(current) = current_property.get_value(enumerator)
            && let Ok(serialized) = serializer.serialize(trow_type, current)
        {
            out.push(serialized);
        }
    }

    let output_name = path.split('/').next_back().unwrap_or(&path);
    let output_name = output_name.strip_suffix(".bytes").unwrap_or(output_name);

    if let Err(e) = std::fs::write(
        format!("./DUMP/Resources/ExcelOutput/{output_name}.json"),
        serde_json::to_string_pretty(&out).unwrap(),
    ) {
        log::debug!("Error writing {output_name}: {e}");
    }
}
