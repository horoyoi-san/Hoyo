use crate::proto::{
    BYTE_STRING, FieldMinimalInfo, MessageMinimalInfo, NumberType, OneofVariantInfo,
    UNKNOWN_FIELD_SET,
    proto_stream::{ByteString, CodedOutputStream, SYSTEM_BYTE_ARRAY_CLASS},
    util,
};
use il2cpp::{
    CLASS_TABLE, get_cached_class,
    vm::{
        array::Il2CppArray,
        method::Il2CppMethod,
        object::Il2CppObject,
        string::Il2CppString,
        value::{Il2CppValue, Void},
    },
};
use reflection::{field_info::FieldInfo, runtime_type::RuntimeType};
use std::{
    borrow::Cow,
    collections::HashSet,
    io::{Cursor, Read},
};

#[allow(unused)]
pub fn dump_writeto(
    debug: bool,
    i: u32,
    proto_type: RuntimeType,
    ctor: Il2CppMethod,
    write_to: Il2CppMethod,
    message_info: &mut MessageMinimalInfo,
) -> bool {
    let mut fields = proto_type
        .get_fields_il2cpp()
        .into_iter()
        .filter(|f| f.is_instance() && f.get_field_type().unwrap().il_name() != UNKNOWN_FIELD_SET)
        .collect::<Vec<_>>();

    // We handle oneofs first
    handle_oneof(proto_type, ctor, write_to, message_info, &mut fields);

    let message_name = proto_type.il_name();
    let proto_class = proto_type.get_il2cpp_type().get_class();

    if debug {
        log::debug!("[Proto Dumper | WriteTo] Dumping {message_name} {i}");
    }

    // First, we check if the proto has weird ctor logic in it (i.e they put non 0 value on primitive types)
    let mut weird_offsets = HashSet::new();
    {
        let object = proto_class.create_instance();
        ctor.invoke::<Void>(object, &[]).unwrap();
        for field in &fields {
            let offset = field.get_offset();
            let field_type = field.get_field_type().unwrap().il_name();
            let ptr = object.0 + offset;

            let non_zero = match field_type.as_ref() {
                "System.UInt32" => unsafe { *(ptr as *const u32) != 0 },
                "System.UInt64" => unsafe { *(ptr as *const u64) != 0 },
                "System.Int32" => unsafe { *(ptr as *const i32) != 0 },
                "System.Int64" => unsafe { *(ptr as *const i64) != 0 },
                "System.Single" => unsafe { *(ptr as *const f32) != 0.0 },
                "System.Double" => unsafe { *(ptr as *const f64) != 0.0 },
                "System.Boolean" => unsafe { *(ptr as *const bool) },
                _ => false,
            };

            if non_zero {
                weird_offsets.insert((offset, field_type));
            }
        }
    }

    for field in fields {
        let proto_object = proto_class.create_instance();
        ctor.invoke::<Void>(proto_object, &[]).unwrap();

        let field_type = field.get_field_type().unwrap();
        let field_type_name = field_type.il_name();
        let field_offset = field.get_offset();

        // If we have primitive fields with non 0 value, set it to zero
        for (weird_offset, field_type_name) in &weird_offsets {
            let ptr = proto_object.0 + weird_offset;
            match field_type_name.as_ref() {
                "System.UInt32" => unsafe { *(ptr as *mut u32) = 0 },
                "System.UInt64" => unsafe { *(ptr as *mut u64) = 0 },
                "System.Int32" => unsafe { *(ptr as *mut i32) = 0 },
                "System.Int64" => unsafe { *(ptr as *mut i64) = 0 },
                "System.Single" => unsafe { *(ptr as *mut f32) = 0.0 },
                "System.Double" => unsafe { *(ptr as *mut f64) = 0.0 },
                "System.Boolean" => unsafe { *(ptr as *mut bool) = false },
                _ => {}
            }
        }

        let result = unsafe {
            match field_type_name.as_ref() {
                "System.String" => {
                    *((proto_object.0 + field_offset) as *mut usize) =
                        Il2CppString::from("STRING").0;
                    try_and_see(field_type_name, write_to, proto_object)
                        .filter(|(_, value_ptr, wire_type)| {
                            &*(*value_ptr as *const String) == "STRING"
                        })
                        .map(|(field_number, _, wire_type)| FieldMinimalInfo {
                            tag: field_number,
                            offset: field_offset as u32,
                            xor: 0,
                            oneof_extra_data: None,
                            number_type: NumberType::None,
                            property: None,
                        })
                }
                "System.Int32" => {
                    const SAMPLES: [i32; 2] = [-1000, 1000];
                    SAMPLES
                        .iter()
                        .find_map(|&sample| {
                            *((proto_object.0 + field_offset) as *mut i32) = sample;
                            try_and_see(field_type_name.clone(), write_to, proto_object).map(
                                |(field_number, value_ptr, wire_type)| {
                                    if value_ptr.is_null() || wire_type == WireType::ThirtyTwoBit {
                                        return (field_number, 0, NumberType::Normal);
                                    }

                                    let int = unsafe { *(value_ptr as *const i32) };
                                    let xor_value = int ^ sample;
                                    let xored = sample ^ xor_value;

                                    let number_type = if xored == int && xored == sample {
                                        NumberType::Varint
                                    } else {
                                        NumberType::ZigZagVarint
                                    };

                                    (field_number, xor_value as u32, number_type)
                                },
                            )
                        })
                        .map(|(tag, xor, number_type)| FieldMinimalInfo {
                            tag,
                            offset: field_offset as u32,
                            xor,
                            oneof_extra_data: None,
                            number_type,
                            property: None,
                        })
                }
                "System.UInt32" => {
                    *((proto_object.0 + field_offset) as *mut u32) = 1000;
                    try_and_see(field_type_name, write_to, proto_object)
                        .map(|(field_number, value_ptr, wire_type)| {
                            if value_ptr.is_null() || wire_type == WireType::ThirtyTwoBit {
                                return (field_number, 0, NumberType::Normal);
                            }

                            let int = unsafe { *(value_ptr as *const i32) };
                            let xor_value = int ^ 1000;
                            (field_number, xor_value as u32, NumberType::Varint)
                        })
                        .map(|(tag, xor, number_type)| FieldMinimalInfo {
                            tag,
                            offset: field_offset as u32,
                            xor,
                            oneof_extra_data: None,
                            number_type,
                            property: None,
                        })
                }
                "System.Int64" => {
                    const SAMPLES: [i64; 2] = [-2147483648, 2147483648];
                    SAMPLES
                        .iter()
                        .find_map(|&sample| {
                            *((proto_object.0 + field_offset) as *mut i64) = sample;
                            try_and_see(field_type_name.clone(), write_to, proto_object).map(
                                |(field_number, value_ptr, wire_type)| {
                                    if value_ptr.is_null() || wire_type == WireType::SixtyFourBit {
                                        return (field_number, 0, NumberType::Normal);
                                    }

                                    let int = unsafe { *(value_ptr as *const i64) };
                                    let xor_value = int ^ sample;
                                    let xored = sample ^ xor_value;

                                    let number_type = if xored == int {
                                        NumberType::Varint
                                    } else {
                                        NumberType::ZigZagVarint
                                    };

                                    (field_number, xor_value as u32, number_type)
                                },
                            )
                        })
                        .map(|(tag, xor, number_type)| FieldMinimalInfo {
                            tag,
                            offset: field_offset as u32,
                            xor,
                            oneof_extra_data: None,
                            number_type,
                            property: None,
                        })
                }
                "System.UInt64" => {
                    *((proto_object.0 + field_offset) as *mut u64) = 4294967296;
                    try_and_see(field_type_name, write_to, proto_object)
                        .map(|(field_number, value_ptr, wire_type)| {
                            if value_ptr.is_null() || wire_type == WireType::ThirtyTwoBit {
                                return (field_number, 0, NumberType::Normal);
                            }

                            let int = unsafe { *(value_ptr as *const u64) };
                            let xor_value = int ^ 4294967296;
                            (field_number, xor_value as u32, NumberType::Varint)
                        })
                        .map(|(tag, xor, number_type)| FieldMinimalInfo {
                            tag,
                            offset: field_offset as u32,
                            xor,
                            oneof_extra_data: None,
                            number_type,
                            property: None,
                        })
                }
                "System.Single" => {
                    *((proto_object.0 + field_offset) as *mut f32) = 100.0;
                    try_and_see(field_type_name, write_to, proto_object).map(
                        |(field_number, _, wire_type)| FieldMinimalInfo {
                            tag: field_number,
                            offset: field_offset as u32,
                            xor: 0,
                            oneof_extra_data: None,
                            number_type: NumberType::None,
                            property: None,
                        },
                    )
                }
                "System.Double" => {
                    *((proto_object.0 + field_offset) as *mut f64) = 100.0;
                    try_and_see(field_type_name, write_to, proto_object).map(
                        |(field_number, _, wire_type)| FieldMinimalInfo {
                            tag: field_number,
                            offset: field_offset as u32,
                            xor: 0,
                            oneof_extra_data: None,
                            number_type: NumberType::None,
                            property: None,
                        },
                    )
                }
                "System.Boolean" => {
                    *((proto_object.0 + field_offset) as *mut bool) = true;
                    try_and_see(field_type_name, write_to, proto_object)
                        .filter(|(_, value_ptr, wire_type)| unsafe { *(*value_ptr as *const bool) })
                        .map(|(field_number, _, wire_type)| FieldMinimalInfo {
                            tag: field_number,
                            offset: field_offset as u32,
                            xor: 0,
                            oneof_extra_data: None,
                            number_type: NumberType::None,
                            property: None,
                        })
                }
                _ => {
                    if field_type.get_isenum().unwrap().unbox() {
                        *((proto_object.0 + field_offset) as *mut i32) = 1;
                        try_and_see(Cow::Borrowed("System.Int32"), write_to, proto_object).map(
                            |(field_number, _, wire_type)| FieldMinimalInfo {
                                tag: field_number,
                                offset: field_offset as u32,
                                xor: 0,
                                oneof_extra_data: None,
                                number_type: NumberType::None,
                                property: None,
                            },
                        )
                    } else {
                        handle_complex_type(
                            field_type_name,
                            proto_object,
                            field_type,
                            field_offset,
                            write_to,
                        )
                    }
                }
            }
        };

        if let Some(field_info) = result {
            message_info.fields.push(field_info);
        } else {
            message_info.fields.push(FieldMinimalInfo {
                tag: 0,
                xor: 0,
                offset: field_offset as u32,
                oneof_extra_data: None,
                number_type: NumberType::None,
                property: None,
            });
        }
    }

    true
}

