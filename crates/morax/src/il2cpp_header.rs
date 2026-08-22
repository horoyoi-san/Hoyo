use crate::crypt::attributes::{FieldAttributes, MethodAttributes};
use crate::crypt::field as field_crypt;
use crate::crypt::generic as generic_crypt;
use crate::error::Result;
use crate::metadata::Metadata;
use crate::pe::read_u32;
use crate::type_def::Il2CppTypeDefinition;
use rayon::prelude::*;
use std::collections::{BTreeMap, HashMap, HashSet};
mod naming;
pub(crate) use naming::fix_name;
use naming::{STRUCT_HEADER, reserve_keyword, unique_name};

pub fn build_il2cpp_h(metadata: &Metadata) -> Result<String> {
    let registry = metadata.build_struct_registry()?;
    let (structs, arrays) = metadata.build_struct_infos(&registry)?;
    let mut out = render(&structs, &arrays);
    out.push_str(&metadata.build_method_info_header(&registry)?);
    Ok(out)
}

pub(crate) struct StructInfo {
    name: String,
    is_value_type: bool,
    parent: Option<String>,
    fields: Vec<StructField>,
    static_fields: Vec<StructField>,
    vtable: Vec<String>,
}

struct StructField {
    c_type: String,
    name: String,
}

type DefInfo = (bool, Option<String>, Vec<String>);
type BuiltStruct = (StructInfo, Vec<(String, String)>);

#[derive(Clone, Copy)]
pub(crate) struct GenericArgs<'a> {
    start: u32,
    types: &'a [u32],
}

impl GenericArgs<'_> {
    pub(crate) const NONE: GenericArgs<'static> = GenericArgs {
        start: 0,
        types: &[],
    };

    fn resolve(&self, var_data: u32) -> Option<u32> {
        var_data
            .checked_sub(self.start)
            .and_then(|i| self.types.get(i as usize))
            .copied()
    }
}

pub(crate) struct Registry {
    by_index: Vec<String>,
    by_full_name: HashMap<String, String>,
    by_generic_class: HashMap<u32, String>,
}

impl Registry {
    pub(crate) fn name(&self, type_def_index: usize) -> Option<&str> {
        self.by_index.get(type_def_index).map(String::as_str)
    }

    fn generic_class_name(&self, class_index: u32) -> Option<&str> {
        self.by_generic_class.get(&class_index).map(String::as_str)
    }
}

impl Metadata {
    pub(crate) fn build_struct_registry(&self) -> Result<Registry> {
        let count = self.types.len();
        let mut by_index = Vec::with_capacity(count);
        let mut by_full_name = HashMap::with_capacity(count);
        let mut used: HashSet<String> = HashSet::with_capacity(count);
        for index in 0..count {
            let full_name = self.type_def_full_name(index)?;
            let unique = unique_name(fix_name(&full_name), &mut used);
            by_index.push(unique.clone());
            by_full_name.insert(full_name, unique);
        }

        let generic_count = self.header.generic_classes_count;
        let mut by_generic_class = HashMap::with_capacity(generic_count as usize);
        for class_index in 0..generic_count {
            if let Some(full_name) = self.generic_inst_name(class_index, false)? {
                let unique = unique_name(fix_name(&full_name), &mut used);
                by_generic_class.insert(class_index, unique);
            }
        }

        Ok(Registry {
            by_index,
            by_full_name,
            by_generic_class,
        })
    }

