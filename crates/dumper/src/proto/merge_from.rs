use super::{
    CODED_INPUT_STREAM, FieldMinimalInfo, GET_COUNT_PROPERTY, MERGE_FROM, MessageMinimalInfo,
    NumberType, OneofVariantInfo, UNKNOWN_FIELD_SET,
    cache::TypeCache,
    proto_stream::CodedInputStream,
    util::{
        self, WIRE_TYPE_I32, WIRE_TYPE_I64, WIRE_TYPE_LENGTH_PREFIXED, WIRE_TYPE_VAR_INT,
        pack_wire_tag,
    },
};
use il2cpp::{
    get_native_method,
    vm::{method::Il2CppMethod, object::Il2CppObject, value::Void},
};
use reflection::{field_info::FieldInfo, runtime_type::RuntimeType};
use std::collections::HashSet;

const MAX_FIELD_NUMBER: u32 = 4096;

const LENGTH_PREFIXED_SAMPLES: &[&[u8]] = &[
    &[1, 0, 0, 0, 0],                   // repeated fixed32 / float
    &[1, 0, 0, 0, 0, 0, 0, 0, 0],       // repeated fixed64 / double
    &[5, 0x08, 0x01, 0x33, 0x01, 0x00], // map<varint, varint/string>
    &[5, 0x10, 0x01, 0x33, 0x10, 0x00], // map<string, varint/string>
];

#[derive(Clone, Copy)]
enum ValueReader {
    U8,
    U16,
    U32,
    U64,
    Pointer,
    CollectionCount,
}

struct FieldMeta {
    field: FieldInfo,
    ty: RuntimeType,
    offset: u32,
    reader: ValueReader,
}

struct Detection {
    data: usize,
    value: u64,
    oneof_extra_data: Option<OneofVariantInfo>,
}

enum Input {
    Unchanged,
    Exception,
    Changed(Detection),
}

pub fn dump_merge_from(
    proto_type: RuntimeType,
    proto_instance: Il2CppObject,
    message_info: &mut MessageMinimalInfo,
    type_cache: &TypeCache,
) {
    let name = proto_instance.get_class().byval_arg().il_name();
    let merge_from_method =
        get_native_method(&format!("{name}::{MERGE_FROM}({CODED_INPUT_STREAM})"))
            .unwrap_or_else(|| panic!("{name}::{MERGE_FROM}({CODED_INPUT_STREAM})"));

    let mut detector = ChangeDetector::new(type_cache, proto_instance);
    let scan_all = proto_type
        .get_fields_il2cpp()
        .iter()
        .any(|field| field.get_field_type().unwrap().get_name().unwrap().as_str() == "Object");
    let mut found: HashSet<u32> = message_info
        .fields
        .iter()
        .filter(|field| field.tag != 0)
        .map(|field| field.tag >> 3)
        .collect();

    for field_number in 1..MAX_FIELD_NUMBER {
        if !scan_all && found.len() == detector.metas.len() {
            break;
        }
        if found.contains(&field_number)
            || message_info
                .fields
                .iter()
                .any(|field| field.tag == field_number << 3)
        {
            continue;
        }

        let Some((tag, number_type, detection)) =
            try_field(&mut detector, merge_from_method, field_number)
        else {
            continue;
        };

        let number_type = match number_type {
            NumberType::Varint if detection.value != 0 && detection.value != 1 => {
                NumberType::ZigZagVarint
            }
            other => other,
        };
        let xor = if matches!(number_type, NumberType::Varint) {
            (detection.value as u32) ^ 1
        } else {
            0
        };

        if record(
            &mut message_info.fields,
            &detector.metas[detection.data],
            tag,
            xor,
            number_type,
            detection.oneof_extra_data,
        ) {
            found.insert(field_number);
        }
    }
}

fn try_field(
    detector: &mut ChangeDetector,
    merge_from_method: Il2CppMethod,
    field_number: u32,
) -> Option<(u32, NumberType, Detection)> {
    let varint = pack_wire_tag(field_number, WIRE_TYPE_VAR_INT);
    if let Input::Changed(detection) = detector.input(merge_from_method, varint, &[1]) {
        return Some((varint, NumberType::Varint, detection));
    }

    let length = pack_wire_tag(field_number, WIRE_TYPE_LENGTH_PREFIXED);
    if let Input::Changed(detection) = detector.input(merge_from_method, length, &[0]) {
        return Some((length, NumberType::None, detection));
    }

    match detector.input(merge_from_method, length, &[1, 0]) {
        Input::Changed(detection) => return Some((length, NumberType::None, detection)),
        Input::Exception => {
            for sample in LENGTH_PREFIXED_SAMPLES {
                if let Input::Changed(detection) = detector.input(merge_from_method, length, sample)
                {
                    return Some((length, NumberType::None, detection));
                }
            }
        }
        Input::Unchanged => {}
    }

    let fixed32 = pack_wire_tag(field_number, WIRE_TYPE_I32);
    if let Input::Changed(detection) =
        detector.input(merge_from_method, fixed32, &1u32.to_be_bytes())
    {
        return Some((fixed32, NumberType::Normal, detection));
    }

    let fixed64 = pack_wire_tag(field_number, WIRE_TYPE_I64);
    if let Input::Changed(detection) =
        detector.input(merge_from_method, fixed64, &1u64.to_be_bytes())
    {
        return Some((fixed64, NumberType::Normal, detection));
    }

    None
}

