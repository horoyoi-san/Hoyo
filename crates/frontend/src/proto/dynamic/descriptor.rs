use super::utils;
use prost::Message;
use protobuf3::descriptor::{DescriptorProto, FieldDescriptorProto, field_descriptor_proto};
use std::{
    collections::HashMap,
    panic::{AssertUnwindSafe, catch_unwind},
    path::Path,
};

#[derive(Clone, Debug)]
pub struct DynamicDescriptor {
    pub messages: HashMap<String, MessageInfo>,
}

#[derive(Clone, Debug)]
pub struct MessageInfo {
    pub fields: HashMap<u32, FieldInfo>,
}

#[derive(Clone, Debug)]
pub struct FieldInfo {
    pub name: String,
    pub kind: i32,
    pub repeated: bool,
    pub type_name: String,
}

pub fn parse_descriptor(path: &Path) -> anyhow::Result<DynamicDescriptor> {
    catch_unwind(AssertUnwindSafe(|| parse_descriptor_inner(path))).map_err(|panic| {
        anyhow::anyhow!("protobuf parser panicked: {}", utils::panic_message(&panic))
    })?
}

fn parse_descriptor_inner(path: &Path) -> anyhow::Result<DynamicDescriptor> {
    let include = path
        .parent()
        .unwrap_or_else(|| Path::new("."))
        .to_path_buf();

    let parsed_prost = protox::compile([path], [include])
        .map_err(|e| anyhow::anyhow!("protox error:\n{e:?}"))?;

    let bytes = parsed_prost.encode_to_vec();

    use protobuf3::Message as Proto3Message;
    let parsed = protobuf3::descriptor::FileDescriptorSet::parse_from_bytes(&bytes)
        .map_err(|e| anyhow::anyhow!("protobuf3 parse error: {e}"))?;

    let mut descriptor = DynamicDescriptor {
        messages: HashMap::new(),
    };

    for file in parsed.file {
        let package = file.package().to_string();
        for message in &file.message_type {
            collect_message(&mut descriptor, &package, "", message);
        }
    }

    if descriptor.messages.is_empty() {
        anyhow::bail!("no message descriptors parsed");
    }

    Ok(descriptor)
}

fn collect_message(
    descriptor: &mut DynamicDescriptor,
    package: &str,
    parent: &str,
    message: &DescriptorProto,
) {
    let simple_name = message.name().to_string();
    let relative_name = if parent.is_empty() {
        simple_name.clone()
    } else {
        format!("{parent}.{simple_name}")
    };
    let full_name = if package.is_empty() {
        relative_name.clone()
    } else {
        format!("{package}.{relative_name}")
    };

    let mut fields = HashMap::new();
    for field in &message.field {
        fields.insert(field.number() as u32, FieldInfo::from(field));
    }

    let info = MessageInfo { fields };
    descriptor
        .messages
        .insert(simple_name.clone(), info.clone());
    descriptor
        .messages
        .insert(relative_name.clone(), info.clone());
    descriptor.messages.insert(full_name, info);

    for nested in &message.nested_type {
        collect_message(descriptor, package, &relative_name, nested);
    }
}

impl From<&FieldDescriptorProto> for FieldInfo {
    fn from(field: &FieldDescriptorProto) -> Self {
        Self {
            name: field.name().to_string(),
            kind: field.type_() as i32,
            repeated: field.label() == field_descriptor_proto::Label::LABEL_REPEATED,
            type_name: field.type_name().trim_start_matches('.').to_string(),
        }
    }
}

impl DynamicDescriptor {
    pub fn default_json(&self, message_name: &str) -> Option<serde_json::Value> {
        let message = self.messages.get(message_name)?;
        let mut map = serde_json::Map::new();

        let mut sorted_fields: Vec<_> = message.fields.iter().collect();
        sorted_fields.sort_by_key(|(id, _)| **id);

        for (_, field) in sorted_fields {
            let value = if field.repeated {
                serde_json::Value::Array(vec![])
            } else {
                match field.kind {
                    1 | 2 => serde_json::json!(0.0), // Double, Float
                    3 | 4 | 6 | 16 | 18 => serde_json::Value::String("0".to_string()), // 64-bit ints
                    5 | 7 | 13 | 15 | 17 => serde_json::json!(0), // 32-bit ints
                    8 => serde_json::Value::Bool(false),          // Bool
                    9 => serde_json::Value::String(String::new()), // String
                    12 => serde_json::Value::String(String::new()), // Bytes
                    14 => serde_json::json!(0),                   // Enum (usually first value is 0)
                    11 | 10 => {
                        // Message / Group
                        self.default_json(&field.type_name)
                            .unwrap_or(serde_json::Value::Object(serde_json::Map::new()))
                    }
                    _ => serde_json::Value::Null,
                }
            };
            map.insert(field.name.clone(), value);
        }

        Some(serde_json::Value::Object(map))
    }
}
