use super::{MessageMinimalInfo, cache::TypeCache};

use crate::proto::{NumberType, RETCODE_FIELD_NAME, cache::CachedType, nt};
use convert_case::{Case, Casing as _};
use il2cpp::vm::{metadata_cache, object::Il2CppObject, string::Il2CppString, value::Il2CppValue};
use indexmap::IndexMap;
use reflection::runtime_type::RuntimeType;
use std::{borrow::Cow, cell::RefCell, collections::HashMap, io::Write, rc::Rc, sync::atomic::Ordering};

pub type TypeToItemMap = IndexMap<RuntimeType, Rc<RefCell<ProtoItem>>>;

#[derive(Debug, PartialEq, Eq)]
pub enum MessageType {
    None,
    Req,
    Rsp,
    Notify,
}

#[derive(Debug)]
pub struct Message {
    pub cmd_id: u16,
    pub name: String,
    pub deobfuscated_name: Option<String>,
    pub fields: Vec<Field>,
    pub oneofs: Vec<OneOf>,
    pub children: Vec<Rc<RefCell<ProtoItem>>>,
    pub has_parent: bool,
    pub msg_type: MessageType,
    pub write_to_rva: usize,
    pub merge_from_rva: usize,
}
#[derive(Debug)]

pub struct Enum {
    pub name: String,
    pub deobfuscated_name: Option<String>,
    pub variants: Vec<(String, i32)>,
    pub has_parent: bool,
}
#[derive(Debug)]
pub struct Field {
    pub kind: String,
    pub name: String,
    pub number: u32,
    pub offset: u32,
}

#[derive(Debug)]

pub struct OneOf {
    pub name: String,
    pub fields: Vec<Field>,
}

#[derive(Debug)]
pub enum ProtoItem {
    Message(Message),
    Enum(Enum),
}

impl Message {
    pub fn fmt_protobuf_with_depth(&self, nested_depth: usize) -> String {
        let mut result = String::new();

        let indent = "\t".repeat(nested_depth);

        if self.deobfuscated_name.is_some() {
            result.push_str(&format!("// Obf: {}\n", self.name));
        }

        if self.msg_type != MessageType::None {
            result.push_str(&format!("// Type: {:#?}\n", self.msg_type));
        }

        if self.cmd_id != 0 {
            result.push_str(&format!("// CmdID: {}\n", self.cmd_id));
        }

        if self.merge_from_rva != 0 || self.write_to_rva != 0 {
            result.push_str(&format!(
                "// WriteTo: 0x{:X} | MergeFrom: 0x{:X}\n",
                self.write_to_rva, self.merge_from_rva
            ));
        }

        result.push_str(&format!(
            "{}message {} {{",
            indent,
            if let Some(deobf_name) = &self.deobfuscated_name {
                short_name(deobf_name)
            } else {
                short_name(&self.name)
            }
        ));
        result.push('\n');

        for nested in &self.children {
            if let ProtoItem::Enum(en) = &*nested.borrow()
                && self
                    .oneofs
                    .iter()
                    .any(|v| v.fields.len() == en.variants.len() - 1)
            {
                continue; // Skip enum for oneof
            }

            result.push_str(&nested.borrow().fmt_protobuf_with_depth(nested_depth + 1));
        }

        for field in &self.fields {
            let field_display_name = if field.name == *RETCODE_FIELD_NAME {
                "retcode".to_string()
            } else {
                snake_field(&field.name)
            };

            result.push_str(&format!(
                "{}\t{} {} = {}; // offset: {}\n",
                indent,
                remove_namespace(&field.kind),
                field_display_name,
                field.number,
                field.offset
            ));
        }

        for oneof in &self.oneofs {
            result.push_str(&format!(
                "{}\toneof {} {{\n",
                indent,
                snake_field(oneof.name.strip_suffix("Case").unwrap_or(&oneof.name))
            ));

            for field in &oneof.fields {
                let field_display_name = if field.name == *RETCODE_FIELD_NAME {
                    "retcode".to_string()
                } else {
                    snake_field(&field.name)
                };

                if field.offset != 0 {
                    result.push_str(&format!(
                        "{}\t\t{} {} = {}; // offset: {}\n",
                        indent,
                        remove_namespace(&field.kind),
                        field_display_name,
                        field.number,
                        field.offset
                    ));
                } else {
                    result.push_str(&format!(
                        "{}\t\t{} {} = {};\n",
                        indent,
                        remove_namespace(&field.kind),
                        field_display_name,
                        field.number
                    ));
                }
            }
            result.push_str(&format!("{indent}\t}}\n"));
        }

        result.push_str(&format!("{indent}}}\n"));

        result
    }
}