fn record(
    fields: &mut Vec<FieldMinimalInfo>,
    meta: &FieldMeta,
    tag: u32,
    xor: u32,
    number_type: NumberType,
    oneof_extra_data: Option<OneofVariantInfo>,
) -> bool {
    if oneof_extra_data.is_some() {
        fields.push(FieldMinimalInfo {
            tag,
            xor,
            offset: meta.offset,
            oneof_extra_data,
            number_type,
            property: None,
        });
        return true;
    }

    if let Some(field) = fields
        .iter_mut()
        .find(|field| field.offset == meta.offset && field.tag == 0)
    {
        field.tag = tag;
        field.xor = xor;
        field.number_type = number_type;
        return true;
    }

    fields.push(FieldMinimalInfo {
        tag,
        xor,
        offset: meta.offset,
        oneof_extra_data: None,
        number_type,
        property: None,
    });
    true
}

struct ChangeDetector {
    object: Il2CppObject,
    metas: Vec<FieldMeta>,
    values: Vec<u64>,
}

impl ChangeDetector {
    fn new(type_cache: &TypeCache, object: Il2CppObject) -> Self {
        let metas: Vec<FieldMeta> = RuntimeType::from_object(object)
            .unwrap()
            .get_fields_il2cpp()
            .into_iter()
            .filter(|field| {
                field.is_instance()
                    && field.get_field_type().unwrap().il_name() != UNKNOWN_FIELD_SET
            })
            .map(|field| FieldMeta::new(type_cache, field))
            .collect();
        let values = metas
            .iter()
            .map(|meta| read_field_value(meta, &object))
            .collect();

        Self {
            object,
            metas,
            values,
        }
    }

    fn input(&mut self, merge_from_method: Il2CppMethod, wire_tag: u32, data: &[u8]) -> Input {
        let mut buf = Vec::with_capacity(data.len() + util::varint_length(wire_tag));
        util::encode_varint(&mut buf, wire_tag);
        buf.extend(data);

        let stream = CodedInputStream::new_object(&buf);
        let result =
            microseh::try_seh(|| merge_from_method.invoke::<Void>(self.object, &[&stream]));
        if !matches!(result, Ok(Ok(_))) {
            return Input::Exception;
        }

        let object = self.object;
        let values = &mut self.values;
        let changed: Vec<usize> = self
            .metas
            .iter()
            .enumerate()
            .filter_map(|(index, meta)| {
                let value = read_field_value(meta, &object);
                if value != values[index] {
                    values[index] = value;
                    Some(index)
                } else {
                    None
                }
            })
            .collect();

        match changed.as_slice() {
            [] => Input::Unchanged,
            &[data] => Input::Changed(Detection {
                data,
                value: self.values[data],
                oneof_extra_data: None,
            }),
            &[first, second] => {
                let (data, oneof_enum) = self.classify_pair(first, second);
                let data_field_type = RuntimeType::from_object(Il2CppObject(unsafe {
                    *(self.object.0.wrapping_add(self.metas[data].offset as usize) as *const usize)
                }))
                .unwrap();

                Input::Changed(Detection {
                    data,
                    value: self.values[data],
                    oneof_extra_data: Some(OneofVariantInfo {
                        oneof_enum_offset: self.metas[oneof_enum].offset,
                        variant_type: data_field_type,
                        property: None,
                    }),
                })
            }
            _ => panic!("abnormal number of fields changed: {}", changed.len()),
        }
    }

    fn classify_pair(&self, first: usize, second: usize) -> (usize, usize) {
        let first_is_storage = self.metas[first].ty.get_name().unwrap().as_str() == "Object";
        if first_is_storage {
            (first, second)
        } else {
            (second, first)
        }
    }
}

impl FieldMeta {
    fn new(type_cache: &TypeCache, field: FieldInfo) -> Self {
        let ty = field.get_field_type().unwrap();
        let offset = field.get_offset() as u32;
        let reader = value_reader(type_cache, ty);
        Self {
            field,
            ty,
            offset,
            reader,
        }
    }
}

fn value_reader(type_cache: &TypeCache, field_type: RuntimeType) -> ValueReader {
    if let Some(cached_type) = type_cache.type_map.get(&field_type) {
        use super::CachedType::*;

        return match cached_type {
            Boolean | Byte | SByte => ValueReader::U8,
            Int16 | UInt16 => ValueReader::U16,
            Single | Int32 | UInt32 => ValueReader::U32,
            Double | Int64 | UInt64 => ValueReader::U64,
            Object | Any | ByteString | String => ValueReader::Pointer,
            _ => unreachable!(),
        };
    }

    if !field_type.get_generic_arguments().is_empty() {
        return ValueReader::CollectionCount;
    }

    if type_cache
        .type_map
        .contains_key(&field_type.get_base_type().unwrap())
    {
        ValueReader::U32
    } else {
        ValueReader::Pointer
    }
}

fn read_field_value(meta: &FieldMeta, object: &Il2CppObject) -> u64 {
    unsafe {
        let ptr = meta.field.get_field_data_ptr(object);
        match meta.reader {
            ValueReader::U8 => *ptr as u64,
            ValueReader::U16 => *ptr.cast::<u16>() as u64,
            ValueReader::U32 => *ptr.cast::<u32>() as u64,
            ValueReader::U64 => *ptr.cast::<u64>(),
            ValueReader::Pointer => *ptr.cast::<usize>() as u64,
            ValueReader::CollectionCount => {
                let collection = *(ptr as *const Il2CppObject);
                let properties = RuntimeType::from_object(collection)
                    .unwrap()
                    .get_properties(62);
                let get_count = properties
                    .iter()
                    .find(|property| property.get_name().unwrap().as_str() == GET_COUNT_PROPERTY)
                    .unwrap();
                get_count.get_value(collection).unwrap().unbox::<i32>() as u64
            }
        }
    }
}
