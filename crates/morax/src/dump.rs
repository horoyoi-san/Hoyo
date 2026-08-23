use crate::attributes;
use crate::error::Result;
use crate::event::Il2CppEventDefinition;
use crate::field::Il2CppFieldDefinition;
use crate::metadata::Metadata;
use crate::method::Il2CppMethodDefinition;
use crate::property::Il2CppPropertyDefinition;
use crate::script::collect_generic_instantiations;
use crate::type_def::Il2CppTypeDefinition;
use rayon::prelude::*;
use std::collections::{BTreeMap, HashMap};

pub const DEFAULT_WATERMARK: &str = "// Morax Cracked";

pub fn build_dump_cs(metadata: &Metadata) -> Result<String> {
    build_dump_cs_with_watermark(metadata, DEFAULT_WATERMARK)
}

pub fn build_dump_cs_with_watermark(metadata: &Metadata, watermark: &str) -> Result<String> {
    let mut output = String::new();
    output.push_str(watermark);
    output.push_str("\n\n");

    for (index, image) in metadata.images().iter().enumerate() {
        output.push_str(&format!("// Assembly {index}: {}\n", image.name));
    }
    output.push('\n');

    let generic_insts = collect_generic_instantiations(metadata)?;
    let work: Vec<(usize, usize)> = metadata
        .images()
        .iter()
        .enumerate()
        .flat_map(|(image_index, image)| {
            (image.type_start..image.type_start + image.type_count)
                .map(move |type_index| (image_index, type_index))
        })
        .collect();

    let blocks = work
        .par_iter()
        .map(|&(image_index, type_index)| -> Result<String> {
            let image = &metadata.images()[image_index];
            let type_def = metadata.type_def(type_index)?;
            let full_name = metadata.type_display_full_name(type_index)?;

            let mut block = String::new();
            block.push_str(&format!(
                "// AssemblyIndex: {} TypeIndexInAssembly: {}\n",
                image_index + 1,
                type_index - image.type_start
            ));
            block.push_str(&format!("// TypeDefIndex: {type_index}\n"));
            block.push_str(&format!("// Module: {}\n", image.name));
            block.push_str(&format!("// Namespace: {}\n", type_def.namespace));
            block.push_str(&format!("// FullName: {full_name}\n"));
            block.push_str(&write_type(metadata, type_def, type_index, &generic_insts)?);
            block.push('\n');
            Ok(block)
        })
        .collect::<Result<Vec<String>>>()?;

    for block in blocks {
        output.push_str(&block);
    }
    Ok(output)
}

fn write_type(
    metadata: &Metadata,
    type_def: &Il2CppTypeDefinition,
    type_index: usize,
    generic_insts: &HashMap<usize, Vec<(u64, String)>>,
) -> Result<String> {
    let mut output = String::new();

    let mut suffixes = Vec::new();
    if let Some(parent_name) = metadata.parent_name(type_def)? {
        suffixes.push(parent_name);
    }
    suffixes.extend(metadata.interface_names(type_def)?);
    output.push_str(&format!(
        "{} {}",
        attributes::format_type_modifiers(type_def.flags, type_def.is_value_type, type_def.is_enum),
        metadata.type_declaration_name(type_index)?
    ));
    if !suffixes.is_empty() {
        output.push_str(&format!(" : {}", suffixes.join(", ")));
    }
    output.push_str("\n{\n");

    let is_interface = type_def.flags & attributes::type_attributes::INTERFACE != 0;

    let fields = metadata.fields(type_index, type_def)?;
    if !fields.is_empty() {
        output.push_str("\t// Fields\n");
        for field in &fields {
            output.push('\t');
            output.push_str(&write_field(field));
            output.push('\n');
        }
    }

    let mut properties = metadata.properties(type_def)?;
    if !properties.is_empty() {
        properties.sort_by_key(|p| p.token);
        output.push_str("\n\t// Properties\n");
        for property in &properties {
            output.push('\t');
            output.push_str(&write_property(property));
            output.push('\n');
        }
    }

    let mut events = metadata.events(type_def)?;
    if !events.is_empty() {
        events.sort_by_key(|e| e.token);
        output.push_str("\n\t// Events\n");
        for event in &events {
            output.push('\t');
            output.push_str(&write_event(event));
            output.push('\n');
        }
    }

    if let Some(method_start) = type_def.method_start {
        let image_base = metadata.image_base;
        let mut constructors = Vec::new();
        let mut methods = Vec::new();
        for method_index in method_start..method_start + type_def.method_count {
            let method = metadata.method(method_index)?;
            if method.name.ends_with(".ctor") || method.name.ends_with(".cctor") {
                constructors.push((method_index, method));
            } else {
                methods.push((method_index, method));
            }
        }

        if !constructors.is_empty() {
            output.push_str("\n\t// Constructors\n");
            for (method_index, method) in &constructors {
                output.push('\t');
                output.push_str(&write_method(method, image_base, is_interface));
                output.push('\n');
                write_generic_instantiations(&mut output, generic_insts.get(method_index));
            }
        }
        if !methods.is_empty() {
            output.push_str("\n\t// Methods\n");
            for (method_index, method) in &methods {
                output.push('\t');
                output.push_str(&write_method(method, image_base, is_interface));
                output.push('\n');
                write_generic_instantiations(&mut output, generic_insts.get(method_index));
            }
        }
    }

    output.push_str("}\n");
    Ok(output)
}

