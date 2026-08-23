use std::collections::HashMap;
use std::{fs, path::Path};

use dashmap::DashMap;

use crate::crypt::default_value;
use crate::crypt::header as header_crypt;
use crate::crypt::header::Il2CppGlobalMetadataHeader;
use crate::crypt::il2cpp_type as type_crypt;
use crate::crypt::method::METHOD_ATTRIBUTE_XOR;
use crate::crypt::invoker;
use crate::crypt::script as script_key;
use crate::error::Result;
use crate::image::Il2CppImageDefinition;
use crate::pe::Pe;
use crate::type_def::Il2CppTypeDefinition;


pub struct Metadata {
    pub(crate) header: Il2CppGlobalMetadataHeader,
    pub(crate) global_data: Vec<u8>,
    pub(crate) startup_data: Vec<u8>,
    pub(crate) pe: Pe,
    pub(crate) image_base: u64,
    pub(crate) metadata_cache_register_rva: u32,
    pub(crate) code_registration_rva: u32,
    pub(crate) metadata_registration_rva: u32,
    pub(crate) global_metadata_header_rva: u32,
    pub(crate) types_rva: u32,
    pub(crate) il2cpp_type_format: type_crypt::Format,
    pub(crate) array_types_rva: u32,
    pub(crate) method_pointers_rva: u32,
    pub(crate) invoker_pointers_rva: u32,
    pub(crate) invoker_count: u32,
    pub(crate) generic_insts_rva: u32,
    pub(crate) method_usage_base_rva: u32,
    pub(crate) typeinfo_usage_base_rva: u32,
    pub(crate) string_usage_base_rva: u32,
    pub(crate) method_attribute_xor: u16,
    pub(crate) images: Vec<Il2CppImageDefinition>,
    pub(crate) types: Vec<Il2CppTypeDefinition>,
    pub(crate) field_default_values: HashMap<usize, (u32, u32)>,
    pub(crate) string_cache: DashMap<u32, String>,
    pub(crate) type_name_cache: DashMap<(u32, bool), String>,
    pub(crate) generic_container_cache: DashMap<u32, Option<Vec<String>>>,
}

impl Metadata {
    pub fn load(
        game_assembly: &Path,
        global_data: Vec<u8>,
        startup_metadata: &Path,
    ) -> Result<Self> {
        let pe = Pe::read(game_assembly)?;
        let (globals, header) = Il2CppGlobalMetadataHeader::discover(&pe)?;
        let startup_data = fs::read(startup_metadata)?;
        let image_base = pe.image_base();

        let metadata_registration = globals.metadata_registration_rva;
        let code_registration = globals.code_registration_rva;
        let usage = globals.usage_struct_rva;

        let types_rva =
            pe.pointer(metadata_registration + header_crypt::METADATA_REGISTRATION_TYPES_OFF)?;
        let il2cpp_type_format = type_crypt::detect(&pe, types_rva);
        let array_types_rva =
            pe.pointer(metadata_registration + header_crypt::METADATA_REGISTRATION_ARRAY_OFF)?;
        let generic_insts_rva = pe.pointer(
            metadata_registration + header_crypt::METADATA_REGISTRATION_GENERIC_INST_OFF,
        )?;
        let method_pointers_rva =
            pe.pointer(code_registration + header_crypt::CODE_REGISTRATION_METHOD_POINTERS_OFF)?;
        let invoker_pointers_rva =
            pe.pointer(code_registration + invoker::CODE_REGISTRATION_INVOKER_POINTERS_OFF)?;
        let invoker_count = invoker::pointer_count(&pe, code_registration)?;

        let method_usage_base_rva = pe.pointer(usage + script_key::USAGE_STRUCT_METHOD_OFF)?;
        let typeinfo_usage_base_rva = pe.pointer(usage + script_key::USAGE_STRUCT_TYPEINFO_OFF)?;
        let string_usage_base_rva = pe.pointer(usage + script_key::USAGE_STRUCT_STRING_OFF)?;

        let mut metadata = Self {
            header,
            global_data,
            startup_data,
            pe,
            image_base,
            metadata_cache_register_rva: globals.metadata_cache_register_rva,
            code_registration_rva: globals.code_registration_rva,
            metadata_registration_rva: globals.metadata_registration_rva,
            global_metadata_header_rva: globals.global_metadata_header_rva,
            types_rva,
            il2cpp_type_format,
            array_types_rva,
            method_pointers_rva,
            invoker_pointers_rva,
            invoker_count,
            generic_insts_rva,
            method_usage_base_rva,
            typeinfo_usage_base_rva,
            string_usage_base_rva,
            method_attribute_xor: METHOD_ATTRIBUTE_XOR,
            images: Vec::new(),
            types: Vec::new(),
            field_default_values: HashMap::new(),
            string_cache: DashMap::new(),
            type_name_cache: DashMap::new(),
            generic_container_cache: DashMap::new(),
        };
        metadata.images = metadata.load_images()?;
        metadata.types = metadata.load_type_definitions()?;
        metadata.field_default_values = default_value::load(
            &metadata.pe,
            metadata.metadata_registration_rva,
            &metadata.global_data,
            metadata.header.payload_offset,
            metadata.header.field_default_values_offset,
        )?;
        Ok(metadata)
    }

