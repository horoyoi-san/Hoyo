use std::{borrow::Cow, collections::HashMap, fs::File, io::Write as _, sync::atomic::Ordering};

use il2cpp::MAX_TYPEDEFINDEX;
use il2cpp::vm::value::Il2CppValue;
use reflection::{
    attributes::{MethodAttributes, TypeAttributes},
    custom_attribute::format_custom_atrributes,
    event_info::EventInfo,
    field_info::FieldInfo,
    method_info::MethodInfo,
    property_info::PropertyInfo,
    runtime_type::RuntimeType,
};


#[allow(unused)]
pub fn dump(debug: bool) -> std::io::Result<()> {
    unsafe {
        log::debug!("[C# Dumper] dumping full cs...");
        let _ = std::fs::create_dir_all("./DUMP/IL2CPP_Dumper");
        let mut file = File::create("./DUMP/IL2CPP_Dumper/dump.cs").expect("Failed to create dump.reflection.cs");

        writeln!(
            file,
            "// Dumped with hsr-dumping-skull | Game Version: {}\n",
            *crate::version::GAME_VERSION
        );

        let assemblies = reflection::assembly::get_assemblies();
        for (i, asm) in assemblies.iter().enumerate() {
            writeln!(
                file,
                "// Assembly {i}: {}",
                asm.get_full_name().map(|v| v.as_str()).unwrap_or_default()
            )?;
        }
        writeln!(file)?;

        let mut current_assembly_name = Cow::Borrowed("");
        let mut type_index_in_assembly = 0;
        let mut assembly_index = 0;

        let metadata_methods = crate::script::METADATA_METHODS.get_or_init(|| {
            log::debug!("[C# Dumper] Initializing metadata methods (script dump required but missing, initializing now)...");
            crate::script::dump();
            crate::script::METADATA_METHODS.get().cloned().unwrap_or_default()
        });

        for typedef_index in 0..MAX_TYPEDEFINDEX.load(Ordering::Relaxed) {
            let class = il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(typedef_index);

            let runtime_type = RuntimeType::from_class(class).unwrap();

            if debug {
                log::debug!(
                    "[C# Dumper] ({}) {}",
                    typedef_index,
                    runtime_type
                        .get_name()
                        .map(|v| v.as_str())
                        .unwrap_or_default()
                );
            }

            let namespace = class.get_namespace();
            let full_name = class.byval_arg().full_name();
            let new_assembly_name = runtime_type.get_assembly().unwrap().get_name() + ".dll";
            if current_assembly_name != new_assembly_name {
                assembly_index += 1;
                type_index_in_assembly = 0;
                current_assembly_name = new_assembly_name;
            } else {
                type_index_in_assembly += 1;
            }

            let class_str = format_type_to_csharp(&runtime_type, metadata_methods);
            let capacity = 100
                + typedef_index.to_string().len()
                + current_assembly_name.len()
                + namespace.len()
                + full_name.len()
                + class_str.len();

            let mut out = String::with_capacity(capacity);

            out.push_str("// AssemblyIndex: ");
            out.push_str(&assembly_index.to_string());
            out.push_str(" TypeIndexInAssembly: ");
            out.push_str(&type_index_in_assembly.to_string());
            out.push('\n');
            out.push_str("// TypeDefIndex: ");
            out.push_str(&typedef_index.to_string());
            out.push('\n');
            out.push_str("// Module: ");
            out.push_str(&current_assembly_name);
            out.push('\n');
            out.push_str("// Namespace: ");
            out.push_str(namespace.as_ref());
            out.push('\n');
            out.push_str("// FullName: ");
            out.push_str(full_name.as_ref());
            out.push('\n');
            out.push_str(&class_str);
            out.push('\n');

            file.write_all(out.as_bytes())?;
        }

        log::debug!("[C# Dumper] Done");

        Ok(())
    }
}

