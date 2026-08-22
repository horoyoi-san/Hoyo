use std::{
    collections::{BTreeSet, HashMap, HashSet},
    fs::File,
    io::Write,
    sync::LazyLock,
};

use convert_case::Casing as _;
use il2cpp::vm::{
    array::Il2CppArray, object::Il2CppObject, string::Il2CppString, value::Il2CppValue,
};
use reflection::{assembly, runtime_type::RuntimeType};

use super::util;

const SKIPPED_TYPES: &[&str] = &[
    "FixPoint",
    "DynamicValue",
    "CachedCodeEntry",
    "RegexRunner",
    "Regex",
    "Match",
    "Group",
    "Capture",
    "GroupCollection",
    "CaptureCollection",
    "RegexCode",
    "RegexBoyerMoore",
];
const SRTOOLS_TYPES: &[&str] = &[
    "AdventurePlayerRow",
    "AvatarRow",
    "AvatarBaseTypeRow",
    "AvatarPromotionRow",
    "AvatarPropertyRow",
    "AvatarRankConfigRow",
    "AvatarServantRow",
    "AvatarServantSkillRow",
    "AvatarSkillRow",
    "AvatarSkillTreeRow",
    "ChallengeBossGroupExtraConfigRow",
    "ChallengeGroupConfigRow",
    "ChallengeMazeConfigRow",
    "ChallengeStoryGroupExtraConfigRow",
    "ChallengeStoryMazeExtraConfigRow",
    "DamageTypeRow",
    "EliteGroupRow",
    "EquipmentRow",
    "EquipmentPromotionRow",
    "EquipmentSkillRow",
    "HardLevelGroupRow",
    "ItemRow",
    "MazeBuffRow",
    "MonsterRow",
    "MonsterTemplateRow",
    "NPCMonsterDataRow",
    "RelicConfigRow",
    "RelicMainAffixConfigRow",
    "RelicSetConfigRow",
    "RelicSetSkillConfigRow",
    "RelicSubAffixConfigRow",
    "ScheduleDataRow",
    "StageRow",
    "StageInfiniteGroupRow",
    "StageInfiniteMonsterGroupRow",
    "StageInfiniteWaveConfigRow",
    "TextmapRow",
    "EnhancedAvatarRow",
    "AvatarEnhancedHintRow",
    "ChallengePeakBossConfigRow",
    "ChallengePeakConfigRow",
    "ChallengePeakGroupConfigRow",
];

const SRTOOLS_EXCELS: &[&str] = &[
    "ChallengeMazeTierce",
    "ChallengeStoryMazeTierce",
    "ChallengeBossMazeTierce",
];

static CS_TYPES: LazyLock<HashMap<&'static str, &'static str>> = LazyLock::new(|| {
    let mut m = HashMap::new();
    m.insert("uint", "u32");
    m.insert("int", "i32");
    m.insert("long", "i64");
    m.insert("ulong", "u64");
    m.insert("short", "i16");
    m.insert("ushort", "u16");
    m.insert("byte", "u8");
    m.insert("sbyte", "i8");
    m.insert("IntPtr", "isize");
    m.insert("string", "String");
    m.insert("float", "f32");
    m.insert("double", "f64");
    m.insert("FixPoint", "FixPoint");
    m.insert("TextID", "TextID");
    m.insert("MVector3", "MVector3");
    m.insert("MVector2", "MVector2");
    m.insert("StringHash", "StringHash");
    m.insert("bool", "bool");
    m
});

#[allow(unused_must_use)]
fn format_struct(ty: RuntimeType, table: &HashMap<RuntimeType, Vec<String>>) -> String {
    use std::fmt::Write;
    let mut out = String::new();

    if ty.get_isgenerictype().unwrap().unbox()
        || ty.get_isprimitive().unwrap().unbox()
        || ty.get_ispointer().unwrap().unbox()
        || ty.get_isarray().unwrap().unbox()
    {
        return out;
    }

    let assembly = ty.get_assembly().unwrap().get_name();
    if assembly == "mscorlib" {
        return out;
    }

    let formatted_name = ty.format_type_name(true);

    if SKIPPED_TYPES.iter().any(|v| formatted_name == *v) {
        return out;
    }

    if ty.get_isenum().unwrap().unbox() {
        writeln!(
            out,
            "#[derive(Debug, Default, Clone, Deserialize, Eq, PartialEq, Hash)]"
        );
        writeln!(out, "pub enum {} {{", formatted_name.replace('.', "_"));
        for (i, field) in ty.get_fields(24).iter().enumerate() {
            writeln!(
                out,
                "\t{}{} = {},",
                if i == 0 { "#[default] " } else { "" },
                field.get_name().unwrap().as_str(),
                field.get_value(Il2CppObject::NULL).unwrap().unbox::<i32>()
            );
        }
        writeln!(out, "}}");
    } else {
        let mut temp = Vec::new();
        let paths = if formatted_name != "TextmapRow" {
            table.get(&ty)
        } else {
            temp.extend(vec![
                String::from("\t\t\"TextMap/TextMapEN.json\""),
                String::from("\t\t\"TextMap/TextMapCN.json\""),
            ]);
            Some(&temp)
        };

        writeln!(
            out,
            "#[derive(Debug, Default, Clone, Deserialize{})]\n#[serde(rename_all = \"PascalCase\")]",
            if let Some(paths) = paths
                && !paths.is_empty()
            {
                ", ExcelOutput"
            } else {
                ""
            }
        );

        if let Some(paths) = paths
            && !paths.is_empty()
        {
            let formatted_paths = paths.join(",\n");

            writeln!(
                out,
                "#[rows(\n\tpaths = [\n{formatted_paths}\n\t],\n\treturn_type = Vec<Self>\n)]"
            );
        }

        writeln!(out, "pub struct {} {{", formatted_name.replace('.', "_"));

        let mut fields = ty
            .all_fields()
            .into_iter()
            .map(|f| (f.get_metadata_token(), f))
            .collect::<HashMap<_, _>>()
            .into_iter()
            .map(|v| v.1)
            .collect::<Vec<_>>(); // TODO: FIXME

        fields.sort_by_key(reflection::field_info::FieldInfo::get_metadata_token);

        for field in fields {
            if field.get_isstatic().unwrap().unbox() || field.modifier().contains("private") {
                continue;
            }

            let field_name = {
                let field_name = field.get_name().unwrap().as_str();
                let snake_cased =
                    replace_rust_reserved_words(field_name.to_case(convert_case::Case::Snake));
                let pascal_cased = snake_cased.to_case(convert_case::Case::Pascal);

                if pascal_cased == field_name {
                    format!("\t#[serde(default)]\n\tpub {snake_cased}")
                } else {
                    format!("\t#[serde(rename = \"{field_name}\", default)]\n\tpub {snake_cased}")
                }
            };
            writeln!(
                out,
                "{}: {},",
                if field_name == "\tpub type" {
                    "\tpub r#type"
                } else {
                    &field_name
                },
                format_type(&field.get_field_type().unwrap().format_type_name(true)),
            );
        }

        writeln!(out, "}}");
    }

    out
}