    pub fn header(&self) -> &Il2CppGlobalMetadataHeader {
        &self.header
    }

    pub fn images(&self) -> &[Il2CppImageDefinition] {
        &self.images
    }

    pub fn type_def(&self, index: usize) -> Result<&Il2CppTypeDefinition> {
        self.types
            .get(index)
            .ok_or_else(|| format!("type index {index} out of range").into())
    }

    pub fn describe(&self) -> String {
        let registry_res = self.build_struct_registry();
        let structs_count = registry_res
            .ok()
            .and_then(|r| self.build_struct_infos(&r).ok())
            .map_or(0, |(structs, _)| structs.len());
        let method_to_type = crate::script::build_method_to_type(self).unwrap_or_default();
        let generic_method_rva = std::collections::HashMap::new();
        let usage_sections =
            crate::script::build_usage_sections(self, &method_to_type, &generic_method_rva).ok();
        let type_info_count = usage_sections
            .as_ref()
            .map_or(0, |(meta, _, _)| meta.len());
        let stringliteral_count = usage_sections
            .as_ref()
            .map_or(0, |(_, _, strings)| strings.len());
        let method_usage_count = usage_sections
            .as_ref()
            .map_or(0, |(_, meta_method, _)| meta_method.len());
        let generic_method_count = crate::script::enumerate_generic_methods(self)
            .map_or(0, |g| g.len());

        format!(
            "morax metadata:\n  MetadataCache::Register RVA: 0x{:X}\n  Il2CppCodeRegistration RVA: 0x{:X}\n  \
             Il2CppMetadataRegistration RVA: 0x{:X}\n  Il2CppGlobalMetadataHeader RVA: 0x{:X}\n  \
             payload offset: 0x{:X}\n  image count: {}\n  assembly count: {}\n  \
             type definitions offset: 0x{:X}\n  methods offset: 0x{:X}\n  fields offset: 0x{:X}\n  \
             parameters offset: 0x{:X}\n  string offset: 0x{:X}\n  \
             Il2CppType table RVA: 0x{:X}\n  \
             script dump stats:\n    type info: {}\n    stringliteral: {}\n    method usage: {}\n    generic method: {}\n   
             structs: {}\n",
            self.metadata_cache_register_rva,
            self.code_registration_rva,
            self.metadata_registration_rva,
            self.global_metadata_header_rva,
            self.header.payload_offset,
            self.header.image_count,
            self.header.assembly_count,
            self.header.type_definitions_offset,
            self.header.methods_offset,
            self.header.fields_offset,
            self.header.parameters_offset,
            self.header.string_offset,
            self.types_rva,
            type_info_count,
            stringliteral_count,
            method_usage_count,
            generic_method_count,
            structs_count,
        )
    }
}