fn type_modifier(ty: &RuntimeType) -> String {
    let attributes = ty.get_attributes().unwrap().unbox();
    let visibility = attributes & TypeAttributes::VisibilityMask;

    let mut ret = String::from(match visibility {
        TypeAttributes::Public | TypeAttributes::NestedPublic => "public ",
        TypeAttributes::NotPublic
        | TypeAttributes::NestedFamANDAssem
        | TypeAttributes::NestedAssembly => "internal ",
        TypeAttributes::NestedPrivate => "private ",
        TypeAttributes::NestedFamily => "protected ",
        TypeAttributes::NestedFamORAssem => "protected internal ",
        _ => "",
    });

    if attributes.contains(TypeAttributes::Abstract) && attributes.contains(TypeAttributes::Sealed)
    {
        ret.push_str("static ");
    } else if !attributes.contains(TypeAttributes::Interface)
        && attributes.contains(TypeAttributes::Abstract)
    {
        ret.push_str("abstract ");
    } else if !ty.get_isenum().unwrap().unbox() && attributes.contains(TypeAttributes::Sealed) {
        ret.push_str("sealed ");
    }

    if ty.get_isinterface().unwrap().unbox() {
        ret.push_str("interface ");
    } else if ty.get_isenum().unwrap().unbox() {
        ret.push_str("enum ");
    } else if ty.get_isvaluetype().unwrap().unbox() {
        ret.push_str("struct ");
    } else {
        ret.push_str("class ");
    }

    ret
}

fn method_modifier(method: &MethodInfo) -> String {
    let flags = method.get_attributes().unwrap().unbox();
    let access = flags & MethodAttributes::MemberAccessMask;

    let mut output = String::from(match access {
        MethodAttributes::Private => "private ",
        MethodAttributes::Public => "public ",
        MethodAttributes::Family => "protected ",
        MethodAttributes::Assembly | MethodAttributes::FamANDAssem => "internal ",
        MethodAttributes::FamORAssem => "protected internal ",
        _ => "",
    });

    if flags.contains(MethodAttributes::Static) {
        output.push_str("static ");
    }

    if flags.contains(MethodAttributes::Abstract) {
        output.push_str("abstract ");
        if (flags & MethodAttributes::VtableLayoutMask) == MethodAttributes::ReuseSlot {
            output.push_str("override ");
        }
    } else if flags.contains(MethodAttributes::Final) {
        if (flags & MethodAttributes::VtableLayoutMask) == MethodAttributes::ReuseSlot {
            output.push_str("sealed override ");
        }
    } else if flags.contains(MethodAttributes::Virtual) {
        if (flags & MethodAttributes::VtableLayoutMask) == MethodAttributes::NewSlot {
            output.push_str("virtual ");
        } else {
            output.push_str("override ");
        }
    }

    if flags.contains(MethodAttributes::PinvokeImpl) {
        output.push_str("extern ");
    }

    output
}

fn format_method_to_csharp(method: &MethodInfo) -> String {
    let attributes = format_custom_atrributes(method.get_custom_attributes());
    let modifier = method_modifier(method);
    let return_type = method.get_return_type().unwrap().format_type_name(true);
    let method_name = method.get_name().unwrap().as_str();
    let generic_arguments = if method.get_is_generic_method().unwrap().unbox() {
        &format!(
            "<{}>",
            method
                .get_generic_arguments()
                .iter()
                .map(|v| v.format_type_name(true))
                .collect::<Vec<_>>()
                .join(", ")
        )
    } else {
        ""
    };

    let parameters = method
        .get_parameters()
        .iter()
        .map(reflection::parameter_info::RuntimeParameterInfo::format_to_csharp)
        .collect::<Vec<_>>()
        .join(", ");

    let rva = method.get_il2cpp_method().rva();
    format!(
        "{attributes}{modifier}{return_type} {method_name}{generic_arguments}({parameters}) {{}} // VA: 0x{:X} RVA: 0x{:X}",
        0x180000000usize + rva,
        rva
    )
}

