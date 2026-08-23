use std::{borrow::Cow, collections::HashMap, sync::LazyLock};

use il2cpp::{get_cached_class, vm::value::Il2CppValue};
use reflection::{r#enum::Enum, runtime_type::RuntimeType};

use crate::script_v2::{context::Context, type_registry::TypeRegistry};

/// Evaluate a `Result<BoxedBool>` flag without panicking: an error is treated
/// as `false`. This code runs inside the game process, where a panic means a
/// crash-to-desktop for the whole game.
macro_rules! flag {
    ($e:expr) => {
        ($e).map(|b| b.unbox()).unwrap_or(false)
    };
}

/// Resolve a cached il2cpp class to a `RuntimeType`, skipping the entry when
/// the class is missing instead of poisoning the enclosing `LazyLock` forever.
fn cached_rt(name: &str) -> Option<RuntimeType> {
    get_cached_class(name).and_then(|class| RuntimeType::from_class(class).ok())
}

fn build_map<V: Copy>(entries: &[(&str, V)]) -> HashMap<RuntimeType, V> {
    entries
        .iter()
        .filter_map(|(name, v)| cached_rt(name).map(|rt| (rt, *v)))
        .collect()
}

static CACHED_TYPE_CODE_MAP: LazyLock<HashMap<RuntimeType, char>> = LazyLock::new(|| {
    build_map(&[
        ("System.Void", 'v'),
        ("System.Int64", 'j'),
        ("System.UInt64", 'j'),
        ("System.Single", 'f'),
        ("System.Double", 'd'),
    ])
});

static CACHED_CPP_TYPE_MAP: LazyLock<HashMap<RuntimeType, &'static str>> = LazyLock::new(|| {
    build_map(&[
        ("System.Void", "void"),
        ("System.Boolean", "bool"),
        ("System.Byte", "uint8_t"),
        ("System.SByte", "int8_t"),
        ("System.Char", "char"),
        ("System.Int16", "int16_t"),
        ("System.UInt16", "uint16_t"),
        ("System.Int32", "int32_t"),
        ("System.UInt32", "uint32_t"),
        ("System.Int64", "int64_t"),
        ("System.UInt64", "uint64_t"),
        ("System.Single", "float"),
        ("System.Double", "double"),
        ("System.String", "System_String_o*"),
        ("System.Object", "Il2CppObject*"),
        ("System.IntPtr", "intptr_t"),
        ("System.UIntPtr", "uintptr_t"),
    ])
});

static CACHED_CS_TYPE_MAP: LazyLock<HashMap<RuntimeType, &'static str>> = LazyLock::new(|| {
    build_map(&[
        ("System.Void", "void"),
        ("System.Boolean", "bool"),
        ("System.Byte", "byte"),
        ("System.SByte", "sbyte"),
        ("System.Char", "char"),
        ("System.Int16", "short"),
        ("System.UInt16", "ushort"),
        ("System.Int32", "int"),
        ("System.UInt32", "uint"),
        ("System.Int64", "long"),
        ("System.UInt64", "ulong"),
        ("System.Single", "float"),
        ("System.Double", "double"),
        ("System.String", "string"),
        ("System.Object", "object"),
    ])
});

#[derive(Default)]
pub struct TypeAnalyzer {
    pub context: Context,
    pub registry: TypeRegistry,
}

impl TypeAnalyzer {
    pub fn parse_type(&mut self, type_def: RuntimeType) -> String {
        match type_def.il_name().as_ref() {
            "System.Void" => return String::from("void"),
            "System.Boolean" => return String::from("bool"),
            "System.Char" => return String::from("uint16_t"),
            "System.SByte" => return String::from("int8_t"),
            "System.Byte" => return String::from("uint8_t"),
            "System.Int16" => return String::from("int16_t"),
            "System.UInt16" => return String::from("uint16_t"),
            "System.Int32" => return String::from("int32_t"),
            "System.UInt32" => return String::from("uint32_t"),
            "System.Int64" => return String::from("int64_t"),
            "System.UInt64" => return String::from("uint64_t"),
            "System.Single" => return String::from("float"),
            "System.Double" => return String::from("double"),
            "System.String" => return String::from("System_String_o*"),
            "System.IntPtr" => return String::from("intptr_t"),
            "System.UIntPtr" => return String::from("uintptr_t"),
            "System.Object" => return String::from("Il2CppObject*"),
            _ => {}
        }

        if flag!(type_def.get_isenum()) {
            let Ok(enum_underlying) = Enum::get_underlying_type(type_def) else {
                return String::from("int32_t");
            };
            return self.parse_type(enum_underlying);
        }

        if flag!(type_def.get_isbyref()) || flag!(type_def.get_ispointer()) {
            return match type_def.get_element_type() {
                Ok(elem) => format!("{}*", self.parse_type(elem)),
                Err(_) => String::from("void*"),
            };
        }

        if flag!(type_def.get_isgenerictype()) {
            if let Some(instanced_name) = self.registry.get_by_rt(type_def) {
                return format!("{instanced_name}_o*");
            }

            if let Ok(generic_definition) = type_def.get_generic_type_definition()
                && !generic_definition.is_null()
            {
                if let Some(definition_name) = self.registry.get_by_rt(generic_definition) {
                    return format!("{definition_name}_o*");
                }

                let definition_runtime_name =
                    generic_definition.format_type_name_with_namespace(false, false);

                if !definition_runtime_name.is_empty()
                    && let Some(definition_runtime_unique) =
                        self.registry.get_by_name(&definition_runtime_name)
                {
                    return format!("{definition_runtime_unique}_o*");
                }

                return String::from("Il2CppObject*");
            }
        }

        if flag!(type_def.get_isarray()) {
            let Ok(elem_type) = type_def.get_element_type() else {
                return String::from("Il2CppObject*");
            };
            let elem_type_name = elem_type.format_type_name_with_namespace(false, false);
            if let Some(known_element_name) = self.registry.get_by_name(&elem_type_name) {
                let arr_name = format!("{known_element_name}_array*");
                if let Ok(full_name) = elem_type.get_full_name() {
                    self.context
                        .struct_array_info_list
                        .insert(full_name.as_str().to_string(), arr_name.clone());
                }
                return arr_name;
            }

            let mut ret_type = self.parse_type(elem_type);

            if let Some(stripped) = ret_type.strip_suffix("_o*") {
                ret_type = stripped.to_string();
            }

            ret_type = ret_type.trim_end_matches('*').to_string();

            ret_type.push_str("_array");

            self.context
                .struct_array_info_list
                .insert(elem_type_name.to_string(), ret_type.clone());

            return format!("{ret_type}*");
        }

        if let Some(existing_name) = self
            .registry
            .get_by_name(&type_def.format_type_name_with_namespace(false, false))
        {
            return format!("{existing_name}_o*");
        }

        String::from("Il2CppObject*")
    }