    pub(crate) fn build_struct_infos(
        &self,
        registry: &Registry,
    ) -> Result<(Vec<StructInfo>, BTreeMap<String, String>)> {
        let built = (0..self.types.len())
            .into_par_iter()
            .map(|index| self.build_struct_info(index, registry))
            .collect::<Result<Vec<_>>>()?;

        let mut structs = Vec::with_capacity(built.len());
        let mut arrays: BTreeMap<String, String> = BTreeMap::new();
        for (info, found_arrays) in built {
            for (struct_name, element) in found_arrays {
                arrays.entry(struct_name).or_insert(element);
            }
            structs.push(info);
        }

        let def_info: Vec<DefInfo> = structs
            .iter()
            .map(|info| (info.is_value_type, info.parent.clone(), info.vtable.clone()))
            .collect();
        let generic_count = self.header.generic_classes_count;
        let instances = (0..generic_count)
            .into_par_iter()
            .map(|class_index| self.build_generic_struct_info(class_index, registry, &def_info))
            .collect::<Result<Vec<_>>>()?;
        for (info, found_arrays) in instances.into_iter().flatten() {
            for (struct_name, element) in found_arrays {
                arrays.entry(struct_name).or_insert(element);
            }
            structs.push(info);
        }

        Ok((structs, arrays))
    }

    fn build_struct_info(&self, type_def_index: usize, registry: &Registry) -> Result<BuiltStruct> {
        let type_def = self.type_def(type_def_index)?;
        let mut arrays = Vec::new();
        let parent = self.struct_parent(type_def, registry)?;
        let (fields, static_fields) =
            self.struct_fields(type_def, registry, &mut arrays, GenericArgs::NONE)?;
        let vtable = self.struct_vtable(type_def)?;
        let info = StructInfo {
            name: registry.name(type_def_index).unwrap_or_default().to_owned(),
            is_value_type: type_def.is_value_type,
            parent,
            fields,
            static_fields,
            vtable,
        };
        Ok((info, arrays))
    }

    fn build_generic_struct_info(
        &self,
        class_index: u32,
        registry: &Registry,
        def_info: &[DefInfo],
    ) -> Result<Option<BuiltStruct>> {
        let Some(name) = registry.generic_class_name(class_index) else {
            return Ok(None);
        };
        let Some((type_def_index, class_inst_index)) = self.generic_class_entry(class_index)?
        else {
            return Ok(None);
        };
        let Some((is_value_type, parent, vtable)) = def_info.get(type_def_index) else {
            return Ok(None);
        };
        let arg_types = if class_inst_index >= 0 {
            self.generic_inst_arg_indices(class_inst_index as u32)?
        } else {
            Vec::new()
        };
        let args = GenericArgs {
            start: self.type_generic_param_start(type_def_index)?,
            types: &arg_types,
        };
        let type_def = self.type_def(type_def_index)?;
        let mut arrays = Vec::new();
        let (fields, static_fields) = self.struct_fields(type_def, registry, &mut arrays, args)?;
        let info = StructInfo {
            name: name.to_owned(),
            is_value_type: *is_value_type,
            parent: parent.clone(),
            fields,
            static_fields,
            vtable: vtable.clone(),
        };
        Ok(Some((info, arrays)))
    }

    fn struct_parent(
        &self,
        type_def: &Il2CppTypeDefinition,
        registry: &Registry,
    ) -> Result<Option<String>> {
        if type_def.is_value_type || type_def.is_enum {
            return Ok(None);
        }
        let Some(parent_index) = type_def.parent_index else {
            return Ok(None);
        };
        let Some(parent_def) = self.type_def_index_of(parent_index)? else {
            return Ok(None);
        };
        let full_name = self.type_def_full_name(parent_def)?;
        if matches!(
            full_name.as_str(),
            "System.Object" | "System.Enum" | "System.Void"
        ) {
            return Ok(None);
        }
        Ok(registry.name(parent_def).map(str::to_owned))
    }

