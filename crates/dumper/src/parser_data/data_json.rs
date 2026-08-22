use crate::parser_data::{FROM_BINARY_FUNC_NAME, field_reorderer};

use super::{
    typeindex::{dump_type_indexes, is_skip_exist_flag},
    util,
};
use il2cpp::{
    get_cached_class,
    vm::{array::Il2CppArray, object::Il2CppObject, string::Il2CppString},
};
use reflection::{
    assembly, r#enum::Enum, field_info::FieldInfo, member_info::MemberInfo,
    runtime_type::RuntimeType, serializer::BoxedSerializer,
};
use serde::Serialize;
use std::{
    borrow::Cow,
    collections::{BTreeMap, BTreeSet, HashMap, HashSet},
    fs::File,
    io::Write,
    sync::LazyLock,
};

const CS_PRIMITIVES: &[&str] = &[
    "uint", "int", "long", "ulong", "short", "ushort", "byte", "sbyte", "IntPtr", "string",
    "float", "double", "bool",
];

#[derive(Debug, Serialize)]
pub enum DataType {
    Class {
        #[serde(skip_serializing_if = "Option::is_none")]
        skip_existflag_check: Option<bool>,
        fields: Vec<Data>,
        interfaces: Vec<Cow<'static, str>>,
    },
    Struct {
        fields: Vec<Data>,
        interfaces: Vec<Cow<'static, str>>,
    },
    Typeindex {
        base: Cow<'static, str>,
        descendants: BTreeMap<u32, DataKind>,
    },
    Enum(
        Cow<'static, str>,
        BTreeMap<Cow<'static, str>, Cow<'static, str>>,
    ),
}

#[derive(Debug, Serialize)]
pub struct Data {
    pub field_name: Cow<'static, str>,
    pub data_type: DataKind,
}