fn format_event_to_csharp(event: &EventInfo) -> String {
    let mut out = String::with_capacity(256);

    let attributes = format_custom_atrributes(event.get_custom_attributes());
    let add = event.get_add_method(true).ok().filter(|m| !m.is_null());
    let remove = event.get_remove_method(true).ok().filter(|m| !m.is_null());
    let raise = event.get_raise_method(true).ok().filter(|m| !m.is_null());

    let name = event
        .get_name()
        .map(|v| v.as_str().to_string())
        .unwrap_or_default();

    let accessor = add.as_ref().or(remove.as_ref()).or(raise.as_ref());
    let (modifier, type_name) = match accessor {
        Some(m) => {
            let modifier = method_modifier(m);
            let type_name = m
                .get_parameters()
                .first().map_or_else(|| "object".to_string(), |p| p.get_parameter_type().unwrap().format_type_name(true));
            (modifier, type_name)
        }
        None => (String::new(), "object".to_string()),
    };

    let accessor_str = |method: &Option<MethodInfo>, keyword: &str| -> String {
        method
            .as_ref()
            .map(|m| format!("/* 0x{:X} */ {keyword}; ", m.get_il2cpp_method().rva()))
            .unwrap_or_default()
    };
    let accessors = format!(
        "{}{}{}",
        accessor_str(&add, "add"),
        accessor_str(&remove, "remove"),
        accessor_str(&raise, "raise")
    );

    out.push_str(&attributes);
    out.push_str(&format!(
        "{modifier}event {type_name} {name} {{ {accessors}}}"
    ));
    out.push_str(&format!(" // Token: 0x{:X}", event.get_metadata_token()));

    out
}

fn format_property_to_csharp(prop: &PropertyInfo) -> String {
    let mut out = String::with_capacity(256);

    let attributes = format_custom_atrributes(prop.get_custom_attributes());
    let property_type = prop.get_property_type().unwrap().format_type_name(true);
    let property_name = prop.get_name().unwrap().as_str();

    let get = prop.get_get_method(true).unwrap();
    let set = prop.get_set_method(true).unwrap();

    let modifier = if !get.is_null() {
        method_modifier(&get)
    } else if !set.is_null() {
        method_modifier(&set)
    } else {
        String::new()
    };

    let get_accessor = if !get.is_null() {
        format!("/* 0x{:X} */ get;", get.get_il2cpp_method().rva())
    } else {
        String::new()
    };
    let set_accessor = if !set.is_null() {
        format!("/* 0x{:X} */ set;", set.get_il2cpp_method().rva())
    } else {
        String::new()
    };

    let accessors = if !get_accessor.is_empty() && !set_accessor.is_empty() {
        format!("{get_accessor} {set_accessor}")
    } else {
        get_accessor + &set_accessor
    };

    out.push_str(&attributes);
    out.push_str(&modifier);
    out.push_str(&property_type);
    out.push(' ');
    out.push_str(&property_name);
    out.push_str(" { ");
    out.push_str(&accessors);
    out.push_str(" } // Token: 0x");
    out.push_str(&format!("{:X}", prop.get_metadata_token()));

    out
}

fn write_generic_methods(
    ty: &RuntimeType,
    method: &MethodInfo,
    metadata_methods: &HashMap<i32, HashMap<i32, Vec<MethodInfo>>>,
    out: &mut String,
) {
    if method.get_il2cpp_method().rva() == 0
        && let Some(methods) = metadata_methods
            .get(&ty.get_metadata_token())
            .and_then(|m| m.get(&method.get_metadata_token()))
    {
        let grouped =
            methods
                .iter()
                .fold(HashMap::<usize, Vec<MethodInfo>>::new(), |mut f, acc| {
                    f.entry(acc.get_il2cpp_method().rva())
                        .or_default()
                        .push(*acc);
                    f
                });

        out.push_str("\t/* GenericInstMethod:\n");
        for (rva, methods) in grouped {
            out.push_str(&format!("\t|\n\t|-RVA: 0x{rva:X}\n"));
            for method in methods {
                out.push_str(&format!(
                    "\t|-{}.{}<{}>\n",
                    RuntimeType::from_class(method.get_il2cpp_method().class())
                        .unwrap()
                        .format_type_name(true),
                    method.get_name().unwrap().as_str(),
                    method
                        .get_generic_arguments()
                        .iter()
                        .map(|v| v.format_type_name(true))
                        .collect::<Vec<_>>()
                        .join(", "),
                ));
            }
        }
        out.push_str("\t*/\n");
    }
}

