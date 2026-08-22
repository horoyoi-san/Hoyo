use super::{
    descriptor::{DynamicDescriptor, FieldInfo, MessageInfo},
    utils,
};
use protobuf3::descriptor::field_descriptor_proto;

impl DynamicDescriptor {
    pub fn encode(&self, name: &str, json: &str) -> anyhow::Result<Vec<u8>> {
        let info = self
            .messages
            .get(name)
            .or_else(|| self.messages.get(&format!("Proto.{name}")))
            .ok_or_else(|| anyhow::anyhow!("message not found: {name}"))?;
        let value: serde_json::Value = serde_json::from_str(json)?;
        self.encode_message(info, &value)
    }

    pub fn encode_message(
        &self,
        info: &MessageInfo,
        value: &serde_json::Value,
    ) -> anyhow::Result<Vec<u8>> {
        let mut bytes = Vec::new();
        let Some(object) = value.as_object() else {
            return Ok(bytes);
        };

        for (field_name, field_val) in object {
            let Some((number, field)) = info.fields.iter().find(|(_, f)| f.name == *field_name)
            else {
                continue;
            };

            if field.repeated {
                if let Some(arr) = field_val.as_array() {
                    if should_encode_packed(field) {
                        encode_packed_field(*number, field, arr, &mut bytes)?;
                    } else {
                        for item in arr {
                            self.encode_field(*number, field, item, &mut bytes)?;
                        }
                    }
                }
            } else {
                self.encode_field(*number, field, field_val, &mut bytes)?;
            }
        }
        Ok(bytes)
    }

    fn encode_field(
        &self,
        number: u32,
        field: &FieldInfo,
        value: &serde_json::Value,
        bytes: &mut Vec<u8>,
    ) -> anyhow::Result<()> {
        use field_descriptor_proto::Type::*;
        match field.kind {
            x if x == TYPE_INT32 as i32
                || x == TYPE_INT64 as i32
                || x == TYPE_UINT32 as i32
                || x == TYPE_UINT64 as i32
                || x == TYPE_BOOL as i32
                || x == TYPE_ENUM as i32 =>
            {
                let val = json_u64(value);
                utils::write_varint(bytes, (number << 3) as u64);
                utils::write_varint(bytes, val);
            }
            x if x == TYPE_SINT32 as i32 => {
                let val = json_i64(value) as i32;
                let z = ((val << 1) ^ (val >> 31)) as u32;
                utils::write_varint(bytes, (number << 3) as u64);
                utils::write_varint(bytes, z as u64);
            }
            x if x == TYPE_SINT64 as i32 => {
                let val = json_i64(value);
                let z = ((val << 1) ^ (val >> 63)) as u64;
                utils::write_varint(bytes, (number << 3) as u64);
                utils::write_varint(bytes, z);
            }
            x if x == TYPE_STRING as i32 => {
                let val = value.as_str().unwrap_or("");
                utils::write_varint(bytes, ((number << 3) | 2) as u64);
                utils::write_varint(bytes, val.len() as u64);
                bytes.extend_from_slice(val.as_bytes());
            }
            x if x == TYPE_MESSAGE as i32 => {
                if let Some(nested) = self.messages.get(&field.type_name) {
                    let encoded = self.encode_message(nested, value)?;
                    utils::write_varint(bytes, ((number << 3) | 2) as u64);
                    utils::write_varint(bytes, encoded.len() as u64);
                    bytes.extend_from_slice(&encoded);
                }
            }
            x if x == TYPE_BYTES as i32 => {
                let val = value.as_str().unwrap_or("");
                let data = utils::base64_decode(val);
                utils::write_varint(bytes, ((number << 3) | 2) as u64);
                utils::write_varint(bytes, data.len() as u64);
                bytes.extend_from_slice(&data);
            }
            x if x == TYPE_DOUBLE as i32 => {
                let val = json_f64(value);
                utils::write_varint(bytes, ((number << 3) | 1) as u64);
                bytes.extend_from_slice(&val.to_bits().to_le_bytes());
            }
            x if x == TYPE_FLOAT as i32 => {
                let val = json_f64(value) as f32;
                utils::write_varint(bytes, ((number << 3) | 5) as u64);
                bytes.extend_from_slice(&val.to_bits().to_le_bytes());
            }
            x if x == TYPE_FIXED32 as i32 || x == TYPE_SFIXED32 as i32 => {
                let val = json_u64(value) as u32;
                utils::write_varint(bytes, ((number << 3) | 5) as u64);
                bytes.extend_from_slice(&val.to_le_bytes());
            }
            x if x == TYPE_FIXED64 as i32 || x == TYPE_SFIXED64 as i32 => {
                let val = json_u64(value);
                utils::write_varint(bytes, ((number << 3) | 1) as u64);
                bytes.extend_from_slice(&val.to_le_bytes());
            }
            _ => {}
        }
        Ok(())
    }
}

