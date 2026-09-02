use std::{
    borrow::Cow,
    collections::HashMap,
    io::{self, Write},
    sync::{LazyLock, atomic::Ordering},
};

use cache::{CachedType, TypeCache};
use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic};
use il2cpp::{
    CLASS_TABLE_VEC, get_cached_class,
    vm::{metadata_cache, value::Il2CppValue},
};
use reflection::{property_info::PropertyInfo, runtime_type::RuntimeType};
use utils::game_assembly_slice;

mod cache;
pub mod handler_nt;
mod logic_nt;
mod merge_from;
mod method_nt;
mod nt;
mod output;
mod proto_asm_parser;
mod proto_stream;
pub mod util;
mod write_to;

static IL2CPP_OBJECT_NEW_API_RVA: LazyLock<usize> = LazyLock::new(|| unsafe {
    let api_ptr_addr = (*il2cpp::API_BASE_PTR) + 8 * 130;
    let api_addr = *((*il2cpp::UP_BASE + api_ptr_addr) as *const usize);
    api_addr - *il2cpp::GA_BASE
});

static IL2CPP_OBJECT_NEW_RVA: LazyLock<usize> = LazyLock::new(|| {
    let api_rva = *IL2CPP_OBJECT_NEW_API_RVA;
    let slice = game_assembly_slice();
    let mut decoder = Decoder::with_ip(
        64,
        &slice[api_rva..api_rva + 0x80],
        (*il2cpp::GA_BASE + api_rva) as u64,
        DecoderOptions::NONE,
    );
    let mut instruction = Instruction::default();
    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);
        if instruction.mnemonic() == Mnemonic::Call {
            let real_rva = (instruction.near_branch_target() as usize) - *il2cpp::GA_BASE;
            log::debug!("[Proto Dumper] Il2CppObject::New => 0x{real_rva:X}");
            return real_rva;
        }
        if instruction.mnemonic() == Mnemonic::Ret || instruction.mnemonic() == Mnemonic::Int3 {
            break;
        }
    }
    log::debug!("[Proto Dumper] failed to find il2cpp_object_new rva, using api rva");
    api_rva
});

static XLUA_REGISTER_OBJECT_RVA: LazyLock<usize> = LazyLock::new(|| {
    let raw_class_name = &*XLUA_OBJECT_TRANSLATOR_STATIC_FIELDS_CLASS;
    if raw_class_name.is_empty() {
        return 0;
    }
    let class_name = raw_class_name
        .split('<')
        .next()
        .unwrap()
        .trim_end_matches('.');
    let xlua_object_translator_class = match get_cached_class(class_name) {
        Some(c) => c,
        None => return 0,
    };
    let static_class_type = match RuntimeType::from_class(xlua_object_translator_class) {
        Ok(rt) => rt,
        Err(_) => return 0,
    };
    let delegate_name = &*XLUA_OBJECT_TRANSLATOR_DELEGATE;

    let methods = static_class_type.get_methods_il2cpp();
    if let Some(next) = methods
        .iter()
        .position(|method| {
            let params = method.get_parameters();
            params.len() == 1
                && params[0]
                    .get_parameter_type()
                    .map(|t| t.il_name() == *delegate_name)
                    .unwrap_or(false)
        })
        .and_then(|idx| methods.get(idx + 1))
    {
        let va = next.get_il2cpp_method().va();
        let rva = va.saturating_sub(*il2cpp::GA_BASE);
        log::debug!("[Proto Dumper] XLua::RegisterObject => 0x{rva:X}");
        return rva;
    }

    log::warn!("[Proto Dumper] failed to find XLua::RegisterObject via method index");
    0
});

static RETCODE_FIELD_NAME: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    if let Some(cls) = get_cached_class("RPG.Client.LittleGame.CakeRace.CakeRaceBaseRspMessage<T>") {
        if let Ok(cake_race_type) = RuntimeType::from_class(cls) {
            if let Ok(base_type) = cake_race_type.get_base_type() {
                let properties = base_type.get_properties(62);
                if let Some(property) = properties.first() {
                    if let Ok(name) = property.get_name() {
                        let name_str = name.as_str().to_string();
                        log::debug!("[Proto Dumper] retcode => {name_str}");
                        return Cow::Owned(name_str);
                    }
                }
            }
        }
    }
    log::debug!("[Proto Dumper] fallback retcode => Retcode");
    Cow::Borrowed("Retcode")
});