fn format_type_to_csharp(
    ty: &RuntimeType,
    metadata_methods: &HashMap<i32, HashMap<i32, Vec<MethodInfo>>>,
) -> String {
    let mut out = String::with_capacity(1024);
    let as_il2cpp_type = ty.get_il2cpp_type();
    let attributes = format_custom_atrributes(ty.get_custom_attributes());
    let modifier = type_modifier(ty);
    let type_name = ty.format_type_name(false);

    let interfaces = ty
        .base_types()
        .iter()
        .filter(|ty| {
            let name = ty.get_name().unwrap().as_str();
            name != "Object" && name != "Enum" && name != "ValueType"
        })
        .map(|v| v.format_type_name(true))
        .collect::<Vec<_>>()
        .join(", ");

    let interfaces = if !interfaces.is_empty() {
        format!(" : {interfaces}")
    } else {
        String::new()
    };

    out.push_str(&attributes);
    out.push_str(&modifier);
    out.push_str(&type_name);
    out.push_str(interfaces.as_str());
    out.push_str("\n{\n");

    let fields = as_il2cpp_type.get_class().get_fields();
    if !fields.is_empty() {
        out.push_str("\t// Fields\n");
        for field in fields {
            let field_str = FieldInfo::from_il2cpp_field(field)
                .unwrap()
                .to_string()
                .replace('\n', "\n\t");
            out.push('\t');
            out.push_str(&field_str);
            out.push('\n');
        }
    }

    let properties = ty.get_properties(62);
    if !properties.is_empty() {
        out.push_str("\n\t// Properties\n");
        for property in &properties {
            let prop_str = format_property_to_csharp(property).replace('\n', "\n\t");
            out.push('\t');
            out.push_str(&prop_str);
            out.push('\n');
        }
    }

    let mut events = ty.get_events(62);
    if !events.is_empty() {
        events.sort_by_key(reflection::event_info::EventInfo::get_metadata_token);
        out.push_str("\n\t// Events\n");
        for event in &events {
            let event_str = format_event_to_csharp(event).replace('\n', "\n\t");
            out.push('\t');
            out.push_str(&event_str);
            out.push('\n');
        }
    }

    let methods = as_il2cpp_type
        .get_class()
        .get_methods()
        .into_iter()
        .filter_map(|v| MethodInfo::from_handle(v).ok())
        .collect::<Vec<_>>();

    let (constructors, methods): (Vec<MethodInfo>, Vec<MethodInfo>) =
        methods.iter().partition(|m| {
            let name = m.get_name().unwrap().as_str();
            name.ends_with(".ctor") || name.ends_with(".cctor")
        });

    if !constructors.is_empty() {
        out.push_str("\n\t// Constructors\n");
        for constructor in constructors {
            out.push('\t');
            out.push_str(&format_method_to_csharp(&constructor).replace('\n', "\n\t"));
            out.push('\n');
            write_generic_methods(ty, &constructor, metadata_methods, &mut out);
        }
    }

    if !methods.is_empty() {
        out.push_str("\n\t// Methods\n");
        for method in methods {
            out.push('\t');
            out.push_str(&format_method_to_csharp(&method).replace('\n', "\n\t"));
            out.push('\n');
            write_generic_methods(ty, &method, metadata_methods, &mut out);
        }
    }

    out.push_str("}\n");

    out
}