fn handle_complex_type(
    field_type_name: Cow<'static, str>,
    proto_object: Il2CppObject,
    field_type: RuntimeType,
    field_offset: usize,
    write_to: Il2CppMethod,
) -> Option<FieldMinimalInfo> {
    let mut field_instance = field_type.get_il2cpp_type().get_class().create_instance();
    let generics = field_type.get_generic_arguments();

    let result = match generics.len() {
        1 => handle_repeated_field(field_type, field_instance, &generics[0]),
        2 => handle_map_field(field_type, field_instance, &generics[0], &generics[1]),
        _ => {
            if field_type.il_name().eq(BYTE_STRING) {
                field_instance = ByteString::new().as_il2cpp_object();
            } else {
                field_type.find_method_il2cpp(".ctor").inspect(|m| {
                    m.get_il2cpp_method()
                        .invoke::<Void>(field_instance, &[])
                        .unwrap();
                });
            }
            Some(Void)
        }
    };

    if result.is_some() {
        unsafe { *((proto_object.0 + field_offset) as *mut Il2CppObject) = field_instance };
        return try_and_see(field_type_name, write_to, proto_object).map(|(field_number, _, _)| {
            FieldMinimalInfo {
                tag: field_number,
                offset: field_offset as u32,
                xor: 0,
                oneof_extra_data: None,
                number_type: NumberType::None,
                property: None,
            }
        });
    }

    None
}