#[derive(Debug, Serialize, Clone)]
pub enum DataKind {
    Primitive(Cow<'static, str>),
    Array(Box<DataKind>),
    Dictionary(Box<DataKind>, Box<DataKind>),
    Class(Cow<'static, str>),
    Other(),
}

pub fn gen_types(data_out: &mut File, excel_paths_out: &mut File) {
    let tables = all_types();

    let mut types = BTreeSet::new();

    for row in tables.keys() {
        util::recursive(*row, &mut types);
    }

    let mut out = BTreeMap::new();
    let mut excel_paths = BTreeMap::new();

    // Handle typeindexes
    let typeindexes = dump_type_indexes();
    for (class, members) in typeindexes {
        let runtime_type = RuntimeType::from_class(class).unwrap();
        let generics = runtime_type.get_generic_arguments();
        let (base, _) = if generics.len() != 2 {
            (
                runtime_type.format_type_name_with_namespace(true, true),
                class,
            )
        } else {
            (
                generics[1].format_type_name_with_namespace(true, true),
                generics[1].get_il2cpp_type().get_class(),
            )
        };

        let mut descendants = BTreeMap::new();
        for (i, member) in members {
            descendants.insert(
                i,
                if let Some(member) = member {
                    format_type(RuntimeType::from_class(member).unwrap())
                } else {
                    DataKind::Other()
                },
            );
        }
        out.insert(base.clone(), DataType::Typeindex { base, descendants });
    }

    for ty in types {
        gen_data(ty, &mut out);
        collect_excel_paths(ty, &tables, &mut excel_paths);
    }

    let dynamic_values_name =
        reflection::serializer::dynamic_values_type().format_type_name_with_namespace(true, true);
    let data_json = serde_json::to_string_pretty(&out).unwrap().replace(
        &format!("\"{dynamic_values_name}\""),
        "\"RPG.GameCore.DynamicValues\"",
    );
    data_out.write_all(data_json.as_bytes()).unwrap();

    serde_json::to_writer_pretty(excel_paths_out, &excel_paths).unwrap();
}

fn all_types() -> HashMap<RuntimeType, Vec<String>> {
    let assemblies = assembly::get_assemblies();
    let asm = assemblies
        .iter()
        .find(|asm| asm.get_name() == "RPG.GameCore.Config")
        .unwrap();
    let mut tables = HashMap::new();
    for runtime_type in asm.get_types() {
        // Public | Static | DeclaredOnly
        let fields = runtime_type.get_fields(40);
        if let Some(row) = fields.iter().find_map(|f| {
            let generics = f.get_field_type().unwrap().get_generic_arguments();
            if generics.len() == 2 && {
                let key = generics[0].format_type_name(true);
                let value = generics[1].format_type_name(true);
                (key.contains("IndexKey") || value.contains("Row")) && key != "uint" // skip non excel dictionary
            } {
                Some(generics[1])
            } else {
                None
            }
        }) {
            let paths = fields
                .iter()
                .filter(|&f| {
                    f.get_field_type()
                        .unwrap()
                        .format_type_name_with_namespace(true, true)
                        == "string[]"
                })
                .flat_map(|f| {
                    Il2CppArray(f.get_value(Il2CppObject::NULL).unwrap().0)
                        .to_vec::<Il2CppString>()
                        .iter()
                        .map(|v| {
                            v.as_str()
                                .replace("BakedConfig/", "")
                                .replace("ExcelOutput/", "")
                                .replace("ExcelOutputGameCore/", "")
                                .replace(".bytes", "")
                        })
                        .collect::<Vec<String>>()
                })
                .collect::<HashSet<String>>()
                .into_iter()
                .collect::<Vec<_>>();

            tables.insert(row, paths);
        } else {
            tables.insert(runtime_type, Vec::new());
        }
    }
    tables
}

fn gen_data(ty: RuntimeType, out: &mut BTreeMap<Cow<'static, str>, DataType>) {
    if ty.get_isgenerictype().unwrap().unbox()
        || ty.get_isprimitive().unwrap().unbox()
        || ty.get_ispointer().unwrap().unbox()
        || ty.get_isarray().unwrap().unbox()
    {
        return;
    }

    let assembly = ty.get_assembly().unwrap().get_full_name().unwrap().as_str();
    if assembly.starts_with("System") || assembly.starts_with("mscorlib") {
        return;
    }

    let mut formatted_name = ty.format_type_name_with_namespace(true, true);
    let mut serializer = BoxedSerializer::default();

    if ty.get_isenum().unwrap().unbox() {
        let underlying_type = Enum::get_underlying_type(ty).unwrap();
        out.insert(
            formatted_name,
            DataType::Enum(
                underlying_type.format_type_name(true).into(),
                ty.get_fields(24)
                    .iter()
                    .map(|field| {
                        (
                            Cow::Owned(
                                serializer
                                    .serialize(
                                        underlying_type,
                                        field.get_value(Il2CppObject::NULL).unwrap(),
                                    )
                                    .unwrap()
                                    .to_string(),
                            ),
                            field.get_name().unwrap().as_str(),
                        )
                    })
                    .collect(),
            ),
        );
        return;
    }

    let fields = collect_fields(ty);

    let mut data = Vec::with_capacity(fields.len());
    for field in fields {
        if field.get_isstatic().unwrap().unbox() || field.modifier().contains("private") {
            continue;
        }

        data.push(Data {
            field_name: field.get_name().unwrap().as_str(),
            data_type: format_type(field.get_field_type().unwrap()),
        });
    }

    if out.contains_key(&formatted_name)
        && let DataType::Typeindex {
            base: _,
            descendants,
        } = out.get_mut(&formatted_name).unwrap()
    {
        let orig_name = formatted_name.clone();
        formatted_name = Cow::Owned(format!("{formatted_name}Inner"));

        for v in descendants.values_mut() {
            if let DataKind::Class(c) = v
                && *c == orig_name
            {
                *c = formatted_name.clone();
            }
        }
    }

    out.insert(
        formatted_name,
        if ty.get_isvaluetype().unwrap().unbox() {
            DataType::Struct {
                fields: data,
                interfaces: ty
                    .get_interfaces()
                    .iter()
                    .map(|v| v.format_type_name_with_namespace(true, true))
                    .collect(),
            }
        } else {
            DataType::Class {
                skip_existflag_check: is_skip_exist_flag(ty.get_il2cpp_type().get_class()),
                fields: data,
                interfaces: ty
                    .get_interfaces()
                    .iter()
                    .map(|v| v.format_type_name_with_namespace(true, true))
                    .collect(),
            }
        },
    );
}

fn collect_fields(ty: RuntimeType) -> Vec<FieldInfo> {
    let mut result: Vec<FieldInfo> = Vec::new();

    fn collect_fields_recursive(ty: RuntimeType, result: &mut Vec<FieldInfo>) {
        // Recursively process base type and interfaces (most upper parent first)
        for parent in ty.base_types() {
            collect_fields_recursive(parent, result);
        }

        // Collect fields for the current type
        let mut fields = ty
            .get_fields(62)
            .into_iter()
            .filter(|field| {
                !field.get_isstatic().unwrap().unbox()
                    && !field.modifier().contains("private")
                    && !should_skip_field(field)
            })
            .collect::<Vec<_>>();

        // Sort fields by metadata token
        fields.sort_by_key(reflection::field_info::FieldInfo::get_metadata_token);

        let from_binary_m = ty
            .get_il2cpp_type()
            .get_class()
            .get_methods()
            .into_iter()
            .find(|v| v.get_name().eq("FromBinary") || v.get_name() == *FROM_BINARY_FUNC_NAME);

        if let Some(from_binary_m) = from_binary_m {
            let new_fields = field_reorderer::reorder(from_binary_m.rva(), fields.clone());

            if !new_fields.is_empty() {
                fields = new_fields;
            }
        }

        result.extend(fields);
    }

    collect_fields_recursive(ty, &mut result);
    result
}

fn format_type(ty: RuntimeType) -> DataKind {
    let type_str = ty.format_type_name_with_namespace(true, true);
    if CS_PRIMITIVES.contains(&type_str.as_ref()) {
        return DataKind::Primitive(type_str);
    }

    if type_str.ends_with("[]") {
        let ty = ty.get_element_type().unwrap();
        return DataKind::Array(Box::new(format_type(ty)));
    }

    if type_str.starts_with("List<")
        || type_str.starts_with("PooledList<")
        || type_str.starts_with("LinkedList<")
    {
        let generics = ty.get_generic_arguments();
        let ty = generics[0];

        return DataKind::Array(Box::new(format_type(ty)));
    }

    if type_str.starts_with("Dictionary<") {
        let generics = ty.get_generic_arguments();

        return DataKind::Dictionary(
            Box::new(format_type(generics[0])),
            Box::new(format_type(generics[1])),
        );
    }

    DataKind::Class(type_str)
}

fn collect_excel_paths(
    ty: RuntimeType,
    table: &HashMap<RuntimeType, Vec<String>>,
    out: &mut BTreeMap<Cow<'static, str>, Vec<String>>,
) {
    let formatted_name = ty.format_type_name_with_namespace(true, true);

    let mut temp = Vec::new();
    let paths = if formatted_name != "RPG.GameCore.TextmapRow" {
        table.get(&ty)
    } else {
        temp.extend(vec![
            String::from("Textmap_en"),
            String::from("Textmap_cn"),
            String::from("Textmap_kr"),
            String::from("Textmap_jp"),
            String::from("Textmap_id"),
            String::from("Textmap_chs"),
            String::from("Textmap_de"),
            String::from("Textmap_es"),
            String::from("Textmap_fr"),
            String::from("Textmap_ru"),
            String::from("Textmap_th"),
            String::from("Textmap_vi"),
            String::from("Textmap_pt"),
            String::from("TextmapMain_en"),
            String::from("TextmapMain_cn"),
            String::from("TextmapMain_kr"),
            String::from("TextmapMain_jp"),
            String::from("TextmapMain_id"),
            String::from("TextmapMain_chs"),
            String::from("TextmapMain_de"),
            String::from("TextmapMain_es"),
            String::from("TextmapMain_fr"),
            String::from("TextmapMain_ru"),
            String::from("TextmapMain_th"),
            String::from("TextmapMain_vi"),
            String::from("TextmapMain_pt"),
        ]);
        Some(&temp)
    };

    if let Some(paths) = paths
        && !paths.is_empty()
    {
        out.insert(
            formatted_name,
            paths
                .iter()
                .flat_map(|p| {
                    vec![
                        format!("BakedConfig/ExcelOutput/{}.bytes", p),
                        format!("BakedConfig/ExcelOutputGameCore/{}.bytes", p),
                    ]
                })
                .collect::<Vec<String>>(),
        );
    }
}

/// Field should be skipped if it has HideInInspector & BlackList attribute
#[inline]
fn should_skip_field(field: &FieldInfo) -> bool {
    static BLACK_LIST_ATTRIBUTE_TYPE: LazyLock<RuntimeType> = LazyLock::new(|| {
        RuntimeType::from_class(get_cached_class("XLua.BlackListAttribute").unwrap()).unwrap()
    });

    static HIDE_IN_INSPECTOR_TYPE: LazyLock<RuntimeType> = LazyLock::new(|| {
        RuntimeType::from_class(get_cached_class("UnityEngine.HideInInspector").unwrap()).unwrap()
    });

    MemberInfo(field.0)
        .get_custom_attribute(*BLACK_LIST_ATTRIBUTE_TYPE)
        .unwrap()
        .0
        != 0
        && MemberInfo(field.0)
            .get_custom_attribute(*HIDE_IN_INSPECTOR_TYPE)
            .unwrap()
            .0
            != 0
}