fn excel_rows() -> HashMap<RuntimeType, Vec<String>> {
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
            if generics.len() == 2 {
                Some(generics[1])
            } else {
                None
            }
        }) {
            let paths = fields
                .iter()
                .filter(|&f| f.get_field_type().unwrap().format_type_name(true) == "string[]")
                .filter_map(|f| f.get_value(Il2CppObject::NULL).ok())
                .filter(|f| !f.is_null())
                .flat_map(|obj| {
                    Il2CppArray(obj.0)
                        .to_vec::<Il2CppString>()
                        .iter()
                        .map(|v| {
                            format!(
                                "\t\t\"ExcelOutput/{}.json\"",
                                v.as_str().split('/').next_back().unwrap().replace(".bytes", "")
                            )
                        })
                        .collect::<Vec<String>>()
                })
                .collect::<HashSet<String>>()
                .into_iter()
                .collect::<Vec<_>>();

            if paths.is_empty() {
                continue;
            }

            let should_include = SRTOOLS_TYPES.contains(&row.format_type_name(true).as_str())
                || SRTOOLS_EXCELS
                    .iter()
                    .any(|v| paths.contains(&format!("\t\t\"ExcelOutput/{v}.json\"")));

            if should_include {
                tables.insert(row, paths);
            }
        }
    }
    tables
}

fn format_type(type_str: &str) -> String {
    if let Some(mapped_type) = CS_TYPES.get(type_str) {
        return mapped_type.to_string();
    }

    if type_str.ends_with("[]") {
        return format!(
            "Vec<{}>",
            format_type(type_str.strip_suffix("[]").unwrap_or(type_str))
        );
    }

    if type_str.starts_with("List<")
        || type_str.starts_with("PooledList<")
        || type_str.starts_with("LinkedList<")
    {
        let inner = extract_inner_type(type_str);
        return format!("Vec<{}>", format_type(inner));
    }

    if type_str.starts_with("Dictionary<") {
        let (ktype, vtype) = extract_key_value_types(type_str);
        return format!("HashMap<{}, {}>", format_type(&ktype), format_type(&vtype));
    }

    type_str.to_string()
}

#[inline]
fn extract_inner_type(type_str: &str) -> &str {
    &type_str[5..type_str.len() - 1]
}

#[inline]
fn extract_key_value_types(type_str: &str) -> (String, String) {
    let inside = &type_str[11..type_str.len() - 1];
    let mut parts = inside.split(", ");
    let key_type = parts.next().unwrap().to_string();
    let value_type = parts.next().unwrap().to_string();
    (key_type, value_type)
}

fn replace_rust_reserved_words(name: String) -> String {
    const RUST_KEYWORDS: &[&str] = &[
        "as", "break", "const", "continue", "crate", "else", "enum", "extern", "false", "fn",
        "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref",
        "return", "self", "Self", "static", "struct", "super", "trait", "true", "type", "unsafe",
        "use", "where", "while", "async", "await", "dyn", "abstract", "become", "box", "do",
        "final", "macro", "override", "priv", "try", "typeof", "unsized", "virtual", "yield",
    ];

    let words: Vec<String> = name
        .split_whitespace()
        .map(|word| {
            if RUST_KEYWORDS.contains(&word) {
                format!("r_{word}")
            } else {
                word.to_string()
            }
        })
        .collect();

    words.join(" ")
}

pub fn gen_excel_structs(out: &mut File) {
    let tables = excel_rows();

    let mut types = BTreeSet::new();

    for row in tables.keys() {
        util::recursive(*row, &mut types);
    }

    writeln!(
        out,
        "\
// auto-generated file!

#![allow(warnings, clippy::all, overflowing_literals)]

use std::collections::HashMap;
use serde::{{Serialize, Deserialize}};
use crate::enums::*;
use crate::common_types::*;
"
    )
    .unwrap();

    for ty in types {
        writeln!(out, "{}", format_struct(ty, &tables)).unwrap();
    }
}