    fn struct_fields(
        &self,
        type_def: &Il2CppTypeDefinition,
        registry: &Registry,
        arrays: &mut Vec<(String, String)>,
        args: GenericArgs<'_>,
    ) -> Result<(Vec<StructField>, Vec<StructField>)> {
        let mut fields = Vec::new();
        let mut static_fields = Vec::new();
        let Some(field_start) = type_def.field_start else {
            return Ok((fields, static_fields));
        };

        let literal = FieldAttributes::Literal.bits() as u16;
        let is_static = FieldAttributes::Static.bits() as u16;
        let mut used: HashSet<String> = HashSet::new();
        for local in 0..type_def.field_count {
            let raw = self.decode_field(field_start + local, field_start, local)?;
            let attrs = self.il2cpp_type(raw.type_index)?.attrs;
            if attrs & literal != 0 {
                continue;
            }
            let mut name = fix_name(&self.decode_string(raw.name_index)?);
            if !used.insert(name.clone()) {
                name = format!("_{local}_{name}");
                used.insert(name.clone());
            }
            reserve_keyword(&mut name, &mut used);
            let c_type = self
                .field_c_type(raw.type_index, registry, arrays, args)?
                .replace("**", "*");
            let field = StructField { c_type, name };
            if attrs & is_static != 0 {
                static_fields.push(field);
            } else {
                fields.push(field);
            }
        }
        Ok((fields, static_fields))
    }

    fn struct_vtable(&self, type_def: &Il2CppTypeDefinition) -> Result<Vec<String>> {
        let Some(method_start) = type_def.method_start else {
            return Ok(Vec::new());
        };
        let virtual_flag = MethodAttributes::Virtual.bits() as u16;
        let mut methods = Vec::new();
        for local in 0..type_def.method_count {
            let (flags, name) = self.method_flags_and_name(method_start + local)?;
            if flags & virtual_flag != 0 {
                methods.push(fix_name(&name));
            }
        }
        Ok(methods)
    }

    pub(crate) fn field_c_type(
        &self,
        type_index: u32,
        registry: &Registry,
        arrays: &mut Vec<(String, String)>,
        args: GenericArgs<'_>,
    ) -> Result<String> {
        let entry = self.il2cpp_type(type_index)?;
        Ok(match entry.kind {
            0x01 => "void".to_owned(),
            0x02 => "bool".to_owned(),
            0x03 => "uint16_t".to_owned(),
            0x04 => "int8_t".to_owned(),
            0x05 => "uint8_t".to_owned(),
            0x06 => "int16_t".to_owned(),
            0x07 => "uint16_t".to_owned(),
            0x08 => "int32_t".to_owned(),
            0x09 => "uint32_t".to_owned(),
            0x0A => "int64_t".to_owned(),
            0x0B => "uint64_t".to_owned(),
            0x0C => "float".to_owned(),
            0x0D => "double".to_owned(),
            0x0E => "System_String_o*".to_owned(),
            0x0F | 0x10 => format!(
                "{}*",
                self.field_c_type(entry.data, registry, arrays, args)?
            ),
            0x11 => self.value_type_c_type(entry.data as usize, registry, arrays, args)?,
            0x12 => class_c_type(registry, entry.data as usize),
            0x13 => match args.resolve(entry.data) {
                Some(arg) => self.field_c_type(arg, registry, arrays, GenericArgs::NONE)?,
                None => "Il2CppObject*".to_owned(),
            },
            0x1E => "Il2CppObject*".to_owned(),
            0x14 => self.array_c_type(entry.data, registry, arrays, true, args)?,
            0x15 => self.generic_inst_c_type(entry.data, registry)?,
            0x16 => "Il2CppObject*".to_owned(),
            0x18 => "intptr_t".to_owned(),
            0x19 => "uintptr_t".to_owned(),
            0x1B => "Il2CppMethodPointer".to_owned(),
            0x1C => "Il2CppObject*".to_owned(),
            0x1D => self.array_c_type(entry.data, registry, arrays, false, args)?,
            _ => "Il2CppObject*".to_owned(),
        })
    }

    fn value_type_c_type(
        &self,
        type_def_index: usize,
        registry: &Registry,
        arrays: &mut Vec<(String, String)>,
        args: GenericArgs<'_>,
    ) -> Result<String> {
        let type_def = self.type_def(type_def_index)?;
        if type_def.is_enum {
            return self.enum_underlying_c_type(type_def, registry, arrays, args);
        }
        Ok(class_c_type(registry, type_def_index))
    }

