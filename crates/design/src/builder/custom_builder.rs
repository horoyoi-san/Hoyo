use super::DynamicBuilder;
use crate::bytes::ToBytes;
use crate::common::data_define::{DataDefine, ValueKind};
use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use serde_json::{Value, json};
use std::{collections::HashMap, io::Write, sync::LazyLock};
use varint_rs::VarintWriter as _;

type CustomBuilder =
    HashMap<&'static str, for<'a> fn(&mut DynamicBuilder<'a>, &Value) -> anyhow::Result<()>>;

pub static CUSTOM_BUILDER: LazyLock<CustomBuilder> = LazyLock::new(|| {
    let mut m: CustomBuilder = HashMap::with_capacity(8);
    m.insert("RPG.GameCore.FixPoint", fix_point_builder);
    m.insert("RPG.GameCore.DynamicValue", dynamic_value_builder);
    m.insert("RPG.GameCore.DynamicValues", dynamic_values_builder);
    m.insert("RPG.GameCore.DynamicFloat", dynamic_float_builder);
    m.insert("RPG.GameCore.ReadInfo", read_info_builder);
    m.insert("RPG.GameCore.JsonEnum", json_enum_builder);
    m.insert("RPG.Client.TextID", textid_builder);
    m.insert("RPG.GameCore.FormatString", format_string_builder);
    m
});

fn write_byte<W: Write>(cursor: &mut W, byte: u8) -> anyhow::Result<()> {
    cursor.write_all(&[byte])?;
    Ok(())
}

fn write_bool<W: Write>(cursor: &mut W, value: bool) -> anyhow::Result<()> {
    write_byte(cursor, if value { 1 } else { 0 })
}

fn fix_point_builder(
    builder: &mut DynamicBuilder<'_>,
    data: &Value,
) -> anyhow::Result<()> {
    if let Some(value) = data.get("Value")
        && let Some(float) = value.as_f64()
    {
        const SCALE_FACTOR: f64 = f64::from_bits(0x4200000000000000);
        let integer = (float * SCALE_FACTOR).trunc() as i64;

        integer.to_bytes(&mut builder.cursor)?;

        return Ok(());
    }

    Err(anyhow::anyhow!(
        "expected Value field to be present for FixPoint data!"
    ))
}

fn dynamic_value_builder(
    builder: &mut DynamicBuilder<'_>,
    data: &Value,
) -> anyhow::Result<()> {
    let r#type = data
        .get("Type")
        .and_then(|v| v.as_str())
        .ok_or(anyhow::anyhow!(
            "expecting Type field to be present for DynamicValue data!"
        ))?;

    let value = data.get("Value").ok_or(anyhow::anyhow!(
        "expecting Type field to be present for DynamicValue data!"
    ))?;

    match r#type {
        "Int32" => {
            if let Some(int) = value.as_i64() {
                (int as i32).to_bytes(&mut builder.cursor)?;
            }
        }
        "Float" => {
            if let Some(float) = value.as_f64() {
                float.to_bytes(&mut builder.cursor)?;
            }
        }
        "Boolean" => {
            if let Some(boolean) = value.as_bool() {
                boolean.to_bytes(&mut builder.cursor)?;
            }
        }
        "Array" => {
            unimplemented!("DynamicValue::Array")
        }
        "Map" => {
            unimplemented!("DynamicValue::Map")
        }
        "String" => {
            if let Some(string) = value.as_str() {
                string.to_bytes(&mut builder.cursor)?;
            }
        }
        _ => {}
    }

    Ok(())
}

