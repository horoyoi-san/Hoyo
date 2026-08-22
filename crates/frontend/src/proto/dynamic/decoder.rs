use super::{
    descriptor::{DynamicDescriptor, FieldInfo, MessageInfo},
    utils,
};
use protobuf3::descriptor::field_descriptor_proto;

impl DynamicDescriptor {
    pub fn decode(&self, name: &str, body: &[u8]) -> anyhow::Result<String> {
        let info = self
            .messages
            .get(name)
            .or_else(|| self.messages.get(&format!("Proto.{name}")))
            .ok_or_else(|| anyhow::anyhow!("message not found: {name}"))?;
        let value = self.decode_message(info, body)?;
        Ok(serde_json::to_string_pretty(&value)?)
    }

    pub fn decode_message(
        &self,
        info: &MessageInfo,
        bytes: &[u8],
    ) -> anyhow::Result<serde_json::Value> {
        let mut cursor = 0usize;
        let mut object = serde_json::Map::new();

        while cursor < bytes.len() {
            let key = utils::read_varint(bytes, &mut cursor)?;
            let number = (key >> 3) as u32;
            let wire = (key & 0x07) as u8;
            let field = info.fields.get(&number);
            let field_name = field.map_or_else(|| format!("_field_{number}"), |field| field.name.clone());
            let value = self.decode_value(field, wire, bytes, &mut cursor)?;
            insert_json_field(
                &mut object,
                field_name,
                value,
                field.is_some_and(|f| f.repeated),
            );
        }

        Ok(serde_json::Value::Object(object))
    }

    fn decode_value(
        &self,
        field: Option<&FieldInfo>,
        wire: u8,
        bytes: &[u8],
        cursor: &mut usize,
    ) -> anyhow::Result<serde_json::Value> {
        let Some(field) = field else {
            return decode_unknown(wire, bytes, cursor);
        };

        use field_descriptor_proto::Type::*;
        if wire == 2
            && field.repeated
            && !matches!(
                field.kind,
                x if x == TYPE_STRING as i32 || x == TYPE_MESSAGE as i32 || x == TYPE_GROUP as i32 || x == TYPE_BYTES as i32
            )
        {
            return decode_packed(field, bytes, cursor);
        }

        Ok(match field.kind {
            x if x == TYPE_DOUBLE as i32 => {
                serde_json::json!(f64::from_bits(utils::read_fixed64(bytes, cursor)?))
            }
            x if x == TYPE_FLOAT as i32 => {
                serde_json::json!(f32::from_bits(utils::read_fixed32(bytes, cursor)?))
            }
            x if x == TYPE_INT64 as i32 => {
                serde_json::json!((utils::read_varint(bytes, cursor)? as i64).to_string())
            }
            x if x == TYPE_UINT64 as i32 => {
                serde_json::json!(utils::read_varint(bytes, cursor)?.to_string())
            }
            x if x == TYPE_INT32 as i32 => {
                serde_json::json!(utils::read_varint(bytes, cursor)? as i32)
            }
            x if x == TYPE_FIXED64 as i32 => {
                serde_json::json!(utils::read_fixed64(bytes, cursor)?.to_string())
            }
            x if x == TYPE_FIXED32 as i32 => serde_json::json!(utils::read_fixed32(bytes, cursor)?),
            x if x == TYPE_BOOL as i32 => {
                serde_json::json!(utils::read_varint(bytes, cursor)? != 0)
            }
            x if x == TYPE_STRING as i32 => {
                let data = utils::read_len(bytes, cursor)?;
                serde_json::json!(String::from_utf8_lossy(data).to_string())
            }
            x if x == TYPE_MESSAGE as i32 || x == TYPE_GROUP as i32 => {
                let data = utils::read_len(bytes, cursor)?;
                if let Some(nested) = self.messages.get(&field.type_name) {
                    self.decode_message(nested, data)?
                } else {
                    serde_json::json!({ "_type": field.type_name, "_bytes": utils::base64_encode(data) })
                }
            }
            x if x == TYPE_BYTES as i32 => {
                serde_json::json!(utils::base64_encode(utils::read_len(bytes, cursor)?))
            }
            x if x == TYPE_UINT32 as i32 => {
                serde_json::json!(utils::read_varint(bytes, cursor)? as u32)
            }
            x if x == TYPE_ENUM as i32 => {
                serde_json::json!(utils::read_varint(bytes, cursor)? as i32)
            }
            x if x == TYPE_SFIXED32 as i32 => {
                serde_json::json!(utils::read_fixed32(bytes, cursor)? as i32)
            }
            x if x == TYPE_SFIXED64 as i32 => {
                serde_json::json!((utils::read_fixed64(bytes, cursor)? as i64).to_string())
            }
            x if x == TYPE_SINT32 as i32 => {
                serde_json::json!(utils::zigzag32(utils::read_varint(bytes, cursor)? as u32))
            }
            x if x == TYPE_SINT64 as i32 => {
                serde_json::json!(utils::zigzag64(utils::read_varint(bytes, cursor)?).to_string())
            }
            _ => decode_unknown(wire, bytes, cursor)?,
        })
    }
}