    fn enum_underlying_c_type(
        &self,
        type_def: &Il2CppTypeDefinition,
        registry: &Registry,
        arrays: &mut Vec<(String, String)>,
        args: GenericArgs<'_>,
    ) -> Result<String> {
        if let Some(field_start) = type_def.field_start {
            let literal = FieldAttributes::Literal.bits() as u16;
            let is_static = FieldAttributes::Static.bits() as u16;
            for local in 0..type_def.field_count {
                let raw = self.decode_field(field_start + local, field_start, local)?;
                let attrs = self.il2cpp_type(raw.type_index)?.attrs;
                if attrs & (literal | is_static) == 0 {
                    return self.field_c_type(raw.type_index, registry, arrays, args);
                }
            }
        }
        Ok("int32_t".to_owned())
    }

    fn array_c_type(
        &self,
        data: u32,
        registry: &Registry,
        arrays: &mut Vec<(String, String)>,
        multidimensional: bool,
        args: GenericArgs<'_>,
    ) -> Result<String> {
        let mut element_index = if multidimensional {
            let element_va = self.pe.rd64(self.array_types_rva + data * 32)?;
            self.type_ptr_index(element_va)?
        } else {
            data
        };
        let element = self.il2cpp_type(element_index)?;
        if element.kind == 0x13
            && let Some(arg) = args.resolve(element.data)
        {
            element_index = arg;
        }

        let element_full = self.type_name(element_index, false)?;
        let (struct_name, element_c_type) =
            if let Some(known) = registry.by_full_name.get(&element_full) {
                (format!("{known}_array"), format!("{known}_o*"))
            } else {
                let mut base = self.field_c_type(element_index, registry, arrays, args)?;
                if let Some(stripped) = base.strip_suffix("_o*") {
                    base = stripped.to_owned();
                }
                (
                    format!("{}_array", base.trim_end_matches('*')),
                    "void*".to_owned(),
                )
            };
        arrays.push((struct_name.clone(), element_c_type));
        Ok(format!("{struct_name}*"))
    }

    fn generic_inst_c_type(&self, class_index: u32, registry: &Registry) -> Result<String> {
        if let Some(name) = registry.generic_class_name(class_index) {
            return Ok(format!("{name}_o*"));
        }
        Ok(match self.generic_class_type_def(class_index)? {
            Some(type_def_index) => class_c_type(registry, type_def_index),
            None => "Il2CppObject*".to_owned(),
        })
    }

    fn type_def_index_of(&self, type_index: u32) -> Result<Option<usize>> {
        let entry = self.il2cpp_type(type_index)?;
        Ok(match entry.kind {
            0x11 | 0x12 => Some(entry.data as usize),
            0x15 => self.generic_class_type_def(entry.data)?,
            _ => None,
        })
    }

    fn generic_class_type_def(&self, class_index: u32) -> Result<Option<usize>> {
        let offset = self.header.generic_classes_offset as usize
            + class_index as usize * generic_crypt::CLASS_ENTRY_SIZE;
        if offset + generic_crypt::CLASS_ENTRY_SIZE > self.startup_data.len() {
            return Ok(None);
        }
        Ok(Some(read_u32(&self.startup_data, offset)? as usize))
    }

    fn decode_field(
        &self,
        field_index: usize,
        field_start: usize,
        local: usize,
    ) -> Result<field_crypt::RawField> {
        let entry = self.header.payload_offset as usize
            + self.header.fields_offset as usize
            + field_index * field_crypt::ENTRY_SIZE;
        Ok(field_crypt::decrypt(
            &self.global_data,
            entry,
            field_start as u32,
            local as u32,
        )?)
    }