fn dynamic_values_builder(
    builder: &mut DynamicBuilder<'_>,
    data: &Value,
) -> anyhow::Result<()> {
    let floats = data
        .get("Floats")
        .and_then(|v| v.as_object())
        .ok_or(anyhow::anyhow!(
            "expecting Floats field to be present for DynamicValues!"
        ))?;

    (floats.len() as u64).to_bytes(&mut builder.cursor)?;

    for (key, value) in floats {
        builder.build(
            &ValueKind::Class(String::from("RPG.GameCore.StringHash")),
            &serde_json::from_str::<Value>(key)?,
        )?;

        let value_obj = value.as_object().unwrap();

        let is_dynamic = value_obj.contains_key("AdsorptionConfig");
        is_dynamic.to_bytes(&mut builder.cursor)?;

        if is_dynamic {
            let value_flag = value_obj
                .get("ValueFlag")
                .ok_or(anyhow::anyhow!("missing ValueFlag"))?
                .as_bool()
                .ok_or(anyhow::anyhow!("ValueFlag is not a boolean"))?;
            let value = value_obj
                .get("Value")
                .ok_or(anyhow::anyhow!("missing Value"))?;
            let adsorption_config = value_obj
                .get("AdsorptionConfig")
                .ok_or(anyhow::anyhow!("missing AdsorptionConfig"))?;
            let min_value = value_obj
                .get("MinValue")
                .ok_or(anyhow::anyhow!("missing MinValue"))?;
            let max_value = value_obj
                .get("MaxValue")
                .ok_or(anyhow::anyhow!("missing MaxValue"))?;
            let read_info = value_obj
                .get("ReadInfo")
                .ok_or(anyhow::anyhow!("missing ReadInfo"))?;

            write_bool(&mut builder.cursor, value_flag)?;
            dynamic_float_builder(builder, value)?;
            property_adsorption_config_builder(builder, adsorption_config)?;
            dynamic_float_builder(builder, min_value)?;
            dynamic_float_builder(builder, max_value)?;
            read_info_builder(builder, read_info)?;
        } else {
            let val = value_obj.get("Value").cloned().unwrap_or_else(|| {
                json!({
                    "Value": 0.0
                })
            });

            fix_point_builder(builder, &val)?;

            let min_value = value_obj.get("MinValue");
            let max_value = value_obj.get("MaxValue");

            let has_min_max =
                min_value.is_some_and(|v| !v.is_null()) && max_value.is_some_and(|v| !v.is_null());

            has_min_max.to_bytes(&mut builder.cursor)?;

            if has_min_max {
                fix_point_builder(builder, min_value.unwrap())?;
                fix_point_builder(builder, max_value.unwrap())?;
            }

            let read_info = value_obj
                .get("ReadInfo")
                .ok_or(anyhow::anyhow!("missing ReadInfo"))?;

            read_info_builder(builder, read_info)?;
        }
    }

    Ok(())
}

fn dynamic_float_builder(
    builder: &mut DynamicBuilder<'_>,
    data: &Value,
) -> anyhow::Result<()> {
    let is_dynamic = data
        .get("IsDynamic")
        .and_then(serde_json::Value::as_bool)
        .ok_or(anyhow::anyhow!(
            "expecting IsDynamic field to be present for RPG.GameCore.DynamicFloat!"
        ))?;

    write_bool(&mut builder.cursor, is_dynamic)?;

    if is_dynamic {
        let data = data.get("PostfixExpr").ok_or(anyhow::anyhow!(
            "expecting PostfixExpr field to be present for RPG.GameCore.DynamicFloat!"
        ))?;

        // Opcode
        let opcode = data
            .get("OpCodes")
            .and_then(|v| STANDARD.decode(v.as_str()?).ok())
            .ok_or(anyhow::anyhow!(
                "expecting OpCodes field to be present for RPG.GameCore.DynamicFloat!"
            ))?;

        write_byte(&mut builder.cursor, opcode.len() as u8)?;
        builder.cursor.write_all(&opcode)?;

        // Fixed Values
        let fixed_values =
            data.get("FixedValues")
                .and_then(|v| v.as_array())
                .ok_or(anyhow::anyhow!(
                    "expecting FixedValues field to be present for RPG.GameCore.DynamicFloat!"
                ))?;

        write_byte(&mut builder.cursor, fixed_values.len() as u8)?;
        for fixed_value in fixed_values {
            fix_point_builder(builder, fixed_value)?;
        }

        // Dynamic Hashes
        let dynamic_hashes =
            data.get("DynamicHashes")
                .and_then(|v| v.as_array())
                .ok_or(anyhow::anyhow!(
                    "expecting DynamicHashes field to be present for RPG.GameCore.DynamicFloat!"
                ))?;

        write_byte(&mut builder.cursor, dynamic_hashes.len() as u8)?;
        for fixed_value in dynamic_hashes {
            (fixed_value.as_i64().unwrap() as i32).to_bytes(&mut builder.cursor)?;
        }
    } else {
        let fixed_value = data.get("FixedValue").ok_or(anyhow::anyhow!(
            "expecting FixedValue field to be present for RPG.GameCore.DynamicFloat!"
        ))?;
        fix_point_builder(builder, fixed_value)?;
    }

    Ok(())
}

