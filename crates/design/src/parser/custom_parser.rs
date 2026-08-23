use std::{
    collections::HashMap,
    io::{BufRead, Read, Seek},
    sync::LazyLock,
};

use base64::Engine;
use crate::common::data_define::{DataDefine, ValueKind};
use serde_json::{Map, Number, Value, json};
use varint_rs::VarintReader;

use crate::bytes::FromBytes;

use crate::DynamicParser;

type CustomParser =
    HashMap<&'static str, for<'a> fn(&mut DynamicParser<'a>) -> anyhow::Result<Value>>;

pub static CUSTOM_PARSER: LazyLock<CustomParser> = LazyLock::new(|| {
    let mut m: CustomParser = HashMap::with_capacity(8);
    m.insert("RPG.GameCore.FixPoint", fix_point_parser);
    m.insert("RPG.GameCore.DynamicValue", dynamic_value_parser);
    m.insert("RPG.GameCore.DynamicValues", dynamic_values_parser);
    m.insert("RPG.GameCore.DynamicFloat", dynamic_float_parser);
    m.insert("RPG.GameCore.ReadInfo", read_info_parser);
    m.insert("RPG.GameCore.JsonEnum", json_enum_parser);
    m.insert("RPG.Client.TextID", textid_parser);
    m.insert("RPG.GameCore.FormatString", format_string_parser);
    m
});

fn read_bytes<R: Read + Seek>(cursor: &mut R, len: usize) -> anyhow::Result<Vec<u8>> {
    let mut buffer = vec![0u8; len];
    cursor.read_exact(&mut buffer)?;
    Ok(buffer)
}

fn read_byte<R: Read + Seek>(cursor: &mut R) -> anyhow::Result<u8> {
    Ok(read_bytes(cursor, 1)?[0])
}

fn read_bool<R: Read + Seek>(cursor: &mut R) -> anyhow::Result<bool> {
    Ok(read_byte(cursor)? != 0)
}

fn fix_point_parser(parser: &mut DynamicParser<'_>) -> anyhow::Result<Value> {
    const CONSTANT: f64 = f64::from_bits(0x3DE0000000000000);
    let value = parser.cursor.read_i64_varint()? as f64;
    Ok(json!({
        "Value": value * CONSTANT
    }))
}

fn dynamic_value_parser(parser: &mut DynamicParser<'_>) -> anyhow::Result<Value> {
    let value_type = parser.cursor.read_i8_varint()?;

    let (r#type, value) = match value_type {
        0 => (
            String::from("Int32"),
            Value::Number(i32::from_bytes(&mut parser.cursor)?.into()),
        ),
        1 => (
            String::from("Float"),
            Value::Number(Number::from_f64(f64::from_bytes(&mut parser.cursor)?).unwrap()),
        ),
        2 => (
            String::from("Boolean"),
            Value::Bool(bool::from_bytes(&mut parser.cursor)?),
        ),
        3 => {
            let length = parser.cursor.read_i64_varint()? as usize;
            if length > 1_000_000 {
                return Err(anyhow::format_err!("attempting to allocate large memory!"));
            }
            let mut result = Vec::with_capacity(length);
            for _ in 0..length {
                result.push(parser.parse(
                    &ValueKind::Class(String::from("RPG.GameCore.DynamicValue")),
                    false,
                )?);
            }
            (String::from("Array"), serde_json::to_value(result)?)
        }
        4 => {
            let length = parser.cursor.read_i64_varint()? as usize;
            if length > 1_000_000 {
                return Err(anyhow::format_err!("attempting to allocate large memory!"));
            }
            let mut result = Vec::with_capacity(length);
            for _ in 0..length {
                let key = parser.parse(
                    &ValueKind::Class(String::from("RPG.GameCore.DynamicValue")),
                    false,
                )?;

                let value = parser.parse(
                    &ValueKind::Class(String::from("RPG.GameCore.DynamicValue")),
                    false,
                )?;

                result.push(json!({
                    "Key": key,
                    "Value": value
                }));
            }
            (String::from("Map"), serde_json::to_value(result)?)
        }
        5 => (
            String::from("String"),
            Value::String(String::from_bytes(&mut parser.cursor)?),
        ),
        _ => (String::from("Null"), Value::Null),
    };

    Ok(json!({
       "Type": r#type,
       "Value": value
    }))
}

fn dynamic_values_parser(parser: &mut DynamicParser<'_>) -> anyhow::Result<Value> {
    let length = parser.cursor.read_u64_varint()? as usize;

    if length > 1_000_000 {
        return Err(anyhow::format_err!("attempting to allocate large memory!"));
    }

    let mut floats = Map::with_capacity(length);

    for _ in 0..length {
        let key = parser.parse(
            &ValueKind::Class(String::from("RPG.GameCore.StringHash")),
            false,
        )?;

        let is_dynamic = bool::from_bytes(&mut parser.cursor)?;

        let value = if is_dynamic {
            let value_flag = read_bool(&mut parser.cursor)?;
            let value = dynamic_float_parser(parser)?;
            let adsorption_config = property_adsorption_config_parser(parser)?;
            let min_value = dynamic_float_parser(parser)?;
            let max_value = dynamic_float_parser(parser)?;
            let read_info = read_info_parser(parser)?;

            json!({
                "ValueFlag": value_flag,
                "Value": value,
                "AdsorptionConfig": adsorption_config,
                "MinValue": min_value,
                "MaxValue": max_value,
                "ReadInfo": read_info,
            })
        } else {
            let value = fix_point_parser(parser)?
                .get("Value")
                .ok_or(anyhow::anyhow!(
                    "FixPoint parsing should return Value field"
                ))?
                .as_f64()
                .ok_or(anyhow::anyhow!(
                    "FixPoint parsing should return a valid f64 number"
                ))?;

            let has_min_max = bool::from_bytes(&mut parser.cursor)?;
            let min_value = has_min_max.then(|| fix_point_parser(parser).ok()).flatten();
            let max_value = has_min_max.then(|| fix_point_parser(parser).ok()).flatten();

            let read_info = read_info_parser(parser)?;

            let mut out = Map::with_capacity(4);

            if value != 0.0 {
                out.insert(
                    String::from("Value"),
                    json!({
                        "Value": value
                    }),
                );
            }

            if let (Some(min), Some(max)) = (min_value, max_value) {
                out.insert(String::from("MinValue"), min);
                out.insert(String::from("MaxValue"), max);
            }

            out.insert(String::from("ReadInfo"), read_info);

            json!(out)
        };

        floats.insert(key.to_string(), value);
    }

    Ok(json!({
        "Floats": floats
    }))
}

fn dynamic_float_parser(parser: &mut DynamicParser<'_>) -> anyhow::Result<Value> {
    let is_dynamic = read_bool(&mut parser.cursor)?;

    Ok(if is_dynamic {
        let opcode_len = read_byte(&mut parser.cursor)? as usize;
        let opcodes = base64::engine::general_purpose::STANDARD
            .encode(read_bytes(&mut parser.cursor, opcode_len)?);

        let fixed_values = (0..read_byte(&mut parser.cursor)?)
            .map(|_| fix_point_parser(parser))
            .collect::<Result<Vec<_>, _>>()?;

        let dynamic_hashes = (0..read_byte(&mut parser.cursor)?)
            .map(|_| parser.cursor.read_i32_varint())
            .collect::<Result<Vec<_>, _>>()?;

        let postfix_json = json!({
            "OpCodes": opcodes,
            "FixedValues": fixed_values,
            "DynamicHashes": dynamic_hashes
        });

        json!({
            "IsDynamic": true,
            "PostfixExpr": postfix_json,
            "Expr": parse_postfix_expr(&postfix_json),
        })
    } else {
        let fixed_value = fix_point_parser(parser)?;

        json!({
            "IsDynamic": false,
            "FixedValue": fixed_value
        })
    })
}

fn read_info_parser(parser: &mut DynamicParser<'_>) -> anyhow::Result<Value> {
    let raw_type = read_byte(&mut parser.cursor)?;
    let ty = raw_type.to_string();

    let ty = if let Some(schema) = parser.types.get("RPG.GameCore.DynamicValueReadType")
        && let DataDefine::Enum(_, members) = schema
        && let Some(string_repr) = members.get(&ty)
    {
        string_repr.to_string()
    } else {
        ty
    };

    match raw_type {
        0 => Ok(json!({
            "Type": ty,
            "Key": null,
            "Index": 0
        })),

        1 => {
            let pos = parser.cursor.position();
            let string_length = parser.cursor.read_u32_varint()?;
            parser.cursor.set_position(pos);

            // TODO: hardcoded silverwolf999 fix
            if string_length > 64 {
                let mut trash = Vec::new();
                parser.cursor.read_until(b'\0', &mut trash)?;
                return Ok(json!({
                    "Type": ty,
                    "Key": null,
                    "Index": 0
                }));
            }

            let key = String::from_bytes(&mut parser.cursor)?;
            let index = parser.cursor.read_i32_varint()?;

            Ok(json!({
                "Type": ty,
                "Key": key,
                "Index": index
            }))
        }

        _ => {
            let key = String::from_bytes(&mut parser.cursor)?;
            let index = parser.cursor.read_i32_varint()?;

            Ok(json!({
                "Type": ty,
                "Key": key,
                "Index": index
            }))
        }
    }
}

fn json_enum_parser(parser: &mut DynamicParser<'_>) -> anyhow::Result<Value> {
    Ok(json!({
        "EnumIndex": parser.cursor.read_i32_varint()?,
        "Value":  parser.cursor.read_i32_varint()?
    }))
}

fn textid_parser(parser: &mut DynamicParser<'_>) -> anyhow::Result<Value> {
    Ok(json!({
        "Hash": parser.cursor.read_i32_varint()?,
        "Hash64": parser.cursor.read_u64_varint()?
    }))
}

fn format_string_parser(parser: &mut DynamicParser<'_>) -> anyhow::Result<Value> {
    Ok(json!(String::from_bytes(&mut parser.cursor)?))
}

fn property_adsorption_config_parser(parser: &mut DynamicParser<'_>) -> anyhow::Result<Value> {
    let fractional_digit = parser.cursor.read_i32_varint()?;
    let adsorption_thresh = fix_point_parser(parser)?;

    Ok(json!({
        "FractionalDigit": fractional_digit,
        "AdsorptionThresh": adsorption_thresh,
    }))
}

fn parse_postfix_expr(json: &Value) -> String {
    let opcodes_b64 = json.get("OpCodes").and_then(|v| v.as_str()).unwrap_or("");
    let bytecode = base64::engine::general_purpose::STANDARD
        .decode(opcodes_b64)
        .unwrap_or_default();

    let fixed_values: Vec<String> = json
        .get("FixedValues")
        .and_then(|v| v.as_array())
        .unwrap_or(&vec![])
        .iter()
        .map(|x| x.get("Value").unwrap().to_string())
        .collect();

    let dynamic_hashes: Vec<String> = json
        .get("DynamicHashes")
        .and_then(|v| v.as_array())
        .unwrap_or(&vec![])
        .iter()
        .map(std::string::ToString::to_string)
        .collect();

    let mut stack: Vec<String> = Vec::new();
    let mut pc: usize = 0;

    while pc < bytecode.len() {
        let op = bytecode[pc];
        pc += 1;

        match op {
            0 => {
                // Load Constant
                let idx = bytecode[pc] as usize;
                pc += 1;
                stack.push(fixed_values[idx].clone());
            }

            1 => {
                // Load Variable
                let idx = bytecode[pc] as usize;
                pc += 1;
                stack.push(format!("Var({})", dynamic_hashes[idx]));
            }

            16 => {
                // Load Stack Element
                let idx = bytecode[pc];
                pc += 1;
                stack.push(format!("Stack[{idx}]"));
            }

            2 => binop("+", &mut stack),
            3 => binop("-", &mut stack),
            4 => binop("*", &mut stack),
            5 => binop("/", &mut stack),
            6 => binop("%", &mut stack),

            7 => binop("==", &mut stack),
            8 => binop("!=", &mut stack),
            9 => binop("<", &mut stack),
            10 => binop(">", &mut stack),
            11 => binop("<=", &mut stack),
            12 => binop(">=", &mut stack),

            13 => {
                // Ternary
                let false_val = stack.pop().unwrap();
                let true_val = stack.pop().unwrap();
                let cond = stack.pop().unwrap();
                stack.push(format!("({cond} ? {true_val} : {false_val})"));
            }

            14 => {
                // NEG
                let a = stack.pop().unwrap();
                stack.push(format!("(-{a})"));
            }

            15 => {
                // NOT
                let a = stack.pop().unwrap();
                stack.push(format!("(!{a})"));
            }

            17 => {
                // RET
                return stack.pop().unwrap();
            }

            _ => {}
        }
    }

    String::from("Error: Stack not empty or no return")
}

fn binop(op: &str, stack: &mut Vec<String>) {
    let b = stack.pop().unwrap();
    let a = stack.pop().unwrap();
    stack.push(format!("({a} {op} {b})"));
}