    pub(crate) fn build_method_info_header(&self, registry: &Registry) -> Result<String> {
        let instances = crate::script::enumerate_generic_methods(self)?;
        let mut entries: Vec<&crate::script::GenericMethodInstance> = instances
            .iter()
            .filter(|instance| instance.is_method_generic())
            .collect();
        entries.sort_by_key(|instance| instance.rva);

        let mut seen: HashSet<u64> = HashSet::new();
        let mut out = String::new();
        for instance in entries {
            if !seen.insert(instance.rva) {
                continue;
            }
            let Some(klass) = registry.name(instance.declaring_type_index) else {
                continue;
            };
            let mut rgctxs = Vec::new();
            for arg in self.generic_inst_arg_indices(instance.method_inst as u32)? {
                if let Some(entry) = self.rgctx_entry(arg, registry)? {
                    rgctxs.push(entry);
                }
            }
            render_method_info(&mut out, instance.rva, klass, &rgctxs);
        }
        Ok(out)
    }

    fn rgctx_entry(&self, type_index: u32, registry: &Registry) -> Result<Option<(u8, String)>> {
        let entry = self.il2cpp_type(type_index)?;
        if matches!(entry.kind, 0x13 | 0x1E) {
            return Ok(None);
        }
        let name = if entry.kind == 0x15 {
            registry.generic_class_name(entry.data).map(str::to_owned)
        } else {
            registry
                .by_full_name
                .get(&self.type_name(type_index, false)?)
                .cloned()
        };
        let Some(name) = name else {
            return Ok(None);
        };
        let kind = if self.rgctx_is_value_type(type_index)? {
            1
        } else {
            2
        };
        Ok(Some((kind, name)))
    }

    fn rgctx_is_value_type(&self, type_index: u32) -> Result<bool> {
        let entry = self.il2cpp_type(type_index)?;
        Ok(match entry.kind {
            0x02..=0x0D | 0x18 | 0x19 => true,
            0x11 => {
                let type_def = self.type_def(entry.data as usize)?;
                type_def.is_value_type && !type_def.is_enum
            }
            0x15 => match self.generic_class_type_def(entry.data)? {
                Some(index) => {
                    let type_def = self.type_def(index)?;
                    type_def.is_value_type && !type_def.is_enum
                }
                None => false,
            },
            _ => false,
        })
    }
}

fn render_method_info(out: &mut String, rva: u64, klass: &str, rgctxs: &[(u8, String)]) {
    if !rgctxs.is_empty() {
        out.push_str(&format!("struct MethodInfo_{rva:X}_RGCTXs {{\n"));
        for (i, (kind, name)) in rgctxs.iter().enumerate() {
            match kind {
                1 => out.push_str(&format!("\tIl2CppType* _{i}_{name};\n")),
                _ => out.push_str(&format!("\tIl2CppClass* _{i}_{name};\n")),
            }
        }
        out.push_str("};\n");
    }
    out.push_str(&format!("struct MethodInfo_{rva:X} {{\n"));
    out.push_str("\tIl2CppMethodPointer methodPointer;\n");
    out.push_str("\tvoid* invoker_method;\n");
    out.push_str("\tconst char* name;\n");
    out.push_str(&format!("\t{klass}_c *klass;\n"));
    out.push_str("\tconst Il2CppType *return_type;\n");
    out.push_str("\tconst void* parameters;\n");
    if rgctxs.is_empty() {
        out.push_str("\tconst Il2CppRGCTXData* rgctx_data;\n");
    } else {
        out.push_str(&format!("\tconst MethodInfo_{rva:X}_RGCTXs* rgctx_data;\n"));
    }
    out.push_str(
        "\tunion\n\t{\n\t\tconst void* genericMethod;\n\t\tconst void* genericContainer;\n\t};\n",
    );
    out.push_str(
        "\tuint32_t token;\n\tuint16_t flags;\n\tuint16_t iflags;\n\tuint16_t slot;\n\tuint8_t parameters_count;\n\tuint8_t bitflags;\n};\n",
    );
}

fn class_c_type(registry: &Registry, type_def_index: usize) -> String {
    match registry.name(type_def_index) {
        Some(name) => format!("{name}_o*"),
        None => "Il2CppObject*".to_owned(),
    }
}