fn decode_packed(
    field: &FieldInfo,
    bytes: &[u8],
    cursor: &mut usize,
) -> anyhow::Result<serde_json::Value> {
    let data = utils::read_len(bytes, cursor)?;
    let mut nested_cursor = 0usize;
    let mut values = Vec::new();
    use field_descriptor_proto::Type::*;
    while nested_cursor < data.len() {
        values.push(match field.kind {
            x if x == TYPE_DOUBLE as i32 => {
                serde_json::json!(f64::from_bits(utils::read_fixed64(
                    data,
                    &mut nested_cursor
                )?))
            }
            x if x == TYPE_FLOAT as i32 => {
                serde_json::json!(f32::from_bits(utils::read_fixed32(
                    data,
                    &mut nested_cursor
                )?))
            }
            x if x == TYPE_INT64 as i32 => {
                serde_json::json!(
                    (utils::read_varint(data, &mut nested_cursor)? as i64).to_string()
                )
            }
            x if x == TYPE_UINT64 as i32 => {
                serde_json::json!(utils::read_varint(data, &mut nested_cursor)?.to_string())
            }
            x if x == TYPE_INT32 as i32 => {
                serde_json::json!(utils::read_varint(data, &mut nested_cursor)? as i32)
            }
            x if x == TYPE_FIXED64 as i32 => {
                serde_json::json!(utils::read_fixed64(data, &mut nested_cursor)?.to_string())
            }
            x if x == TYPE_FIXED32 as i32 => {
                serde_json::json!(utils::read_fixed32(data, &mut nested_cursor)?)
            }
            x if x == TYPE_BOOL as i32 => {
                serde_json::json!(utils::read_varint(data, &mut nested_cursor)? != 0)
            }
            x if x == TYPE_UINT32 as i32 => {
                serde_json::json!(utils::read_varint(data, &mut nested_cursor)? as u32)
            }
            x if x == TYPE_ENUM as i32 => {
                serde_json::json!(utils::read_varint(data, &mut nested_cursor)? as i32)
            }
            x if x == TYPE_SFIXED32 as i32 => {
                serde_json::json!(utils::read_fixed32(data, &mut nested_cursor)? as i32)
            }
            x if x == TYPE_SFIXED64 as i32 => {
                serde_json::json!(
                    (utils::read_fixed64(data, &mut nested_cursor)? as i64).to_string()
                )
            }
            x if x == TYPE_SINT32 as i32 => {
                serde_json::json!(utils::zigzag32(
                    utils::read_varint(data, &mut nested_cursor)? as u32
                ))
            }
            x if x == TYPE_SINT64 as i32 => {
                serde_json::json!(
                    utils::zigzag64(utils::read_varint(data, &mut nested_cursor)?).to_string()
                )
            }
            _ => anyhow::bail!("unsupported packed protobuf field type: {}", field.kind),
        });
    }
    Ok(serde_json::Value::Array(values))
}

fn insert_json_field(
    object: &mut serde_json::Map<String, serde_json::Value>,
    name: String,
    value: serde_json::Value,
    repeated: bool,
) {
    if repeated {
        match object.get_mut(&name) {
            Some(serde_json::Value::Array(values)) => append_repeated_value(values, value),
            Some(existing) => {
                let previous = std::mem::take(existing);
                let mut values = vec![previous];
                append_repeated_value(&mut values, value);
                *existing = serde_json::Value::Array(values);
            }
            None => {
                let mut values = Vec::new();
                append_repeated_value(&mut values, value);
                object.insert(name, serde_json::Value::Array(values));
            }
        }
    } else if object.contains_key(&name) {
        match object.get_mut(&name) {
            Some(serde_json::Value::Array(values)) => values.push(value),
            Some(existing) => {
                let previous = std::mem::take(existing);
                *existing = serde_json::Value::Array(vec![previous, value]);
            }
            None => {
                object.insert(name, serde_json::Value::Array(vec![value]));
            }
        }
    } else {
        object.insert(name, value);
    }
}

fn append_repeated_value(values: &mut Vec<serde_json::Value>, value: serde_json::Value) {
    if let serde_json::Value::Array(mut packed_values) = value {
        values.append(&mut packed_values);
    } else {
        values.push(value);
    }
}

fn decode_unknown(wire: u8, bytes: &[u8], cursor: &mut usize) -> anyhow::Result<serde_json::Value> {
    Ok(match wire {
        0 => serde_json::json!(utils::read_varint(bytes, cursor)?),
        1 => serde_json::json!(utils::read_fixed64(bytes, cursor)?),
        2 => serde_json::json!(utils::base64_encode(utils::read_len(bytes, cursor)?)),
        5 => serde_json::json!(utils::read_fixed32(bytes, cursor)?),
        _ => anyhow::bail!("unsupported protobuf wire type: {wire}"),
    })
}
