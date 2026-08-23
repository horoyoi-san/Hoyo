use std::collections::{HashMap, HashSet};

use rayon::prelude::*;
use serde::Serialize;

use crate::crypt::generic_table;
use crate::crypt::script as script_key;
use crate::error::Result;
use crate::metadata::Metadata;
use crate::pe::{read_i32, read_u16, read_u32, read_u64};
use crate::type_def::strip_generic_arity;

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
struct ScriptMethod {
    address: u64,
    name: String,
    signature: String,
    type_signature: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct ScriptString {
    address: u64,
    value: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct ScriptMetadata {
    address: u64,
    name: String,
    signature: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct ScriptMetadataMethod {
    address: u64,
    name: String,
    method_address: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
struct ScriptMethodInvoker {
    address: u64,
    name: String,
    signature: String,
}

#[derive(Serialize)]
#[serde(rename_all = "PascalCase")]
struct StringLiteral {
    value: String,
    address: String,
}

#[derive(Serialize)]
struct ScriptJson {
    #[serde(rename = "ScriptMethod")]
    script_method: Vec<ScriptMethod>,
    #[serde(rename = "ScriptString")]
    script_string: Vec<ScriptString>,
    #[serde(rename = "ScriptMetadata")]
    script_metadata: Vec<ScriptMetadata>,
    #[serde(rename = "ScriptMetadataMethod")]
    script_metadata_method: Vec<ScriptMetadataMethod>,
    #[serde(rename = "MethodInvokers")]
    method_invokers: Vec<ScriptMethodInvoker>,
    #[serde(rename = "Addresses")]
    addresses: Vec<u64>,
}

enum UsageEntry {
    Metadata(ScriptMetadata),
    MetadataMethod(ScriptMetadataMethod),
    String(ScriptString),
}

struct GenericSpec {
    def_index: usize,
    declaring_type_index: usize,
    class_inst: i32,
    method_inst: i32,
    type_name: String,
    method_name: String,
    rva: u64,
}

pub struct GenericMethodInstance {
    pub def_index: usize,
    pub spec_index: u32,
    pub declaring_type_index: usize,
    pub class_inst: i32,
    pub method_inst: i32,
    pub type_name: String,
    pub method_name: String,
    pub rva: u64,
}

pub fn build_script_json(metadata: &Metadata) -> Result<String> {
    let method_to_type = build_method_to_type(metadata)?;
    let registry = metadata.build_struct_registry()?;

    let type_work: Vec<usize> = metadata
        .images()
        .iter()
        .flat_map(|image| image.type_start..image.type_start + image.type_count)
        .collect();
    let mut script_method: Vec<ScriptMethod> = type_work
        .par_iter()
        .map(|&type_index| -> Result<Vec<ScriptMethod>> {
            let type_def = metadata.type_def(type_index)?;
            let Some(method_start) = type_def.method_start else {
                return Ok(Vec::new());
            };
            let type_name = metadata.type_def_full_name(type_index)?;
            let mut methods = Vec::new();
            for local in 0..type_def.method_count {
                let method = metadata.method(method_start + local)?;
                if method.rva == 0 {
                    continue;
                }
                let (signature, type_signature) =
                    metadata.method_signature(method_start + local, type_index, &registry)?;
                methods.push(ScriptMethod {
                    address: method.rva,
                    name: format!("{type_name}$${}", method.name),
                    signature,
                    type_signature,
                });
            }
            Ok(methods)
        })
        .collect::<Result<Vec<_>>>()?
        .into_iter()
        .flatten()
        .collect();

    let generic_instances = enumerate_generic_methods(metadata)?;
    let mut generic_method_rva: HashMap<u32, u64> = HashMap::new();
    let mut seen_generic: HashSet<u64> = HashSet::new();
    for instance in &generic_instances {
        generic_method_rva
            .entry(instance.spec_index)
            .or_insert(instance.rva);
        if seen_generic.insert(instance.rva) {
            let (mut signature, type_signature) = metadata
                .method_signature(instance.def_index, instance.declaring_type_index, &registry)
                .unwrap_or_default();
            if instance.is_method_generic()
                && let Some(prefix) = signature.strip_suffix("const MethodInfo* method);")
            {
                signature = format!("{prefix}const MethodInfo_{:X}* method);", instance.rva);
            }
            script_method.push(ScriptMethod {
                address: instance.rva,
                name: format!("{}$${}", instance.type_name, instance.method_name),
                signature,
                type_signature,
            });
        }
    }

    let (script_metadata, script_metadata_method, script_string) =
        build_usage_sections(metadata, &method_to_type, &generic_method_rva)?;

    let method_invokers = build_method_invokers(metadata, &type_work)?;

    let mut addresses: Vec<u64> = script_method.iter().map(|method| method.address).collect();
    addresses.sort_unstable();
    addresses.dedup();

    let out = ScriptJson {
        script_method,
        script_string,
        script_metadata,
        script_metadata_method,
        method_invokers,
        addresses,
    };
    serde_json::to_string_pretty(&out)
        .map_err(|error| format!("failed to serialize script.json: {error}").into())
}

pub fn build_string_literals(metadata: &Metadata) -> Result<String> {
    let method_to_type = build_method_to_type(metadata)?;
    let (_, _, script_string) = build_usage_sections(metadata, &method_to_type, &HashMap::new())?;
    let literals: Vec<StringLiteral> = script_string
        .into_iter()
        .map(|entry| StringLiteral {
            value: entry.value,
            address: format!("0x{:X}", entry.address),
        })
        .collect();
    serde_json::to_string_pretty(&literals)
        .map_err(|error| format!("failed to serialize stringLiterals.json: {error}").into())
}

fn build_method_invokers(
    metadata: &Metadata,
    type_work: &[usize],
) -> Result<Vec<ScriptMethodInvoker>> {
    let per_type: Vec<Vec<(u64, String)>> = type_work
        .par_iter()
        .map(|&type_index| -> Result<Vec<(u64, String)>> {
            let type_def = metadata.type_def(type_index)?;
            let Some(method_start) = type_def.method_start else {
                return Ok(Vec::new());
            };
            let mut out = Vec::new();
            for local in 0..type_def.method_count {
                let method_index = method_start + local;
                if metadata.method(method_index)?.rva == 0 {
                    continue;
                }
                let Some(address) = metadata.method_invoker_rva(method_index)? else {
                    continue;
                };
                out.push((address, metadata.invoker_name(method_index)?));
            }
            Ok(out)
        })
        .collect::<Result<Vec<_>>>()?;

    let mut seen: HashSet<u64> = HashSet::new();
    let mut invokers: Vec<ScriptMethodInvoker> = Vec::new();
    for (address, name) in per_type.into_iter().flatten() {
        if seen.insert(address) {
            let signature = format!(
                "void* {name}(Il2CppMethodPointer pointer, const MethodInfo* methodMetadata, void* obj, void** args);"
            );
            invokers.push(ScriptMethodInvoker {
                address,
                name,
                signature,
            });
        }
    }
    invokers.sort_by_key(|invoker| invoker.address);
    Ok(invokers)
}

#[allow(clippy::type_complexity)]
pub(crate) fn build_usage_sections(
    metadata: &Metadata,
    method_to_type: &[u32],
    generic_method_rva: &HashMap<u32, u64>,
) -> Result<(
    Vec<ScriptMetadata>,
    Vec<ScriptMetadataMethod>,
    Vec<ScriptString>,
)> {
    let pairs_count = usage_pairs_count(metadata)?;
    let payload = metadata.header.payload_offset as usize;
    let pairs_base = payload + metadata.header.usage_pairs_offset as usize;
    let method_specs_base = payload + metadata.header.method_specs_offset as usize;
    let method_count = method_to_type.len() as u32;

    let typeinfo_base = metadata.typeinfo_usage_base_rva as u64;
    let method_base = metadata.method_usage_base_rva as u64;
    let string_base = metadata.string_usage_base_rva as u64;

    let decoded: Vec<(u32, u32, u64)> = (0..pairs_count)
        .into_par_iter()
        .map(|pair_index| -> Result<(u32, u32, u64)> {
            let entry = pairs_base + pair_index as usize * 8;
            let low_raw = read_u32(&metadata.global_data, entry)?;
            let high_raw = read_u32(&metadata.global_data, entry + 4)?;
            let key = script_key::usage_pair_key(pair_index) as u32;
            let high = high_raw - key - script_key::PAIR_HIGH_SUB;
            let low = (low_raw ^ script_key::PAIR_LOW_XOR) - key;
            let kind = high >> script_key::PAIR_KIND_SHIFT;
            let source = high & script_key::PAIR_SOURCE_MASK;
            let base = match kind {
                1 => typeinfo_base,
                3 | 6 => method_base,
                5 => string_base,
                _ => 0,
            };
            Ok((kind, source, base + 8 * low as u64))
        })
        .collect::<Result<Vec<_>>>()?;

    let mut seen: HashSet<u64> = HashSet::new();
    let mut to_resolve: Vec<(u32, u32, u64)> = Vec::new();
    for (kind, source, address) in decoded {
        let keep = match kind {
            1 | 5 | 6 => seen.insert(address),
            3 => {
                source < method_count
                    && method_to_type[source as usize] != u32::MAX
                    && seen.insert(address)
            }
            _ => false,
        };
        if keep {
            to_resolve.push((kind, source, address));
        }
    }

    let resolved: Vec<Option<UsageEntry>> = to_resolve
        .par_iter()
        .map(|&(kind, source, address)| -> Result<Option<UsageEntry>> {
            Ok(match kind {
                1 => metadata.type_name(source, false).ok().map(|name| {
                    UsageEntry::Metadata(ScriptMetadata {
                        address,
                        name: format!("{name}_TypeInfo"),
                        signature: format!("{name}_c*"),
                    })
                }),
                3 => {
                    let type_index = method_to_type[source as usize] as usize;
                    match (
                        metadata.type_def_full_name(type_index),
                        metadata.method(source as usize),
                    ) {
                        (Ok(type_name), Ok(method)) => {
                            Some(UsageEntry::MetadataMethod(ScriptMetadataMethod {
                                address,
                                name: format!("Method${type_name}.{}()", method.name),
                                method_address: method.rva,
                            }))
                        }
                        _ => None,
                    }
                }
                5 => {
                    let value = metadata.decode_string_literal(source).unwrap_or_default();
                    (!value.is_empty())
                        .then_some(UsageEntry::String(ScriptString { address, value }))
                }
                _ => resolve_generic_spec(
                    metadata,
                    method_specs_base,
                    source,
                    method_count,
                    method_to_type,
                )?
                .map(|spec| {
                    UsageEntry::MetadataMethod(ScriptMetadataMethod {
                        address,
                        name: format!("Method${}.{}()", spec.type_name, spec.method_name),
                        method_address: generic_method_rva
                            .get(&source)
                            .copied()
                            .unwrap_or(spec.rva),
                    })
                }),
            })
        })
        .collect::<Result<Vec<_>>>()?;

    let mut script_metadata = Vec::new();
    let mut script_metadata_method = Vec::new();
    let mut script_string = Vec::new();
    for entry in resolved.into_iter().flatten() {
        match entry {
            UsageEntry::Metadata(m) => script_metadata.push(m),
            UsageEntry::MetadataMethod(m) => script_metadata_method.push(m),
            UsageEntry::String(s) => script_string.push(s),
        }
    }
    Ok((script_metadata, script_metadata_method, script_string))
}

impl GenericMethodInstance {
    pub fn is_method_generic(&self) -> bool {
        self.class_inst < 0 && self.method_inst >= 0
    }
}

pub(crate) fn enumerate_generic_methods(metadata: &Metadata) -> Result<Vec<GenericMethodInstance>> {
    let method_to_type = build_method_to_type(metadata)?;
    let method_count = method_to_type.len() as u32;
    let payload = metadata.header.payload_offset as usize;
    let method_specs_base = payload + metadata.header.method_specs_offset as usize;

    let table_base = payload + metadata.header.generic_method_table_offset as usize;
    let count = metadata.header.generic_method_table_count as usize;
    let primary = metadata.pe.pointer(
        metadata.code_registration_rva
            + generic_table::CODE_REGISTRATION_GENERIC_METHOD_POINTERS_OFF,
    )?;
    let secondary = metadata.pe.pointer(
        metadata.code_registration_rva + generic_table::CODE_REGISTRATION_SECONDARY_POINTERS_OFF,
    )?;

    let instances = (0..count)
        .into_par_iter()
        .map(|index| -> Result<Option<GenericMethodInstance>> {
            let entry = table_base + index * generic_table::ENTRY_SIZE;
            let Ok(spec_index) = read_u32(&metadata.global_data, entry) else {
                return Ok(None);
            };
            let method_index = read_u16(
                &metadata.global_data,
                entry + generic_table::METHOD_INDEX_OFF,
            )
            .unwrap_or(generic_table::SHARED_METHOD_INDEX);
            let fallback_index = read_i32(
                &metadata.global_data,
                entry + generic_table::FALLBACK_INDEX_OFF,
            )
            .unwrap_or(-1);
            let Some(spec) = resolve_generic_spec(
                metadata,
                method_specs_base,
                spec_index,
                method_count,
                &method_to_type,
            )?
            else {
                return Ok(None);
            };
            let va = if method_index != generic_table::SHARED_METHOD_INDEX {
                metadata.pe.rd64(primary + u32::from(method_index) * 8)
            } else if fallback_index >= 0 {
                metadata.pe.rd64(secondary + fallback_index as u32 * 8)
            } else {
                return Ok(None);
            };
            let Ok(va) = va else {
                return Ok(None);
            };
            if va <= metadata.image_base {
                return Ok(None);
            }
            Ok(Some(GenericMethodInstance {
                def_index: spec.def_index,
                spec_index,
                declaring_type_index: spec.declaring_type_index,
                class_inst: spec.class_inst,
                method_inst: spec.method_inst,
                type_name: spec.type_name,
                method_name: spec.method_name,
                rva: va - metadata.image_base,
            }))
        })
        .collect::<Result<Vec<_>>>()?
        .into_iter()
        .flatten()
        .collect();
    Ok(instances)
}

fn resolve_generic_spec(
    metadata: &Metadata,
    method_specs_base: usize,
    source: u32,
    method_count: u32,
    method_to_type: &[u32],
) -> Result<Option<GenericSpec>> {
    let spec = method_specs_base + source as usize * script_key::METHOD_SPEC_ENTRY_SIZE;
    let Ok(method_def_index) = read_u32(&metadata.global_data, spec) else {
        return Ok(None);
    };
    if method_def_index >= method_count || method_to_type[method_def_index as usize] == u32::MAX {
        return Ok(None);
    }
    let method_inst = read_i32(
        &metadata.global_data,
        spec + script_key::METHOD_SPEC_METHOD_INST_OFF,
    )
    .unwrap_or(-1);
    let class_inst = read_i32(
        &metadata.global_data,
        spec + script_key::METHOD_SPEC_CLASS_INST_OFF,
    )
    .unwrap_or(-1);

    let type_index = method_to_type[method_def_index as usize] as usize;
    let Ok(mut type_name) = metadata.type_def_full_name(type_index) else {
        return Ok(None);
    };
    if class_inst >= 0
        && let Ok(args) = metadata.generic_inst_args(class_inst as u32, false)
    {
        type_name = format!("{}<{}>", strip_generic_arity(&type_name), args.join(","));
    }
    let Ok(method) = metadata.method(method_def_index as usize) else {
        return Ok(None);
    };
    let mut method_name = method.name.clone();
    if method_inst >= 0
        && let Ok(args) = metadata.generic_inst_args(method_inst as u32, false)
    {
        method_name = format!("{method_name}<{}>", args.join(","));
    }
    Ok(Some(GenericSpec {
        def_index: method_def_index as usize,
        declaring_type_index: type_index,
        class_inst,
        method_inst,
        type_name,
        method_name,
        rva: method.rva,
    }))
}

pub fn collect_generic_instantiations(
    metadata: &Metadata,
) -> Result<HashMap<usize, Vec<(u64, String)>>> {
    let mut map: HashMap<usize, Vec<(u64, String)>> = HashMap::new();
    for instance in enumerate_generic_methods(metadata)? {
        map.entry(instance.def_index).or_default().push((
            instance.rva,
            format!("{}.{}", instance.type_name, instance.method_name),
        ));
    }
    for instantiations in map.values_mut() {
        instantiations.sort();
        instantiations.dedup();
    }
    Ok(map)
}

pub(crate) fn build_method_to_type(metadata: &Metadata) -> Result<Vec<u32>> {
    let mut method_to_type: Vec<u32> = Vec::new();
    for image in metadata.images() {
        for type_index in image.type_start..image.type_start + image.type_count {
            let type_def = metadata.type_def(type_index)?;
            let Some(method_start) = type_def.method_start else {
                continue;
            };
            let end = method_start + type_def.method_count;
            if end > method_to_type.len() {
                method_to_type.resize(end, u32::MAX);
            }
            method_to_type[method_start..end].fill(type_index as u32);
        }
    }
    Ok(method_to_type)
}

fn usage_pairs_count(metadata: &Metadata) -> Result<u32> {
    let payload = metadata.header.payload_offset as usize;
    let lists_base = payload + metadata.header.usage_lists_offset as usize;
    let lists_span = metadata.header.usage_pairs_offset - metadata.header.usage_lists_offset;
    if lists_span < 8 || !lists_span.is_multiple_of(4) {
        return Err(format!("implausible usage-lists span 0x{lists_span:X}").into());
    }
    let lists_count = lists_span / 4 - 1;

    let block_start = |i: u32| -> Result<u32> {
        let raw = read_u32(&metadata.global_data, lists_base + i as usize * 4)?;
        Ok(raw + script_key::usage_list_key(i) - script_key::LIST_BIAS)
    };

    let start0 = block_start(0)?;
    if start0 != 0 {
        return Err(format!(
            "usage-lists sanity check failed: block 0 starts at {start0}, expected 0"
        )
        .into());
    }
    let mut prev = 0u32;
    for i in 1..=lists_count {
        let start = block_start(i)?;
        if start < prev {
            return Err(format!(
                "usage-lists table is not monotonic at block {i} ({start} < {prev})"
            )
            .into());
        }
        prev = start;
    }
    Ok(prev)
}

impl Metadata {
    pub(crate) fn decode_string_literal(&self, literal_index: u32) -> Result<String> {
        let table = self.header.payload_offset as usize
            + self.header.string_literal_offset as usize
            + literal_index as usize * 4;
        let off_i =
            read_u32(&self.global_data, table)? - script_key::string_literal_key(literal_index);
        let off_next = read_u32(&self.global_data, table + 4)?
            - script_key::string_literal_key(literal_index + 1);
        let length = (off_next - off_i) as usize;
        if length == 0 {
            return Ok(String::new());
        }
        if length > 0x10000 {
            return Err(format!(
                "string literal {literal_index} decoded an implausible length {length}"
            )
            .into());
        }

        let base =
            (self.header.string_literal_data_offset - script_key::LIT_DATA_BASE_SUB) as i32 as i64;
        let off = (off_i + script_key::LIT_OFF_BIAS) as i32 as i64;
        let data_offset = i64::from(self.header.payload_offset) + base + off;
        let data_offset = usize::try_from(data_offset).map_err(|_| {
            format!(
                "string literal {literal_index} resolved a negative payload offset {data_offset}"
            )
        })?;
        let qword_count = length.div_ceil(8);
        let mut keystream = ((script_key::LIT_SEED_MUL * literal_index as u64)
            ^ script_key::LIT_SEED_XOR)
            + script_key::LIT_SEED_ADD;
        let mut out = Vec::with_capacity(qword_count * 8);
        for chunk_index in 0..qword_count {
            let encrypted = read_u64(&self.global_data, data_offset + chunk_index * 8)?;
            out.extend_from_slice(&(encrypted ^ keystream).to_le_bytes());
            keystream += script_key::LIT_PAYLOAD_INCREMENT;
        }
        out.truncate(length);
        Ok(String::from_utf8_lossy(&out).into_owned())
    }
}