fn render(structs: &[StructInfo], arrays: &BTreeMap<String, String>) -> String {
    let mut out = String::new();
    out.push_str(STRUCT_HEADER);
    out.push('\n');

    let by_name: HashMap<&str, &StructInfo> = structs
        .iter()
        .map(|info| (info.name.as_str(), info))
        .collect();
    let mut emitted: HashSet<&str> = HashSet::with_capacity(structs.len());
    for info in structs {
        emit_struct(&info.name, &by_name, &mut emitted, &mut out);
    }

    for (struct_name, element_c_type) in arrays {
        out.push_str(&format!("struct {struct_name} {{\n"));
        out.push_str("\tIl2CppObject obj;\n");
        out.push_str("\tIl2CppArrayBounds *bounds;\n");
        out.push_str("\til2cpp_array_size_t max_length;\n");
        out.push_str(&format!("\t{element_c_type} m_Items[65535];\n"));
        out.push_str("};\n");
    }

    out
}

fn emit_struct<'a>(
    name: &'a str,
    by_name: &HashMap<&'a str, &'a StructInfo>,
    emitted: &mut HashSet<&'a str>,
    out: &mut String,
) {
    if !emitted.insert(name) {
        return;
    }
    let Some(info) = by_name.get(name) else {
        return;
    };
    if let Some(parent) = &info.parent
        && by_name.contains_key(parent.as_str())
    {
        emit_struct(parent, by_name, emitted, out);
    }
    render_struct(info, out);
}

fn render_struct(info: &StructInfo, out: &mut String) {
    let name = &info.name;

    match &info.parent {
        Some(parent) => out.push_str(&format!("struct {name}_Fields : {parent}_Fields {{\n")),
        None if !info.is_value_type => out.push_str(&format!(
            "struct __attribute__((aligned(8))) {name}_Fields {{\n"
        )),
        None => out.push_str(&format!("struct {name}_Fields {{\n")),
    }
    for field in &info.fields {
        render_field(field, out);
    }
    out.push_str("};\n");

    if !info.vtable.is_empty() {
        out.push_str(&format!("struct {name}_VTable {{\n"));
        for (i, method) in info.vtable.iter().enumerate() {
            out.push_str(&format!("\tVirtualInvokeData _{i}_{method};\n"));
        }
        out.push_str("};\n");
    }

    out.push_str(&format!("struct {name}_c {{\n"));
    out.push_str("\tIl2CppClass_1 _1;\n");
    if info.static_fields.is_empty() {
        out.push_str("\tvoid* static_fields;\n");
    } else {
        out.push_str(&format!("\tstruct {name}_StaticFields* static_fields;\n"));
    }
    out.push_str("\tIl2CppRGCTXData* rgctx_data;\n");
    out.push_str("\tIl2CppClass_2 _2;\n");
    if info.vtable.is_empty() {
        out.push_str("\tVirtualInvokeData vtable[32];\n");
    } else {
        out.push_str(&format!("\t{name}_VTable vtable;\n"));
    }
    out.push_str("};\n");

    out.push_str(&format!("struct {name}_o {{\n"));
    if !info.is_value_type {
        out.push_str(&format!("\t{name}_c *klass;\n"));
        out.push_str("\tvoid* monitor;\n");
    }
    out.push_str(&format!("\t{name}_Fields fields;\n"));
    out.push_str("};\n");

    if !info.static_fields.is_empty() {
        out.push_str(&format!("struct {name}_StaticFields {{\n"));
        for field in &info.static_fields {
            render_field(field, out);
        }
        out.push_str("};\n");
    }
}

fn render_field(field: &StructField, out: &mut String) {
    if field.c_type.ends_with("_o*") || field.c_type.ends_with("_array*") {
        out.push_str(&format!("\tstruct {} {};\n", field.c_type, field.name));
    } else {
        out.push_str(&format!("\t{} {};\n", field.c_type, field.name));
    }
}
