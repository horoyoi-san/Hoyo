use anyhow::Result;

use crate::crypt::script as script_key;
use crate::crypt::{
    default_value, event, field, generic, generic_table, image, invoker, method, param, property,
    string, type_def,
};
use crate::pe::Pe;

// global metadata function had types and generic inst
// also find it at il2cpp_class_from_type
pub const METADATA_REGISTRATION_TYPES_OFF: u32 = 0x68; // -> Il2CppType** types
pub const METADATA_REGISTRATION_GENERIC_INST_OFF: u32 = 0x20; // -> generic inst table
pub const METADATA_REGISTRATION_ARRAY_OFF: u32 = 0x90; // -> Il2CppArrayType table

// startup-metadata.dat
//   v27 = sub_3941ED0("global-metadata.dat");
//   v28 = (void *)sub_3941ED0("startup-metadata.dat");
//   dword_8E5A590 = *(_DWORD *)(qword_8E5B110 + 4);
//   qword_8E5B120 = v27 + 0x208;
//   qword_8E5B128 = v28;
//   v29 = *(_DWORD *)(qword_8E5B100 + 0x80) - 0x1B4CAE90;// METADATA_REGISTRATION_COUNT
pub const METADATA_REGISTRATION_COUNT_OFF: u32 = 0x80; // discovery sanity gate / TypeInfoCount
pub const METADATA_REGISTRATION_COUNT_ADD: u32 = 0x1B4CAE90; // v29 = *(_DWORD *)(qword_8E5B100 + 0x80) - 0x1B4CAE90;// METADATA_REGISTRATION_COUNT

// method_start then method pointer
// v340 = (*(int *)(v337 + 8) ^ 0x1A7AF5FELL) + (unsigned __int16)v338;// method_start
// v341 = *(_QWORD *)(*(_QWORD *)(qword_8E5B0F8 + 0x88) + 8 * v340);// METHOD_POINTERS
pub const CODE_REGISTRATION_METHOD_POINTERS_OFF: u32 = 0x88; // -> method pointer table

pub const HDR_METHODS_SPAN_OFF: u32 = 0x1F8;
pub const HDR_METHODS_SPAN_XOR: u32 = 0x1608C2C8; // v45 = *(_DWORD *)(qword_8E5B118 + 0x1F8) ^ 0x1608C2C8;// HDR_METHODS_SPAN

#[derive(Debug, Clone)]
pub struct Il2CppGlobalMetadataHeader {
    pub payload_offset: u32,
    pub image_count: u32,
    pub assembly_count: u32,
    pub generic_classes_offset: u32,
    pub generic_classes_count: u32,
    pub generic_method_table_offset: u32,
    pub generic_method_table_count: u32,
    pub images_offset: u32,
    pub type_definitions_offset: u32,
    pub fields_offset: u32,
    pub field_offset_map_offset: u32,
    pub field_offset_group_offset: u32,
    pub field_offset_offset: u32,
    pub methods_offset: u32,
    pub invoker_indices_offset: u32,
    pub parameters_offset: u32,
    pub events_offset: u32,
    pub nested_types_offset: u32,
    pub interfaces_offset: u32,
    pub generic_containers_offset: u32,
    pub generic_parameters_offset: u32,
    pub string_offset: u32,
    pub usage_lists_offset: u32,
    pub usage_pairs_offset: u32,
    pub string_literal_offset: u32,
    pub string_literal_data_offset: u32,
    pub properties_offset: u32,
    pub method_specs_offset: u32,
    pub field_default_values_offset: u32,
    pub field_and_parameter_default_value_data_offset: u32,
}

pub fn decode_header(pe: &Pe, hdr: u32, payload_offset: u32) -> Result<Il2CppGlobalMetadataHeader> {
    let (image_count, assembly_count, images_offset) = image::head_block(pe, hdr)?;
    let (fields_offset, field_offset_map_offset, field_offset_group_offset, field_offset_offset) =
        field::head_block(pe, hdr)?;
    let (type_definitions_offset, nested_types_offset, interfaces_offset) =
        type_def::head_block(pe, hdr)?;
    let (
        generic_classes_offset,
        generic_classes_count,
        generic_containers_offset,
        generic_parameters_offset,
    ) = generic::head_block(pe, hdr)?;
    let (generic_method_table_offset, generic_method_table_count) =
        generic_table::head_block(pe, hdr)?;
    let (
        usage_lists_offset,
        usage_pairs_offset,
        string_literal_offset,
        string_literal_data_offset,
        method_specs_offset,
    ) = script_key::head_block(pe, hdr)?;
    let (field_default_values_offset, field_and_parameter_default_value_data_offset) =
        default_value::head_block(pe, hdr)?;
    Ok(Il2CppGlobalMetadataHeader {
        payload_offset,
        image_count,
        assembly_count,
        generic_classes_offset,
        generic_classes_count,
        generic_method_table_offset,
        generic_method_table_count,
        images_offset,
        type_definitions_offset,
        fields_offset,
        field_offset_map_offset,
        field_offset_group_offset,
        field_offset_offset,
        methods_offset: method::head_block(pe, hdr)?,
        invoker_indices_offset: invoker::head_block(pe, hdr)?,
        parameters_offset: param::head_block(pe, hdr)?,
        events_offset: event::head_block(pe, hdr)?,
        nested_types_offset,
        interfaces_offset,
        generic_containers_offset,
        generic_parameters_offset,
        string_offset: string::head_block(pe, hdr)?,
        properties_offset: property::head_block(pe, hdr)?,
        usage_lists_offset,
        usage_pairs_offset,
        string_literal_offset,
        string_literal_data_offset,
        method_specs_offset,
        field_default_values_offset,
        field_and_parameter_default_value_data_offset,
    })
}
