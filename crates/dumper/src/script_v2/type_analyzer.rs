use std::{borrow::Cow, collections::HashMap, sync::LazyLock};

use il2cpp::{get_cached_class, vm::value::Il2CppValue};
use reflection::{r#enum::Enum, runtime_type::RuntimeType};

use crate::script_v2::{context::Context, type_registry::TypeRegistry};

static CACHED_TYPE_CODE_MAP: LazyLock<HashMap<RuntimeType, char>> = LazyLock::new(|| {
    HashMap::from([
        (
            RuntimeType::from_class(get_cached_class("System.Void").unwrap()).unwrap(),
            'v',
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Int64").unwrap()).unwrap(),
            'j',
        ),
        (
            RuntimeType::from_class(get_cached_class("System.UInt64").unwrap()).unwrap(),
            'j',
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Single").unwrap()).unwrap(),
            'f',
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Double").unwrap()).unwrap(),
            'd',
        ),
    ])
});

static CACHED_CPP_TYPE_MAP: LazyLock<HashMap<RuntimeType, &'static str>> = LazyLock::new(|| {
    HashMap::from([
        (
            RuntimeType::from_class(get_cached_class("System.Void").unwrap()).unwrap(),
            "void",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Boolean").unwrap()).unwrap(),
            "bool",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Byte").unwrap()).unwrap(),
            "uint8_t",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.SByte").unwrap()).unwrap(),
            "int8_t",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Char").unwrap()).unwrap(),
            "char",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Int16").unwrap()).unwrap(),
            "int16_t",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.UInt16").unwrap()).unwrap(),
            "uint16_t",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Int32").unwrap()).unwrap(),
            "int32_t",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.UInt32").unwrap()).unwrap(),
            "uint32_t",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Int64").unwrap()).unwrap(),
            "int64_t",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.UInt64").unwrap()).unwrap(),
            "uint64_t",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Single").unwrap()).unwrap(),
            "float",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Double").unwrap()).unwrap(),
            "double",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.String").unwrap()).unwrap(),
            "System_String_o*",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Object").unwrap()).unwrap(),
            "Il2CppObject*",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.IntPtr").unwrap()).unwrap(),
            "intptr_t",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.UIntPtr").unwrap()).unwrap(),
            "uintptr_t",
        ),
    ])
});

static CACHED_CS_TYPE_MAP: LazyLock<HashMap<RuntimeType, &'static str>> = LazyLock::new(|| {
    HashMap::from([
        (
            RuntimeType::from_class(get_cached_class("System.Void").unwrap()).unwrap(),
            "void",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Boolean").unwrap()).unwrap(),
            "bool",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Byte").unwrap()).unwrap(),
            "byte",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.SByte").unwrap()).unwrap(),
            "sbyte",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Char").unwrap()).unwrap(),
            "char",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Int16").unwrap()).unwrap(),
            "short",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.UInt16").unwrap()).unwrap(),
            "ushort",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Int32").unwrap()).unwrap(),
            "int",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.UInt32").unwrap()).unwrap(),
            "uint",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Int64").unwrap()).unwrap(),
            "long",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.UInt64").unwrap()).unwrap(),
            "ulong",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Single").unwrap()).unwrap(),
            "float",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Double").unwrap()).unwrap(),
            "double",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.String").unwrap()).unwrap(),
            "string",
        ),
        (
            RuntimeType::from_class(get_cached_class("System.Object").unwrap()).unwrap(),
            "object",
        ),
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

        if type_def.get_isenum().unwrap().unbox() {
            let Ok(enum_underlying) = Enum::get_underlying_type(type_def) else {
                return String::from("int32_t");
            };
            return self.parse_type(enum_underlying);
        }

        if type_def.get_isbyref().unwrap().unbox() || type_def.get_ispointer().unwrap().unbox() {
            return format!("{}*", self.parse_type(type_def.get_element_type().unwrap()));
        }

        if type_def.get_isgenerictype().unwrap().unbox() {
            if let Some(instanced_name) = self.registry.get_by_rt(type_def) {
                return format!("{instanced_name}_o*");
            }

            let generic_definition = type_def.get_generic_type_definition().unwrap();
            if !generic_definition.is_null() {
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

        if type_def.get_isarray().unwrap().unbox() {
            let elem_type = type_def.get_element_type().unwrap();
            let elem_type_name = elem_type.format_type_name_with_namespace(false, false);
            if let Some(known_element_name) = self.registry.get_by_name(&elem_type_name) {
                let arr_name = format!("{known_element_name}_array*");
                self.context.struct_array_info_list.insert(
                    elem_type.get_full_name().unwrap().as_str().to_string(),
                    arr_name.clone(),
                );
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
    let namespace = ty.get_namespace().unwrap();
    let mut namespace = if namespace.is_null() {
        Cow::Borrowed("")
    } else {
        namespace.as_str()
    };

    if !namespace.is_empty() {
        namespace += ".";
    }

    if ty.get_isarray().unwrap().unbox() {
        return format!(
            "{}_Array",
            get_runtime_struct_name(ty.get_element_type().unwrap(), alias, true, true)
        );
    }

    if ty.get_ispointer().unwrap().unbox() || ty.get_isbyref().unwrap().unbox() {
        let mut formatted = get_runtime_struct_name(
            ty.get_element_type().unwrap(),
            alias,
            from_generic,
            struct_name,
        );

        if struct_name {
            return formatted;
        }

        formatted += "*";

        return formatted;
    }

    if ty.get_isgenerictype().unwrap().unbox() {
        let mut name = ty
            .get_generic_type_definition()
            .unwrap()
            .get_name()
            .unwrap()
            .as_str();

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
        let mut name = ty.get_name().unwrap().as_str();
        if let Ok(reflected_type) = ty.get_reflected_type()
            && !reflected_type.is_null()
            && !reflected_type.get_isgenerictype().unwrap().unbox()
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