    #[expect(unused)]
    pub fn is_value_type(&self, _rt: RuntimeType, _is_from_generic: bool) -> bool {
        // TODO
        false
    }

    pub fn is_custom_type(&self, _rt: RuntimeType, _is_from_generic: bool) -> bool {
        // TODO
        false
    }

    pub fn get_method_types_signature(&self, runtime_types: Vec<RuntimeType>) -> String {
        runtime_types
            .into_iter()
            .map(|rt| *CACHED_TYPE_CODE_MAP.get(&rt).unwrap_or(&'i'))
            .collect()
    }
}

pub fn get_runtime_struct_name(
    ty: RuntimeType,
    alias: bool,
    from_generic: bool,
    struct_name: bool,
) -> String {
    let mut namespace: Cow<'static, str> = match ty.get_namespace() {
        Ok(ns) if !ns.is_null() => ns.as_str(),
        _ => Cow::Borrowed(""),
    };

    if !namespace.is_empty() {
        namespace += ".";
    }

    if flag!(ty.get_isarray()) {
        let Ok(elem) = ty.get_element_type() else {
            return String::from("Il2CppObject_Array");
        };
        return format!(
            "{}_Array",
            get_runtime_struct_name(elem, alias, true, true)
        );
    }

    if flag!(ty.get_ispointer()) || flag!(ty.get_isbyref()) {
        let Ok(elem) = ty.get_element_type() else {
            return String::from("void*");
        };
        let mut formatted = get_runtime_struct_name(elem, alias, from_generic, struct_name);

        if struct_name {
            return formatted;
        }

        formatted += "*";

        return formatted;
    }

    if flag!(ty.get_isgenerictype()) {
        if let Ok(generic_definition) = ty.get_generic_type_definition()
            && let Ok(generic_name) = generic_definition.get_name()
        {
            let mut name = generic_name.as_str();

            if let Some(pos) = name.find('`') {
                name = name[..pos].to_string().into();
            }

            name += "<";
            let generic_args = ty.get_generic_arguments();
            for (i, generic_arg) in generic_args.iter().enumerate() {
                name = Cow::Owned(format!(
                    "{name}{}",
                    get_runtime_struct_name(*generic_arg, alias, true, struct_name)
                ));

                if i < generic_args.len() - 1 {
                    name += ", ";
                }
            }
            name += ">";

            let mut final_name = namespace + name;

            if struct_name {
                return final_name.to_string();
            }

            // remove _o* that appear on the generic's arg / its base name
            if final_name.contains("_o*") {
                final_name = Cow::Owned(final_name.replace("_o*", ""));
            }

            final_name += "_o*";

            return final_name.to_string();
        }
        // Failed to resolve the generic definition; fall through to the
        // plain-name path below instead of panicking.
    }

    if namespace.starts_with("System") {
        if alias && !from_generic && !struct_name {
            if let Some(&primitive) = CACHED_CPP_TYPE_MAP.get(&ty) {
                return String::from(primitive);
            }
        } else if let Some(&primitive) = CACHED_CS_TYPE_MAP.get(&ty) {
            return String::from(primitive);
        }
    }

    fn get_reflected_type(ty: RuntimeType) -> Cow<'static, str> {
        let mut name: Cow<'static, str> = match ty.get_name() {
            Ok(n) => n.as_str(),
            Err(_) => Cow::Borrowed(""),
        };
        if let Ok(reflected_type) = ty.get_reflected_type()
            && !reflected_type.is_null()
            && !flag!(reflected_type.get_isgenerictype())
        {
            name = Cow::Owned(format!("{}.{name}", get_reflected_type(reflected_type)));
        }

        let namespace = ty.get_il2cpp_type().get_class().get_namespace();
        if !namespace.is_empty() {
            name = namespace + "." + name;
        }

        name
    }

    get_reflected_type(ty).to_string()
}