impl Enum {
    pub fn fmt_protobuf_with_depth(&self, nested_depth: usize) -> String {
        let mut result = String::new();

        let indent = "\t".repeat(nested_depth);

        if self.deobfuscated_name.is_some() {
            result.push_str(&format!("// Obf: {}\n", self.name));
        }

        result.push_str(&format!(
            "{}enum {} {{",
            indent,
            if let Some(deobf_name) = self.deobfuscated_name.as_ref() {
                short_name(deobf_name)
            } else {
                short_name(&self.name)
            }
        ));
        result.push('\n');

        for (name, discriminant) in &self.variants {
            result.push_str(&format!("{indent}\t{name} = {discriminant};"));
            result.push('\n');
        }

        result.push_str(&format!("{indent}}}\n"));
        result
    }
}

impl ProtoItem {
    pub fn fmt_protobuf_with_depth(&self, nested_depth: usize) -> String {
        match self {
            ProtoItem::Message(message) => message.fmt_protobuf_with_depth(nested_depth),
            ProtoItem::Enum(enumeration) => enumeration.fmt_protobuf_with_depth(nested_depth),
        }
    }
}

pub fn short_name(full_name: &str) -> &str {
    full_name.rsplit('.').next().unwrap_or(full_name)
}

pub fn snake_field(input: &str) -> String {
    let is_all_upper = input
        .chars()
        .all(|c| c.is_uppercase() || !c.is_alphabetic());
    if input.len() == 11 && is_all_upper {
        input.to_string()
    } else {
        input.to_case(Case::Snake)
    }
}

pub fn remove_namespace(s: &str) -> String {
    let parts: Vec<&str> = s.split('.').collect();

    if parts.len() > 1 {
        parts[1..].join(".")
    } else {
        s.to_string()
    }
}

pub fn remove_repeated_map(s: &str) -> String {
    if s.starts_with("repeated ") {
        s.strip_prefix("repeated ").unwrap()
    } else if s.starts_with("map<") {
        let comma_pos = s.find(',').unwrap();
        let end_pos = s.rfind('>').unwrap();
        s[comma_pos + 1..end_pos].trim()
    } else {
        s
    }
    .to_string()
}