fn read_info_builder(
    builder: &mut DynamicBuilder<'_>,
    data: &Value,
) -> anyhow::Result<()> {
    let ty = data
        .get("Type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow::anyhow!("missing Type"))?;

    let raw_type = if let Some(schema) = builder.types.get("RPG.GameCore.DynamicValueReadType")
        && let DataDefine::Enum(_, members) = schema
    {
        members
            .iter()
            .find_map(|(discriminant, string_repr)| {
                if *string_repr == ty {
                    Some(discriminant)
                } else {
                    None
                }
            })
            .map_or(ty, |v| v)
            .parse::<u8>()?
    } else {
        ty.parse::<u8>()?
    };

    write_byte(&mut builder.cursor, raw_type)?;

    match raw_type {
        0 => {
            // nothing else written
        }

        1 => {
            let key = data.get("Key").and_then(|v| v.as_str()).unwrap_or_default();

            let index = data.get("Index").and_then(serde_json::Value::as_i64).unwrap_or(0) as i32;

            key.to_bytes(&mut builder.cursor)?;
            builder.cursor.write_i32_varint(index)?;
        }

        _ => {
            let key = data
                .get("Key")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow::anyhow!("missing Key"))?;

            let index = data
                .get("Index")
                .and_then(serde_json::Value::as_i64)
                .ok_or_else(|| anyhow::anyhow!("missing Index"))? as i32;

            key.to_bytes(&mut builder.cursor)?;
            builder.cursor.write_i32_varint(index)?;
        }
    }

    Ok(())
}

fn json_enum_builder(
    builder: &mut DynamicBuilder<'_>,
    data: &Value,
) -> anyhow::Result<()> {
    data.get("EnumIndex")
        .and_then(|v| v.as_i64().map(|v| v as i32))
        .ok_or(anyhow::anyhow!(
            "expecting EnumIndex field to be present for RPG.GameCore.JsonEnum!"
        ))?
        .to_bytes(&mut builder.cursor)?;

    data.get("Value")
        .and_then(|v| v.as_i64().map(|v| v as i32))
        .ok_or(anyhow::anyhow!(
            "expecting Value field to be present for RPG.GameCore.JsonEnum!"
        ))?
        .to_bytes(&mut builder.cursor)?;

    Ok(())
}

fn textid_builder(
    builder: &mut DynamicBuilder<'_>,
    data: &Value,
) -> anyhow::Result<()> {
    data.get("Hash")
        .and_then(|v| v.as_i64().map(|v| v as i32))
        .ok_or(anyhow::anyhow!(
            "expecting Hash field to be present for RPG.Client.TextID!"
        ))?
        .to_bytes(&mut builder.cursor)?;

    data.get("Hash64")
        .and_then(serde_json::Value::as_u64)
        .ok_or(anyhow::anyhow!(
            "expecting Hash64 field to be present for RPG.Client.TextID!"
        ))?
        .to_bytes(&mut builder.cursor)?;

    Ok(())
}

fn format_string_builder(
    builder: &mut DynamicBuilder<'_>,
    data: &Value,
) -> anyhow::Result<()> {
    data.as_str()
        .ok_or(anyhow::anyhow!(
            "expecting string for RPG.GameCore.FormatString"
        ))?
        .to_bytes(&mut builder.cursor)?;

    Ok(())
}

fn property_adsorption_config_builder(
    builder: &mut DynamicBuilder<'_>,
    data: &Value,
) -> anyhow::Result<()> {
    data.get("FractionalDigit")
        .and_then(|v| v.as_i64().map(|v| v as i32))
        .ok_or(anyhow::anyhow!(
            "expecting FractionalDigit field to be present for RPG.GameCore.PropertyAdsorptionConfig!"
        ))?
        .to_bytes(&mut builder.cursor)?;

    let adsorption_thresh = data.get("AdsorptionThresh").ok_or(anyhow::anyhow!(
        "expecting AdsorptionThresh field to be present for RPG.GameCore.PropertyAdsorptionConfig!"
    ))?;

    fix_point_builder(builder, adsorption_thresh)?;

    Ok(())
}