fn handle_repeated_field(
    field_type: RuntimeType,
    field_instance: Il2CppObject,
    repeated_value_type: &RuntimeType,
) -> Option<Void> {
    field_type
        .find_method_il2cpp(".ctor")?
        .get_il2cpp_method()
        .invoke::<Void>(field_instance, &[])
        .ok()?;

    let repeated_value_class = repeated_value_type.get_il2cpp_type().get_class();
    let arguments_ptr = match repeated_value_type.il_name().as_ref() {
        "System.String" => vec![Il2CppString::from("STRING").0],
        "System.Int32" | "System.UInt32" | "System.Int64" | "System.UInt64" => {
            vec![Box::into_raw(Box::new(1)) as usize]
        }
        "System.Single" => vec![Box::into_raw(Box::new(10.0f32)) as usize],
        "System.Double" => vec![Box::into_raw(Box::new(10.0f64)) as usize],
        BYTE_STRING => vec![ByteString::new().0],
        _ => {
            let message_instance = repeated_value_class.create_instance();
            repeated_value_type
                .find_method_il2cpp(".ctor")
                .inspect(|m| {
                    m.get_il2cpp_method()
                        .invoke::<Void>(message_instance, &[])
                        .unwrap();
                });
            vec![message_instance.0]
        }
    };

    field_type
        .find_method_specific("Add", 62, &[&repeated_value_type.format_type_name(true)])?
        .get_il2cpp_method()
        .invoke2::<Void>(field_instance, arguments_ptr)
        .ok()
}