fn process_cmd_id(
    map: &mut IndexMap<RuntimeType, Rc<RefCell<ProtoItem>>>,
    rsp_notify_map: &HashMap<String, u16>,
    req_map: &HashMap<String, (u16, Option<String>)>,
    method_nt_map: &HashMap<String, String>,
) -> (HashMap<i32, String>, HashMap<String, String>) {
    let array = map.values_mut().collect::<Vec<_>>();

    let mut message_usages: HashMap<String, u32> = HashMap::with_capacity(array.len());
    let mut cmd_ids: HashMap<i32, String> = HashMap::new();
    let mut nt_map: HashMap<String, String> = nt::get_rsp_notify_names();
    for (obf_name, deobf_name) in method_nt_map {
        nt_map.insert(obf_name.clone(), deobf_name.clone());
    }

    for proto_message in &array {
        match &mut *proto_message.borrow_mut() {
            ProtoItem::Message(message) => {
                for field in &message.fields {
                    for item in remove_repeated_map(&field.kind).split('.') {
                        *message_usages.entry(remove_repeated_map(item)).or_default() += 1;
                    }
                }

                for oneof in &message.oneofs {
                    for field in &oneof.fields {
                        for item in remove_repeated_map(&field.kind).split('.') {
                            *message_usages.entry(remove_repeated_map(item)).or_default() += 1;
                        }
                    }
                }
            }
            ProtoItem::Enum(enumeration) => {
                for (name, discriminant) in &enumeration.variants {
                    if !name.starts_with("Cmd") {
                        continue;
                    }

                    let name_pascal = name.strip_suffix("None").unwrap_or(name);
                    if name.ends_with("None") {
                        enumeration.name = name_pascal.to_string();
                    }

                    cmd_ids.insert(
                        *discriminant,
                        name_pascal
                            .strip_prefix("Cmd")
                            .unwrap_or(name_pascal)
                            .to_string(),
                    );
                }
            }
        }
    }

    for i in 0..array.len() {
        let proto_message = &array[i];
        let mut current_cmd_name: Option<String> = None;

        if let ProtoItem::Message(message) = &mut *proto_message.borrow_mut() {
            if let Some(deobf_name) = method_nt_map.get(short_name(&message.name)) {
                message.deobfuscated_name = Some(deobf_name.to_string());
            }

            for field in &mut message.fields {
                let name = remove_repeated_map(&field.kind);

                if let Some(nt_name) = nt_map.get(&name).or_else(|| nt_map.get(short_name(&name))) {
                    field.kind = field.kind.replace(&name, nt_name);
                }

                if let Some(nted) = method_nt_map
                    .get(&name)
                    .or_else(|| method_nt_map.get(short_name(&name)))
                {
                    field.kind = field.kind.replace(&name, nted);
                }
            }

            for oneof in &mut message.oneofs {
                for field in &mut oneof.fields {
                    let name = remove_repeated_map(&field.kind);

                    if let Some(nt_name) =
                        nt_map.get(&name).or_else(|| nt_map.get(short_name(&name)))
                    {
                        field.kind = field.kind.replace(&name, nt_name);
                    }
                }
            }

            if let Some((cmd_id, deobf_name)) = req_map.get(&message.name) {
                message.cmd_id = *cmd_id;
                message.msg_type = MessageType::Req;
                if let Some(deobf) = deobf_name {
                    message.deobfuscated_name = Some(deobf.clone());
                    nt_map.insert(message.name.clone(), deobf.clone());
                }
                cmd_ids.insert(message.cmd_id as i32, message.name.clone());
                continue;
            }

            if let Some(cmd_id) = rsp_notify_map.get(&message.name) {
                message.cmd_id = *cmd_id;
                message.msg_type = if message.fields.iter().any(|field| {
                    let name = snake_field(&field.name);
                    name == *RETCODE_FIELD_NAME || name == "retcode"
                }) {
                    MessageType::Rsp
                } else {
                    MessageType::Notify
                };
                cmd_ids.insert(message.cmd_id as i32, message.name.clone());

                if let Some(deobf) = nt_map
                    .get(&message.name)
                    .or_else(|| nt_map.get(short_name(&message.name)))
                {
                    message.deobfuscated_name = Some(deobf.to_string());
                    if message.msg_type == MessageType::Rsp {
                        current_cmd_name = Some(deobf.to_string());
                    }
                } else if message.msg_type == MessageType::Rsp {
                    for j in (0..i).rev() {
                        let previous_proto = &array[j];
                        let ProtoItem::Message(prev_message) = &mut *previous_proto.borrow_mut()
                        else {
                            continue;
                        };

                        if prev_message.msg_type == MessageType::Req {
                            if let Some(req_name) = prev_message.deobfuscated_name.as_ref() {
                                let rsp_name = req_name
                                    .as_str()
                                    .strip_suffix("CsReq")
                                    .map(|s| format!("{s}ScRsp"))
                                    .or_else(|| {
                                        req_name
                                            .as_str()
                                            .strip_suffix("Req")
                                            .map(|s| format!("{s}Rsp"))
                                    })
                                    .unwrap_or_else(|| req_name.clone());

                                nt_map.insert(message.name.to_string(), rsp_name.to_string());
                                message.deobfuscated_name = Some(rsp_name);
                            }
                            break;
                        }

                        if prev_message.msg_type == MessageType::Rsp {
                            break;
                        }
                    }
                } else {
                    continue;
                }
            }
        } else if let ProtoItem::Enum(en) = &mut *proto_message.borrow_mut()
            && let Some(deobf_name) = method_nt_map
                .get(&en.name)
                .or_else(|| method_nt_map.get(short_name(&en.name)))
        {
            en.deobfuscated_name = Some(deobf_name.to_string());
            nt_map.insert(en.name.to_string(), deobf_name.to_string());
        }

        if let Some(cmd_name) = current_cmd_name {
            for j in (0..i).rev() {
                let previous_proto = &array[j];

                let ProtoItem::Message(prev_message) = &mut *previous_proto.borrow_mut() else {
                    continue;
                };

                if prev_message.msg_type != MessageType::Req {
                    continue;
                }

                if let Some(deobf_name) = prev_message.deobfuscated_name.as_ref() {
                    nt_map.insert(prev_message.name.clone(), deobf_name.clone());
                    break;
                }

                if !message_usages.contains_key(&prev_message.name) {
                    let req_name = cmd_name
                        .as_str()
                        .strip_suffix("ScRsp")
                        .map(|s| format!("{s}CsReq"))
                        .or_else(|| {
                            cmd_name
                                .as_str()
                                .strip_suffix("Rsp")
                                .map(|s| format!("{s}CsReq"))
                        })
                        .unwrap_or_else(|| cmd_name.clone());

                    nt_map.insert(prev_message.name.to_string(), req_name.to_string());
                    prev_message.deobfuscated_name = Some(req_name);
                    break;
                }
            }
        }
    }

    (cmd_ids, nt_map)
}