fn prefix(modifiers: String) -> String {
    if modifiers.is_empty() {
        modifiers
    } else {
        format!("{modifiers} ")
    }
}

fn write_field(field: &Il2CppFieldDefinition) -> String {
    let modifier_part = prefix(attributes::format_field_modifiers(field.flags));
    let value_part = match &field.default_value {
        Some(value) => format!(" = {value}"),
        None => String::new(),
    };
    let offset_part = if field.offset > 0 {
        format!("Offset: 0x{:X} ", field.offset)
    } else {
        String::new()
    };
    format!(
        "{}{} {}{}; // {}Token: 0x{:X}",
        modifier_part, field.type_name, field.name, value_part, offset_part, field.token
    )
}

fn write_generic_instantiations(output: &mut String, instantiations: Option<&Vec<(u64, String)>>) {
    let Some(instantiations) = instantiations else {
        return;
    };
    if instantiations.is_empty() {
        return;
    }
    let mut by_rva: BTreeMap<u64, Vec<&str>> = BTreeMap::new();
    for (rva, name) in instantiations {
        by_rva.entry(*rva).or_default().push(name);
    }
    output.push_str("\t/* GenericInstMethod:\n");
    for (rva, names) in by_rva {
        output.push_str(&format!("\t|\n\t|-RVA: 0x{rva:X}\n"));
        for name in names {
            output.push_str(&format!("\t|-{name}\n"));
        }
    }
    output.push_str("\t*/\n");
}

fn write_property(property: &Il2CppPropertyDefinition) -> String {
    let modifier_part = prefix(attributes::format_method_modifiers(property.flags));
    let mut accessors = String::new();
    if property.has_get {
        let rva = property.get_rva.unwrap_or(0);
        accessors.push_str(&format!("/* 0x{rva:X} */ get; "));
    }
    if property.has_set {
        let rva = property.set_rva.unwrap_or(0);
        accessors.push_str(&format!("/* 0x{rva:X} */ set; "));
    }
    format!(
        "{}{} {} {{ {}}} // Token: 0x{:X}",
        modifier_part, property.type_name, property.name, accessors, property.token
    )
}

fn write_event(event: &Il2CppEventDefinition) -> String {
    let modifier_part = prefix(attributes::format_method_modifiers(event.flags));
    let mut accessors = String::new();
    if let Some(rva) = event.add_rva {
        accessors.push_str(&format!("/* 0x{rva:X} */ add; "));
    }
    if let Some(rva) = event.remove_rva {
        accessors.push_str(&format!("/* 0x{rva:X} */ remove; "));
    }
    if let Some(rva) = event.raise_rva {
        accessors.push_str(&format!("/* 0x{rva:X} */ raise; "));
    }
    format!(
        "{}event {} {} {{ {}}} // Token: 0x{:X}",
        modifier_part, event.type_name, event.name, accessors, event.token
    )
}

fn write_method(method: &Il2CppMethodDefinition, image_base: u64, is_interface: bool) -> String {
    let va = image_base + method.rva;
    let modifier_part = if is_interface {
        String::new()
    } else {
        prefix(attributes::format_method_modifiers(method.flags))
    };
    format!(
        "{}{} {}({}) {{}} // VA: 0x{:X} RVA: 0x{:X}",
        modifier_part,
        method.return_type,
        method.name,
        method.parameter_types_dump.join(", "),
        va,
        method.rva
    )
}