fn handle_map_field(
    field_type: RuntimeType,
    field_instance: Il2CppObject,
    key_type: &RuntimeType,
    value_type: &RuntimeType,
) -> Option<Void> {
    field_type
        .find_method_il2cpp(".ctor")?
        .get_il2cpp_method()
        .invoke::<Void>(field_instance, &[])
        .ok()?;

    let mut arguments_ptr = Vec::with_capacity(2);

    // Set Key
    match key_type.il_name().as_ref() {
        "System.String" => arguments_ptr.push(Il2CppString::from("STRING").0),
        "System.Int32" | "System.UInt32" | "System.Int64" | "System.UInt64" => {
            arguments_ptr.push(Box::into_raw(Box::new(1)) as usize);
        }
        "System.Single" => arguments_ptr.push(Box::into_raw(Box::new(10.0f32)) as usize),
        "System.Double" => arguments_ptr.push(Box::into_raw(Box::new(10.0f64)) as usize),
        other => panic!("invalid map key {other}"),
    }

    // Set value
    let value_class = value_type.get_il2cpp_type().get_class();
    match value_type.il_name().as_ref() {
        "System.String" => arguments_ptr.push(Il2CppString::from("STRING").0),
        "System.Int32" | "System.UInt32" | "System.Int64" | "System.UInt64" => {
            arguments_ptr.push(Box::into_raw(Box::new(1)) as usize);
        }
        "System.Single" => arguments_ptr.push(Box::into_raw(Box::new(10.0f32)) as usize),
        "System.Double" => arguments_ptr.push(Box::into_raw(Box::new(10.0f64)) as usize),
        BYTE_STRING => arguments_ptr.push(ByteString::new().0),
        _ => {
            let message_instance = value_class.create_instance();
            value_type.find_method_il2cpp(".ctor").inspect(|m| {
                m.get_il2cpp_method()
                    .invoke::<Void>(message_instance, &[])
                    .unwrap();
            });
            arguments_ptr.push(message_instance.0);
        }
    }

    field_type
        .find_method_il2cpp("set_Item")?
        .get_il2cpp_method()
        .invoke2::<Void>(field_instance, arguments_ptr)
        .ok()
}