fn csharp_type_to_protobuf_type(
    cache: &TypeCache,
    ty: &RuntimeType,
    number_type: NumberType,
) -> Cow<'static, str> {
    if let Some(ty) = cache.type_map.get(ty) {
        use CachedType::*;
        match ty {
            Boolean => Cow::Borrowed("bool"),
            Int32 => match number_type {
                NumberType::Normal => Cow::Borrowed("sfixed32"),
                NumberType::ZigZagVarint => Cow::Borrowed("sint32"),
                _ => Cow::Borrowed("int32"),
            },
            Int64 => match number_type {
                NumberType::Normal => Cow::Borrowed("sfixed64"),
                NumberType::ZigZagVarint => Cow::Borrowed("sint64"),
                _ => Cow::Borrowed("int64"),
            },
            UInt32 => {
                if let NumberType::Normal = number_type {
                    Cow::Borrowed("fixed32")
                } else {
                    Cow::Borrowed("uint32")
                }
            }
            UInt64 => {
                if let NumberType::Normal = number_type {
                    Cow::Borrowed("fixed64")
                } else {
                    Cow::Borrowed("uint64")
                }
            }
            Single => Cow::Borrowed("float"),
            Double => Cow::Borrowed("double"),
            String => Cow::Borrowed("string"),
            ByteString => Cow::Borrowed("bytes"),
            Any => Cow::Borrowed("google.protobuf.Any"),
            _ => unreachable!(),
        }
    } else {
        let generics = ty.get_generic_arguments();
        match generics.len() {
            1 => Cow::Owned(format!(
                "repeated {}",
                csharp_type_to_protobuf_type(cache, &generics[0], number_type)
            )),
            2 => Cow::Owned(format!(
                "map<{}, {}>",
                csharp_type_to_protobuf_type(cache, &generics[0], number_type),
                csharp_type_to_protobuf_type(cache, &generics[1], number_type)
            )),
            _ => ty.format_type_name(true).into(),
        }
    }
}