fn should_encode_packed(field: &FieldInfo) -> bool {
    use field_descriptor_proto::Type::*;
    field.repeated
        && !matches!(
            field.kind,
            x if x == TYPE_STRING as i32
                || x == TYPE_MESSAGE as i32
                || x == TYPE_GROUP as i32
                || x == TYPE_BYTES as i32
        )
}

fn encode_packed_field(
    number: u32,
    field: &FieldInfo,
    values: &[serde_json::Value],
    bytes: &mut Vec<u8>,
) -> anyhow::Result<()> {
    let mut packed = Vec::new();
    for value in values {
        encode_packed_item(field, value, &mut packed)?;
    }
    if !packed.is_empty() {
        utils::write_varint(bytes, ((number << 3) | 2) as u64);
        utils::write_varint(bytes, packed.len() as u64);
        bytes.extend_from_slice(&packed);
    }
    Ok(())
}

fn encode_packed_item(
    field: &FieldInfo,
    value: &serde_json::Value,
    bytes: &mut Vec<u8>,
) -> anyhow::Result<()> {
    if let Some(values) = value.as_array() {
        for value in values {
            encode_packed_item(field, value, bytes)?;
        }
        return Ok(());
    }

    use field_descriptor_proto::Type::*;
    match field.kind {
        x if x == TYPE_INT32 as i32
            || x == TYPE_INT64 as i32
            || x == TYPE_UINT32 as i32
            || x == TYPE_UINT64 as i32
            || x == TYPE_BOOL as i32
            || x == TYPE_ENUM as i32 =>
        {
            utils::write_varint(bytes, json_u64(value));
        }
        x if x == TYPE_SINT32 as i32 => {
            let val = json_i64(value) as i32;
            let z = ((val << 1) ^ (val >> 31)) as u32;
            utils::write_varint(bytes, z as u64);
        }
        x if x == TYPE_SINT64 as i32 => {
            let val = json_i64(value);
            let z = ((val << 1) ^ (val >> 63)) as u64;
            utils::write_varint(bytes, z);
        }
        x if x == TYPE_DOUBLE as i32 => {
            bytes.extend_from_slice(&json_f64(value).to_bits().to_le_bytes());
        }
        x if x == TYPE_FLOAT as i32 => {
            bytes.extend_from_slice(&(json_f64(value) as f32).to_bits().to_le_bytes());
        }
        x if x == TYPE_FIXED32 as i32 || x == TYPE_SFIXED32 as i32 => {
            bytes.extend_from_slice(&(json_u64(value) as u32).to_le_bytes());
        }
        x if x == TYPE_FIXED64 as i32 || x == TYPE_SFIXED64 as i32 => {
            bytes.extend_from_slice(&json_u64(value).to_le_bytes());
        }
        _ => anyhow::bail!("unsupported packed protobuf field type: {}", field.kind),
    }
    Ok(())
}

fn json_u64(value: &serde_json::Value) -> u64 {
    value
        .as_bool()
        .map(u64::from)
        .or_else(|| value.as_u64())
        .or_else(|| value.as_i64().map(|value| value as u64))
        .or_else(|| {
            value.as_str().and_then(|value| {
                value
                    .parse::<u64>()
                    .ok()
                    .or_else(|| value.parse::<i64>().ok().map(|value| value as u64))
            })
        })
        .unwrap_or(0)
}

fn json_i64(value: &serde_json::Value) -> i64 {
    value
        .as_i64()
        .or_else(|| value.as_u64().map(|value| value as i64))
        .or_else(|| {
            value.as_str().and_then(|value| {
                value
                    .parse::<i64>()
                    .ok()
                    .or_else(|| value.parse::<u64>().ok().map(|value| value as i64))
            })
        })
        .unwrap_or(0)
}

fn json_f64(value: &serde_json::Value) -> f64 {
    value
        .as_f64()
        .or_else(|| value.as_str().and_then(|value| value.parse::<f64>().ok()))
        .unwrap_or(0.0)
}