fn try_and_see(
    field_type_name: Cow<'static, str>,
    write_to: Il2CppMethod,
    proto_object: Il2CppObject,
) -> Option<(u32, *const usize, WireType)> {
    let cos = CodedOutputStream::new();

    write_to
        .invoke::<Void>(proto_object, &[&cos.object])
        .unwrap();

    let buf = cos.buffer();

    // use base64::engine::Engine;
    // log::debug!(
    //     "{field_type_name} | {}",
    //     base64::engine::general_purpose::STANDARD.encode(&buf)
    // );

    let mut buf = Cursor::new(buf);

    if let Some(key) = decode_varint(&mut buf) {
        let field_number = (key >> 3) as u32;
        let wire_type = unsafe { std::mem::transmute::<u64, WireType>(key & 0x07) };
        let tag = field_number << 3;

        match (field_type_name.as_ref(), wire_type) {
            // Signed 32-bit Types
            ("System.Int32", WireType::Varint) => {
                let raw = decode_varint(&mut buf)? as i32;
                return Some((tag, Box::into_raw(Box::new(raw)) as *const _, wire_type));
            }
            ("System.Int32", WireType::ThirtyTwoBit) => {
                return Some((tag, std::ptr::null(), wire_type));
            }

            // 64-bit Types
            ("System.Int64", WireType::Varint) => {
                let raw = decode_varint(&mut buf)? as i64;
                return Some((tag, Box::into_raw(Box::new(raw)) as *const _, wire_type));
            }
            ("System.Int64", WireType::SixtyFourBit) => {
                return Some((tag, std::ptr::null(), wire_type));
            }

            // Unsigned 32-bit Types
            ("System.UInt32", WireType::Varint) => {
                let raw = decode_varint(&mut buf)? as u32;
                return Some((tag, Box::into_raw(Box::new(raw)) as *const _, wire_type));
            }
            ("System.UInt32", WireType::ThirtyTwoBit) => {
                return Some((tag, std::ptr::null(), wire_type));
            }

            // Unsigned 64-bit Types
            ("System.UInt64", WireType::Varint) => {
                let raw = decode_varint(&mut buf)?;
                return Some((tag, Box::into_raw(Box::new(raw)) as *const _, wire_type));
            }
            ("System.UInt64", WireType::SixtyFourBit) => {
                return Some((tag, std::ptr::null(), wire_type));
            }

            // String
            ("System.String", WireType::LengthDelimited) => {
                let len = decode_varint(&mut buf)? as usize;
                let mut string_bytes = vec![0u8; len];
                buf.read_exact(&mut string_bytes).ok()?;
                let string_value = String::from_utf8(string_bytes).ok()?;
                return Some((
                    tag,
                    Box::into_raw(Box::new(string_value)) as *const _,
                    wire_type,
                ));
            }

            // Boolean
            ("System.Boolean", WireType::Varint) => {
                let raw = decode_varint(&mut buf)?;
                return Some((
                    tag,
                    Box::into_raw(Box::new(raw != 0)) as *const _,
                    wire_type,
                ));
            }

            // Float32
            ("System.Single", WireType::ThirtyTwoBit) => {
                return Some((tag, std::ptr::null(), wire_type));
            }

            // Float64
            ("System.Double", WireType::SixtyFourBit) => {
                return Some((tag, std::ptr::null(), wire_type));
            }

            // ByteString, RepeatedField<T>, MapField<T>
            _ => {
                return Some((tag, std::ptr::null(), WireType::LengthDelimited));
            }
        }
    }

    None
}

fn handle_oneof(
    proto_type: RuntimeType,
    ctor: Il2CppMethod,
    write_to: Il2CppMethod,
    message_info: &mut MessageMinimalInfo,
    fields: &mut Vec<FieldInfo>,
) {
    let (oneof_data_offsets, oneof_enum_numbers) = util::map_oneof_enum_getter(fields);
    for data_offset in oneof_data_offsets {
        for (enum_offset, enum_number) in &oneof_enum_numbers {
            let enum_number = *enum_number;
            let enum_offset = *enum_offset;

            let proto_instance = proto_type.get_il2cpp_type().get_class().create_instance();
            ctor.invoke::<usize>(proto_instance, &[]).unwrap();

            unsafe {
                (*((proto_instance.0 + enum_offset) as *mut i32)) = enum_number;
                (*((proto_instance.0 + data_offset) as *mut usize)) =
                    // since there are no oneof field member as ByteString (yet?), so we used this
                    Il2CppArray::new(SYSTEM_BYTE_ARRAY_CLASS, 0).0;
            }

            let cos = CodedOutputStream::new();

            if let Err(err) = write_to.invoke::<Void>(proto_instance, &[&cos.object]) {
                // We expect error like this: "Unable to cast object of type 'Byte' to type 'String'."
                let err = err.get_message().unwrap().as_str();
                if let Some((_, dst)) = extract_type_from_error(&err) {
                    let field_type = runtime_type_from_str(dst);
                    message_info.fields.push(FieldMinimalInfo {
                        xor: 0,
                        offset: data_offset as u32,
                        tag: (enum_number as u32) << 3,
                        oneof_extra_data: Some(OneofVariantInfo {
                            oneof_enum_offset: enum_offset as u32,
                            variant_type: field_type,
                            property: None,
                        }),
                        number_type: NumberType::None,
                        property: None,
                    });
                } else {
                    // log::debug!(
                    //     "[Proto Dumper] we got error other than cast error! {err} on class: {} enum_number: {}",
                    //     proto_instance.get_class().byval_arg().il_name(),
                    //     enum_number
                    // );
                }
            }
        }
    }
}