pub fn generate_protobuf<W: Write>(
    type_cache: &TypeCache,
    minimal_info_map: &HashMap<RuntimeType, MessageMinimalInfo>,
    rsp_notify_map: &HashMap<RuntimeType, u16>,
    req_map: &HashMap<RuntimeType, (u16, Option<String>)>,
    method_nt_map: &HashMap<String, String>,
    predeobf_map: &HashMap<String, String>,
    mut out: W,
) -> (HashMap<i32, String>, HashMap<String, String>, TypeToItemMap) {
    let mut type_to_item: TypeToItemMap = IndexMap::new();

    for i in il2cpp::RPG_NETWORK_PROTO_START.load(Ordering::Relaxed)..il2cpp::RPG_NETWORK_PROTO_END.load(Ordering::Relaxed) {
        let class = metadata_cache::get_typeinfo_from_typedefindex(i);
        let runtime_type = RuntimeType::from_class(class).unwrap();
        let type_name = runtime_type.get_name().unwrap().as_str();
        if type_name == "<Module>" {
            continue;
        }

        // log::debug!("[Proto Dumper] generating proto {type_name}", );

        let field_names = super::util::map_field_names_from_property(runtime_type);

        let parent_type = runtime_type.get_declaring_type().unwrap();
        let parent_type = (!parent_type.is_null()).then_some(parent_type);

        let is_nested = parent_type.is_some();

        let proto_item = if let Some(message_info) = minimal_info_map.get(&runtime_type) {
            let mut fields = Vec::<(i32, Field)>::with_capacity(message_info.fields.len());

            for field_info in message_info
                .fields
                .iter()
                .filter(|f| f.oneof_extra_data.is_none())
            {
                if let Some(property) = field_info.property {
                    fields.push((
                        property.get_metadata_token(),
                        Field {
                            kind: csharp_type_to_protobuf_type(
                                type_cache,
                                &property.get_property_type().unwrap(),
                                field_info.number_type,
                            )
                            .to_string(),
                            name: property.get_name().unwrap().as_str().to_string(),
                            number: field_info.tag >> 3,
                            offset: field_info.offset,
                        },
                    ));
                } else {
                    let f = runtime_type.get_fields(62);
                    let field = f
                        .iter()
                        .find(|f| f.is_instance() && f.get_offset() as u32 == field_info.offset)
                        .unwrap();

                    fields.push((
                        field.get_metadata_token(),
                        Field {
                            kind: csharp_type_to_protobuf_type(
                                type_cache,
                                &field.get_field_type().unwrap(),
                                field_info.number_type,
                            )
                            .to_string(),
                            name: field_names.get(&field.get_offset()).unwrap().to_string(),
                            number: field_info.tag >> 3,
                            offset: field_info.offset,
                        },
                    ));
                }
            }

            fields.sort_by_key(|(_, f)| f.number);
            let mut oneofs = Vec::<OneOf>::new();

            for field_info in message_info
                .fields
                .iter()
                .filter(|f| f.oneof_extra_data.is_some())
            {
                if let Some(oneof_variant) = field_info.property {
                    let oneof_item = field_info
                        .oneof_extra_data
                        .as_ref()
                        .unwrap()
                        .property
                        .unwrap();

                    let oneof = if let Some(oneof) = oneofs
                        .iter_mut()
                        .find(|o| o.name == oneof_item.get_name().unwrap().as_str())
                    {
                        oneof
                    } else {
                        oneofs.push(OneOf {
                            name: oneof_item.get_name().unwrap().as_str().to_string(),
                            fields: Vec::new(),
                        });
                        oneofs.last_mut().unwrap()
                    };

                    oneof.fields.push(Field {
                        kind: csharp_type_to_protobuf_type(
                            type_cache,
                            &oneof_variant.get_property_type().unwrap(),
                            field_info.number_type,
                        )
                        .to_string(),
                        name: oneof_variant.get_name().unwrap().as_str().to_string(),
                        number: field_info.tag >> 3,
                        offset: field_info.offset,
                    });
                } else {
                    let fields = runtime_type.get_fields(62);
                    let oneof_variant = field_info.oneof_extra_data.as_ref().unwrap();
                    let oneof_enum_field = fields
                        .iter()
                        .find(|f| {
                            f.is_instance()
                                && f.get_offset() as u32 == oneof_variant.oneof_enum_offset
                        })
                        .unwrap();
                    let oneof_enum = oneof_enum_field.get_field_type().unwrap();
                    let f = oneof_enum.get_fields(62);
                    let oneof_case_enum_field = f
                        .iter()
                        .find(|f| {
                            !f.is_instance()
                                && f.get_value(Il2CppObject::NULL).unwrap().unbox::<i32>() as u32
                                    == (field_info.tag >> 3)
                        })
                        .unwrap();

                    let oneof = if let Some(oneof) = oneofs.iter_mut().find(|o| {
                        o.name == *field_names.get(&oneof_enum_field.get_offset()).unwrap()
                    }) {
                        oneof
                    } else {
                        oneofs.push(OneOf {
                            name: field_names
                                .get(&oneof_enum_field.get_offset())
                                .unwrap()
                                .to_string(),
                            fields: Vec::new(),
                        });
                        oneofs.last_mut().unwrap()
                    };

                    oneof.fields.push(Field {
                        kind: csharp_type_to_protobuf_type(
                            type_cache,
                            &oneof_variant.variant_type,
                            field_info.number_type,
                        )
                        .to_string(),
                        name: oneof_case_enum_field
                            .get_name()
                            .unwrap()
                            .as_str()
                            .to_string(),
                        number: field_info.tag >> 3,
                        offset: field_info.offset,
                    });
                }
            }

            ProtoItem::Message(Message {
                name: type_name.to_string(),
                cmd_id: 0,
                fields: fields.into_iter().map(|f| f.1).collect(),
                oneofs,
                children: Vec::new(),
                has_parent: is_nested,
                deobfuscated_name: None,
                msg_type: MessageType::None,
                write_to_rva: message_info.write_to_rva,
                merge_from_rva: message_info.merge_from_rva,
            })
        } else if matches!(
            type_cache
                .type_map
                .get(&runtime_type.get_base_type().unwrap()),
            Some(&CachedType::Enum)
        ) {
            ProtoItem::Enum(Enum {
                variants: runtime_type
                    .get_fields(24)
                    .iter()
                    .map(|f| {
                        let attr = f.get_custom_attributes();
                        let name = if let Some(attr) = attr.first() {
                            let attr_type = RuntimeType::from_object(*attr).unwrap();
                            let fields = attr_type.get_fields(62);
                            let name = fields
                                .iter()
                                .find(|v| v.get_name().unwrap().as_str().contains("Name"))
                                .unwrap();

                            Il2CppString(name.get_value(*attr).unwrap().0)
                                .as_str()
                                .to_string()
                        } else {
                            format!("{}_{}", type_name, f.get_name().unwrap().as_str())
                        };
                        (
                            name,
                            f.get_value(Il2CppObject::NULL).unwrap().unbox::<i32>(),
                        )
                    })
                    .collect(),
                name: runtime_type.format_type_name(true),
                deobfuscated_name: None,
                has_parent: is_nested,
            })
        } else {
            if type_name.starts_with('<') {
                continue;
            }

            ProtoItem::Message(Message {
                name: type_name.to_string(),
                cmd_id: 0,
                fields: Vec::new(),
                oneofs: Vec::new(),
                children: Vec::new(),
                has_parent: is_nested,
                deobfuscated_name: None,
                msg_type: MessageType::None,
                write_to_rva: 0,
                merge_from_rva: 0,
            })
        };

        let proto_item = Rc::new(RefCell::new(proto_item));

        type_to_item.insert(runtime_type, proto_item.clone());

        if is_nested && let Some(parent_rt) = parent_type {
            if let Some(rc_cell) = type_to_item.get(&parent_rt) {
                let mut parent_ref = rc_cell.borrow_mut();

                if let ProtoItem::Message(parent_message) = &mut *parent_ref {
                    parent_message.children.push(proto_item);
                } else {
                    log::debug!(
                        "Parent type {} is not a message for {}",
                        parent_rt.get_name().unwrap().as_str(),
                        type_name
                    );
                }
            } else {
                log::debug!(
                    "Parent type {} not found for {}",
                    parent_rt.get_name().unwrap().as_str(),
                    type_name
                );
            }
        }
    }

    let (cmd_ids, nt_map) = process_cmd_id(
        &mut type_to_item,
        &rsp_notify_map
            .iter()
            .map(|(c, cmd_id)| (c.get_name().unwrap().as_str().to_string(), *cmd_id))
            .collect::<HashMap<_, _>>(),
        &req_map
            .iter()
            .map(|(c, (cmd_id, deobf))| {
                (
                    c.get_name().unwrap().as_str().to_string(),
                    (*cmd_id, deobf.clone()),
                )
            })
            .collect::<HashMap<_, _>>(),
        method_nt_map,
    );

    apply_global_field_map(&mut type_to_item, predeobf_map);

    writeln!(
        out,
        "syntax = \"proto3\"; // AstralOS Native Engine | Game Version: {}\n",
        *crate::version::GAME_VERSION
    )
    .unwrap();

    for proto in type_to_item.values() {
        let proto = proto.borrow();
        match &*proto {
            ProtoItem::Message(msg) => {
                if msg.has_parent {
                    continue;
                }
            }
            ProtoItem::Enum(en) => {
                if en.has_parent {
                    continue;
                }
            }
        }
        writeln!(out, "{}", proto.fmt_protobuf_with_depth(0)).unwrap();
    }

    (cmd_ids, nt_map, type_to_item)
}

pub fn apply_global_field_map(type_to_item: &mut TypeToItemMap, map: &HashMap<String, String>) {
    if map.is_empty() {
        return;
    }

    for item in type_to_item.values_mut() {
        let mut item_mut = item.borrow_mut();
        if let ProtoItem::Message(msg) = &mut *item_mut {
            for field in &mut msg.fields {
                if let Some(deobf) = map.get(&field.name) {
                    field.name = deobf.clone();
                }
            }
        }
    }
}