pub static NETWORK_MANAGER_SEND_NAME: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let classes_to_try = [
        "RPG.Client.CycleScoreService",
        "RPG.Client.NetworkManager",
        "RPG.Client.ClientNetworkManager",
    ];
    for class_name in classes_to_try {
        if let Some(cls) = get_cached_class(class_name) {
            if let Ok(rt) = RuntimeType::from_class(cls) {
                if let Ok(the_class) = rt.get_base_type() {
                    for method in the_class.get_methods_il2cpp() {
                        if method.get_is_generic_method().map(|b| b.unbox()).unwrap_or(false) {
                            let params = method.get_parameters();
                            if params.len() == 3 {
                                if let Some(m_method) = crate::script::METADATA_METHODS
                                    .get()
                                    .and_then(|m| m.get(&the_class.get_metadata_token()))
                                    .and_then(|m| m.get(&method.get_metadata_token()))
                                    .and_then(|m| m.first())
                                {
                                    if let Ok(method_name) = m_method.get_name() {
                                        let name_str = method_name.as_str().to_string();
                                        log::debug!("[Proto Dumper] NetworkManager::Send => {name_str}");
                                        return Cow::Owned(name_str);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    log::warn!("[Proto Dumper] failed to get NetworkManager::Send name");
    Cow::Borrowed("")
});

pub static NETWORK_MANAGER_SEND_VA: LazyLock<usize> = LazyLock::new(|| {
    let classes_to_try = [
        "RPG.Client.CycleScoreService",
        "RPG.Client.NetworkManager",
        "RPG.Client.ClientNetworkManager",
    ];
    for class_name in classes_to_try {
        if let Some(cls) = get_cached_class(class_name) {
            if let Ok(rt) = RuntimeType::from_class(cls) {
                if let Ok(the_class) = rt.get_base_type() {
                    for method in the_class.get_methods_il2cpp() {
                        if method.get_is_generic_method().map(|b| b.unbox()).unwrap_or(false) {
                            let params = method.get_parameters();
                            if params.len() == 3 {
                                if let Some(m_method) = crate::script::METADATA_METHODS
                                    .get()
                                    .and_then(|m| m.get(&the_class.get_metadata_token()))
                                    .and_then(|m| m.get(&method.get_metadata_token()))
                                    .and_then(|m| m.first())
                                {
                                    let va = m_method.get_il2cpp_method().va();
                                    log::debug!(
                                        "[Proto Dumper] NetworkManager::Send2 => 0x{:X}",
                                        va.saturating_sub(*il2cpp::GA_BASE)
                                    );
                                    return va;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    log::warn!("[Proto Dumper] failed to get NetworkManager::Send2");
    0
});

pub static FIGHT_GAME_SEND: LazyLock<usize> = LazyLock::new(|| {
    if let Some(cls) = get_cached_class("RPG.Client.GlobalVars") {
        if let Ok(rt) = RuntimeType::from_class(cls) {
            if let Ok(multiplayer_manager) = rt.get_field("s_MultiplayerManager".into(), 62) {
                if !multiplayer_manager.is_null() {
                    if let Ok(multiplayer_manager_type) = multiplayer_manager.get_field_type() {
                        for method in multiplayer_manager_type.get_methods_il2cpp() {
                            let params = method.get_parameters();
                            if params.len() == 3
                                && params
                                    .get(1)
                                    .and_then(|p| p.get_parameter_type().ok())
                                    .map(|t| t.il_name() == "System.UInt16")
                                    .unwrap_or(false)
                            {
                                let va = method.get_il2cpp_method().va();
                                if let Ok(method_name) = method.get_name() {
                                    let name_str = method_name.as_str();
                                    log::debug!("[Proto Dumper] FightGame::Send => {name_str}");
                                }
                                return va;
                            }
                        }
                    }
                }
            }
        }
    }

    log::warn!("[Proto Dumper] failed to get FightGame::Send");
    0
});

static XLUA_OBJECT_TRANSLATOR_DELEGATE: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let static_class_name = &*XLUA_OBJECT_TRANSLATOR_STATIC_FIELDS_CLASS;
    if !static_class_name.is_empty() {
        if let Some(cls) = get_cached_class(static_class_name) {
            if let Ok(rt) = RuntimeType::from_class(cls) {
                let fields = rt.get_fields(62);
                for f in fields {
                    if let Ok(name) = f.get_name() {
                        let name_str = name.as_str();
                        if name_str.contains("__Send") && name_str.contains("CsReq") {
                            if let Ok(f_type) = f.get_field_type() {
                                let del_name = f_type.il_name();
                                log::debug!("[Proto Dumper] Dynamically found XLUA_OBJECT_TRANSLATOR_DELEGATE => {del_name}");
                                return del_name;
                            }
                        }
                    }
                }
            }
        }
    }

    let method_class_name = &*XLUA_OBJECT_TRANSLATOR_METHOD_CLASS;
    if !method_class_name.is_empty() {
        if let Some(obj_translator_method_class) = get_cached_class(method_class_name) {
            if let Some(classes) = CLASS_TABLE_VEC.get() {
                if let Some(obj_translator_method_idx) =
                    classes.iter().position(|&v| v == obj_translator_method_class)
                {
                    if obj_translator_method_idx > 0 {
                        let the_class = metadata_cache::get_typeinfo_from_typedefindex(
                            (obj_translator_method_idx - 1) as u32,
                        );
                        let the_class_name = the_class.byval_arg().il_name();
                        log::debug!(
                            "[Proto Dumper] XLUA_OBJECT_TRANSLATOR_DELEGATE (fallback) => {the_class_name}"
                        );
                        return the_class_name;
                    }
                }
            }
        }
    }

    log::warn!("[Proto Dumper] failed to find XLUA_OBJECT_TRANSLATOR_DELEGATE");
    Cow::Borrowed("")
});

static XLUA_OBJECT_TRANSLATOR_METHOD_CLASS: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let static_class_name = &*XLUA_OBJECT_TRANSLATOR_STATIC_FIELDS_CLASS;
    if !static_class_name.is_empty() {
        if let Some(obj_translator_static_class) = get_cached_class(static_class_name) {
            if let Some(classes) = CLASS_TABLE_VEC.get() {
                if let Some(obj_translator_static_idx) =
                    classes.iter().position(|&v| v == obj_translator_static_class)
                {
                    if obj_translator_static_idx > 0 {
                        let the_class = metadata_cache::get_typeinfo_from_typedefindex(
                            (obj_translator_static_idx - 1) as u32,
                        );
                        let the_class_name = the_class.byval_arg().il_name();
                        log::debug!(
                            "[Proto Dumper] XLUA_OBJECT_TRANSLATOR_METHOD_CLASS => {the_class_name}"
                        );
                        return the_class_name;
                    }
                }
            }
        }
    }

    log::warn!("[Proto Dumper] failed to find XLUA_OBJECT_TRANSLATOR_METHOD_CLASS");
    Cow::Borrowed("")
});

static XLUA_OBJECT_TRANSLATOR_STATIC_FIELDS_CLASS: LazyLock<Cow<'static, str>> = LazyLock::new(
    || {
        // 1. Dynamic scan across all classes for static fields with __Send and CsReq
        if let Some(classes) = CLASS_TABLE_VEC.get() {
            for &class in classes {
                if let Ok(rt) = RuntimeType::from_class(class) {
                    let fields = rt.get_fields(62);
                    let has_send_csreq = fields.iter().any(|f| {
                        if let Ok(name) = f.get_name() {
                            let name_str = name.as_str();
                            name_str.contains("__Send") && name_str.contains("CsReq")
                        } else {
                            false
                        }
                    });
                    if has_send_csreq {
                        let name = class.byval_arg().il_name();
                        log::debug!(
                            "[Proto Dumper] Dynamically found XLUA_OBJECT_TRANSLATOR_STATIC_FIELDS_CLASS => {name}"
                        );
                        return name;
                    }
                }
            }
        }

        // 2. Legacy fallback
        if let Some(gen_13_wrap_class) = get_cached_class("XLua.CSObjectWrap.Gen_13_Wrap") {
            if let Some(classes) = CLASS_TABLE_VEC.get() {
                if let Some(gen_13_wrap_idx) = classes.iter().position(|&v| v == gen_13_wrap_class) {
                    if gen_13_wrap_idx > 0 {
                        let the_class = metadata_cache::get_typeinfo_from_typedefindex(
                            (gen_13_wrap_idx - 1) as u32,
                        );
                        let the_class_name = the_class.byval_arg().il_name();
                        log::debug!(
                            "[Proto Dumper] XLUA_OBJECT_TRANSLATOR_STATIC_FIELDS_CLASS (legacy) => {the_class_name}"
                        );
                        return the_class_name;
                    }
                }
            }
        }

        log::warn!("[Proto Dumper] failed to find XLUA_OBJECT_TRANSLATOR_STATIC_FIELDS_CLASS");
        Cow::Borrowed("")
    },
);

const CODED_INPUT_STREAM: &str = "Google.Protobuf.CodedInputStream";
const MERGE_FROM: &str = "MergeFrom";
const CODED_OUTPUT_STREAM: &str = "Google.Protobuf.CodedOutputStream";
const WRITE_TO: &str = "WriteTo";
const UNKNOWN_FIELD_SET: &str = "Google.Protobuf.UnknownFieldSet";
const BYTE_STRING: &str = "Google.Protobuf.ByteString";
const PROTOBUF_ANY: &str = "MiHoYo.SDK.Protobuf.WellKnownTypes.Any";
const GET_COUNT_PROPERTY: &str = "Count";

pub struct MessageMinimalInfo {
    #[allow(unused)]
    pub cmd_id: u16,
    pub fields: Vec<FieldMinimalInfo>,
    pub write_to_rva: usize,
    pub merge_from_rva: usize,
}

impl MessageMinimalInfo {
    pub fn new(cmd_id: u16) -> Self {
        Self {
            cmd_id,
            fields: Vec::new(),
            write_to_rva: 0,
            merge_from_rva: 0,
        }
    }
}

pub struct FieldMinimalInfo {
    pub tag: u32,
    #[allow(unused)]
    pub xor: u32,
    pub offset: u32,
    pub oneof_extra_data: Option<OneofVariantInfo>,
    pub number_type: NumberType,
    pub property: Option<PropertyInfo>,
}

#[derive(Clone, Copy)]
pub enum NumberType {
    None,
    Varint,
    Normal,
    #[allow(unused)]
    ZigZagVarint,
}

pub struct OneofVariantInfo {
    pub oneof_enum_offset: u32,
    pub variant_type: RuntimeType,
    pub property: Option<PropertyInfo>,
}

#[allow(dead_code)]
pub enum ProtoDumpMode {
    ClassFieldNumber,
    MergeFrom,
    WriteTo,
    Asm,
}

#[allow(unused)]
pub fn dump<W: Write>(
    out: &mut W,
    cmdid_out: &mut W,
    dump_mode: ProtoDumpMode,
    enable_logging: bool,
) -> io::Result<()> {
    let type_cache = TypeCache::init();
    proto_stream::init();

    log::debug!("[Proto Dumper] dumping minimal proto infos...");

    let mut minimal_info_map = HashMap::<RuntimeType, MessageMinimalInfo>::new();
    let mut rsp_notify_map = nt::get_rsp_notify_map();
    let mut req_map = HashMap::<RuntimeType, (u16, Option<String>)>::new();

    for i in il2cpp::RPG_NETWORK_PROTO_START.load(Ordering::Relaxed)..il2cpp::RPG_NETWORK_PROTO_END.load(Ordering::Relaxed) {
        let proto_class = metadata_cache::get_typeinfo_from_typedefindex(i);
        let proto_type = RuntimeType::from_class(proto_class).unwrap();

        let Some(merge_from) = proto_type.find_method_il2cpp(MERGE_FROM) else {
            continue;
        };

        let proto_name = proto_type.il_name();

        if enable_logging {
            log::debug!("[Proto Dumper] Generating minimal info for proto {proto_name}");
        }

        let cmd_id = 0;
        let mut message_info = MessageMinimalInfo::new(cmd_id);
        let write_to_method = match proto_type.find_method_il2cpp(WRITE_TO) {
            Some(m) => m.get_il2cpp_method(),
            None => {
                log::warn!("[Proto Dumper] Missing WriteTo for {proto_name}");
                continue;
            }
        };
        message_info.merge_from_rva = match proto_type.find_method_il2cpp(MERGE_FROM) {
            Some(m) => m.get_il2cpp_method().rva(),
            None => {
                log::warn!("[Proto Dumper] Missing MergeFrom for {proto_name}");
                continue;
            }
        };
        message_info.write_to_rva = write_to_method.rva();

        match dump_mode {
            ProtoDumpMode::ClassFieldNumber => {
                util::generate_minimal_info_from_constants(
                    proto_type,
                    &mut message_info,
                    &type_cache,
                );
            }
            ProtoDumpMode::Asm => {
                // Asm example
                proto_asm_parser::dump_from_write_to_asm(&proto_name, &mut message_info);
            }
            ProtoDumpMode::MergeFrom => {
                let proto_instance = proto_class.create_instance();
                if let Some(ctor) = proto_type.find_method_il2cpp(".ctor") {
                    let _ = ctor.get_il2cpp_method().invoke::<usize>(proto_instance, &[]);
                }
                merge_from::dump_merge_from(
                    proto_type,
                    proto_instance,
                    &mut message_info,
                    &type_cache,
                );
            }
            ProtoDumpMode::WriteTo => {
                let ctor_method = proto_type
                    .find_method_il2cpp(".ctor")
                    .map(|m| m.get_il2cpp_method())
                    .unwrap_or(write_to_method);

                write_to::dump_writeto(
                    enable_logging,
                    i,
                    proto_type,
                    ctor_method,
                    write_to_method,
                    &mut message_info,
                );
            }
        }

        minimal_info_map.insert(proto_type, message_info);
    }

    log::debug!("[Proto Dumper] generating nt...");

    let req_rvas = nt::get_req_map(&minimal_info_map, &rsp_notify_map, &mut req_map);
    let req_named_count = req_map.values().filter(|(_, name)| name.is_some()).count();
    log::debug!(
        "[Proto Dumper] req nt: req={}, nt={}",
        req_map.len(),
        req_named_count
    );

    let rsp_notify_names = nt::get_rsp_notify_names();
    let (method_handler_map, method_nt_map) = method_nt::get_method_nt_map();

    let (cmd_ids, proto_name_map, type_to_item) = output::generate_protobuf(
        &type_cache,
        &minimal_info_map,
        &rsp_notify_map,
        &req_map,
        &method_nt_map,
        &HashMap::new(),
        std::io::sink(),
    );

    let mut req_rsp_enum_nt = proto_name_map.clone();

    let cs_type_infos = {
        let mut result_map: HashMap<String, Vec<String>> = HashMap::new();
        let mut table_entries: Vec<(String, String, usize)> = Vec::new();

        for (rt, req_rvas) in &req_rvas {
            let valid_rvas: Vec<String> = req_rvas
                .iter()
                .filter(|rva| *rva != "0x0")
                .cloned()
                .collect();

            if valid_rvas.is_empty() {
                continue;
            }

            let formatted_name = rt.format_type_name(true);
            let obf_name = rt.il_name().into_owned();
            let deobf_name = proto_name_map
                .get(&formatted_name)
                .cloned()
                .unwrap_or_else(|| formatted_name.clone());
            result_map.insert(deobf_name.clone(), valid_rvas.clone());

            for rva_str in &valid_rvas {
                if let Ok(rva) = usize::from_str_radix(rva_str.trim_start_matches("0x"), 16) {
                    table_entries.push((obf_name.clone(), deobf_name.clone(), rva));
                }
            }
        }

        let _ = crate::proto::handler_nt::CS_HANDLER_TABLE.set(table_entries);

        result_map
    };

    let sc_packet_handlers = {
        let mut method_map: HashMap<RuntimeType, Vec<String>> = HashMap::new();
        let mut proto_param_map: HashMap<RuntimeType, Vec<String>> = HashMap::new();
        let rsp_notify_method_rvas = nt::get_rsp_notify_method_rvas();

        for i in 0..il2cpp::MAX_TYPEDEFINDEX.load(Ordering::Relaxed) {
            if let Ok(runtime_type) =
                RuntimeType::from_class(metadata_cache::get_typeinfo_from_typedefindex(i))
            {
                for method in runtime_type.get_methods_il2cpp() {
                    let args = method.get_parameters();
                    for arg in args {
                        if let Ok(arg_type) = arg.get_parameter_type()
                            && arg_type != runtime_type
                        {
                            let rva = method.get_il2cpp_method().rva();
                            if rva != 0 {
                                method_map
                                    .entry(arg_type)
                                    .or_default()
                                    .push(format!("0x{rva:X}"));

                                if let Ok(arg_name) = arg.get_name()
                                    && arg_name.as_str() == "proto"
                                {
                                    proto_param_map
                                        .entry(arg_type)
                                        .or_default()
                                        .push(format!("0x{rva:X}"));
                                }
                            }
                        }
                    }
                }
            }
        }

        let mut result_map: HashMap<String, Vec<String>> = HashMap::new();
        for rt in rsp_notify_map.keys() {
            if let Some(handlers) = method_map.get(rt) {
                let formatted_name = rt.format_type_name(true);
                let key = rsp_notify_names
                    .get(&formatted_name)
                    .cloned()
                    .unwrap_or_else(|| rt.il_name().into_owned());

                result_map.insert(key, handlers.clone());
            }
        }
        for (formatted_name, cmd_rvas) in rsp_notify_method_rvas {
            for cmd_rva in cmd_rvas {
                if cmd_rva != "0x0" {
                    let key = rsp_notify_names
                        .get(&formatted_name)
                        .cloned()
                        .unwrap_or(formatted_name.clone());

                    result_map.entry(key).or_default().push(cmd_rva);
                }
            }
        }

        for (rt, handlers) in proto_param_map {
            let il_name = rt.il_name();
            if il_name.len() == 11 && il_name.chars().all(|c| c.is_ascii_uppercase()) {
                let formatted_name = rt.format_type_name(true);
                let key = rsp_notify_names
                    .get(&formatted_name)
                    .cloned()
                    .unwrap_or_else(|| il_name.into_owned());

                result_map.entry(key).or_default().extend(handlers);
            }
        }

        for (key, handlers) in method_handler_map {
            result_map.entry(key).or_default().extend(handlers);
        }

        result_map
    };

    let mut proto_field_map = method_nt::dump_global_field_map();
    for (k, v) in handler_nt::get_handler_nt_map(&type_to_item) {
        proto_field_map.entry(k).or_insert(v);
    }

    let logic_field_map = proto_field_map.clone();

    logic_nt::run_logic_nt(
        &type_to_item.values().cloned().collect::<Vec<_>>(),
        &proto_name_map,
        &logic_field_map,
    );

    let _ = std::fs::create_dir_all("./DUMP/Memory_Live");
    let _ = std::fs::write(
        "./DUMP/Memory_Live/cs-type-infos.json",
        serde_json::to_string_pretty(&cs_type_infos).unwrap(),
    );

    let _ = std::fs::write(
        "./DUMP/Memory_Live/sc-packet-handlers.json",
        serde_json::to_string_pretty(&sc_packet_handlers).unwrap(),
    );

    log::debug!("[Proto Dumper] generating protobuf...");

    let (cmd_ids_final, nt_map_final, type_to_item) = output::generate_protobuf(
        &type_cache,
        &minimal_info_map,
        &rsp_notify_map,
        &req_map,
        &method_nt_map,
        &proto_field_map,
        out,
    );

    for (obf_name, deobf_name) in nt_map_final {
        req_rsp_enum_nt
            .entry(obf_name)
            .or_insert_with(|| deobf_name);
    }

    writeln!(cmdid_out, "{}", serde_json::to_string_pretty(&cmd_ids)?)?;

    log::debug!("[Proto Dumper] Protos dumped!");

    Ok(())
}