fn get_cached_type_slow(type_str: &str) -> Option<RuntimeType> {
    CLASS_TABLE.get().unwrap().iter().find_map(|(k, v)| {
        if k.ends_with(type_str) {
            RuntimeType::from_class(*v).ok()
        } else {
            None
        }
    })
}

fn runtime_type_from_str(type_str: &str) -> RuntimeType {
    match type_str {
        "Boolean" => RuntimeType::from_class(get_cached_class("System.Boolean").unwrap()).unwrap(),
        "Byte" => RuntimeType::from_class(get_cached_class("System.Byte").unwrap()).unwrap(),
        "SByte" => RuntimeType::from_class(get_cached_class("System.SByte").unwrap()).unwrap(),
        "Char" => RuntimeType::from_class(get_cached_class("System.Char").unwrap()).unwrap(),
        "Int16" => RuntimeType::from_class(get_cached_class("System.Int16").unwrap()).unwrap(),
        "UInt16" => RuntimeType::from_class(get_cached_class("System.UInt16").unwrap()).unwrap(),
        "Int32" => RuntimeType::from_class(get_cached_class("System.Int32").unwrap()).unwrap(),
        "UInt32" => RuntimeType::from_class(get_cached_class("System.UInt32").unwrap()).unwrap(),
        "Int64" => RuntimeType::from_class(get_cached_class("System.Int64").unwrap()).unwrap(),
        "UInt64" => RuntimeType::from_class(get_cached_class("System.UInt64").unwrap()).unwrap(),
        "Single" => RuntimeType::from_class(get_cached_class("System.Single").unwrap()).unwrap(),
        "Double" => RuntimeType::from_class(get_cached_class("System.Double").unwrap()).unwrap(),
        "String" => RuntimeType::from_class(get_cached_class("System.String").unwrap()).unwrap(),
        "Object" => RuntimeType::from_class(get_cached_class("System.Object").unwrap()).unwrap(),
        _ => {
            let rt =
                RuntimeType::from_name(format!("{type_str}, Assembly-CSharp").into(), false, true)
                    .unwrap();

            if rt.is_null() {
                if let Some(rt) = get_cached_type_slow(type_str) {
                    return rt;
                }
                unreachable!("Unhandled type casting: {type_str}");
            }

            rt
        }
    }
}

fn extract_type_from_error(error: &str) -> Option<(&str, &str)> {
    let mut parts = error.splitn(4, '\'');
    let src = parts.nth(1)?.trim();
    let into = parts
        .nth(1)?
        .trim_end_matches(|c: char| !c.is_alphanumeric());
    Some((src, into))
}

#[derive(Debug, Copy, Clone, PartialEq)]
#[repr(u64)]
#[allow(dead_code)]
enum WireType {
    Varint = 0,
    SixtyFourBit = 1,
    LengthDelimited = 2,
    ThirtyTwoBit = 5,
}

fn decode_varint<R: Read>(buf: &mut R) -> Option<u64> {
    let mut value = 0u64;
    let mut shift = 0;
    let mut byte = [0u8];

    loop {
        if buf.read_exact(&mut byte).is_err() {
            return None;
        }

        value |= ((byte[0] & 0x7F) as u64) << shift;

        if byte[0] & 0x80 == 0 {
            break;
        }

        shift += 7;
        if shift >= 64 {
            return None;
        }
    }

    Some(value)
}
