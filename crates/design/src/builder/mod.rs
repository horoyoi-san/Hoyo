use anyhow::Context;
use crate::common::data_define::{DataDefine, ValueKind};
use serde_json::Value;
use std::{
    collections::HashMap,
    io::{Cursor, Write},
};
use crate::bytes::{ExistFlag, ToBytes};
use varint_rs::VarintWriter;

mod custom_builder;

#[derive(Debug, Clone, Copy)]
pub enum DynamicBuilderEvent<'event> {
    ArrayBuildValue {
        value_kind: &'event ValueKind,
        index: usize,
        value: &'event Value,
        offset: usize,
    },
    DictionaryBuildValue {
        value_kind: &'event ValueKind,
        key: &'event String,
        value: &'event Value,
        offset: usize,
    },
}

pub type Callback = Box<dyn for<'event> Fn(DynamicBuilderEvent<'event>)>;

pub struct DynamicBuilder<'builder> {
    pub types: &'builder HashMap<String, DataDefine>,
    pub cursor: Cursor<Vec<u8>>,
    callbacks: &'builder mut Vec<Callback>,
    cursor_refs: Vec<&'builder Cursor<Vec<u8>>>,
}

impl<'builder> DynamicBuilder<'builder> {
    pub fn new(
        types: &'builder HashMap<String, DataDefine>,
        callbacks: &'builder mut Vec<Callback>,
    ) -> Self {
        Self {
            types,
            cursor: Cursor::new(Vec::new()),
            callbacks,
            cursor_refs: Vec::new(),
        }
    }

    pub fn build(&mut self, kind: &ValueKind, data: &Value) -> anyhow::Result<()> {
        match kind {
            ValueKind::Primitive(cs_type) => match cs_type.as_str() {
                "sbyte" => (data.as_i64().unwrap() as i8).to_bytes(&mut self.cursor)?,
                "byte" => (data.as_u64().unwrap() as u8).to_bytes(&mut self.cursor)?,
                "short" => (data.as_i64().unwrap() as i16).to_bytes(&mut self.cursor)?,
                "ushort" => (data.as_u64().unwrap() as u16).to_bytes(&mut self.cursor)?,
                "int" => (data.as_i64().unwrap() as i32).to_bytes(&mut self.cursor)?,
                "uint" => (data.as_u64().unwrap() as u32).to_bytes(&mut self.cursor)?,
                "long" => data.as_i64().unwrap().to_bytes(&mut self.cursor)?,
                "ulong" => data.as_u64().unwrap().to_bytes(&mut self.cursor)?,
                "float" => (data.as_f64().unwrap() as f32).to_bytes(&mut self.cursor)?,
                "double" => data.as_f64().unwrap().to_bytes(&mut self.cursor)?,
                "bool" => (data.as_bool().unwrap()).to_bytes(&mut self.cursor)?,
                "string" => (data.as_str().unwrap()).to_bytes(&mut self.cursor)?,
                other => return Err(anyhow::format_err!("unhandled primitive: {other}")),
            },
            ValueKind::Array(value_kind) => {
                if let Some(array) = data.as_array() {
                    self.cursor.write_i64_varint(array.len() as i64)?;
                    for (index, item) in array.iter().enumerate() {
                        self.fire_event(DynamicBuilderEvent::ArrayBuildValue {
                            value_kind,
                            value: item,
                            index,
                            offset: self.cursor_refs.iter().map(|v| v.position()).sum::<u64>()
                                as usize
                                + self.cursor.position() as usize,
                        });

                        self.build(value_kind, item)?;
                    }
                } else {
                    unreachable!()
                }
            }
            ValueKind::Dictionary(key_kind, value_kind) => {
                if let Some(map) = data.as_object()
                    && let ValueKind::Primitive(key_kind) = key_kind.as_ref()
                {
                    self.cursor.write_i64_varint(map.len() as i64)?;
                    for (key, value) in map {
                        // Build key
                        match key_kind.as_str() {
                            "sbyte" => (key.parse::<i8>().unwrap()).to_bytes(&mut self.cursor)?,
                            "byte" => (key.parse::<u8>().unwrap()).to_bytes(&mut self.cursor)?,
                            "short" => (key.parse::<i16>().unwrap()).to_bytes(&mut self.cursor)?,
                            "ushort" => (key.parse::<u16>().unwrap()).to_bytes(&mut self.cursor)?,
                            "int" => (key.parse::<i32>().unwrap()).to_bytes(&mut self.cursor)?,
                            "uint" => (key.parse::<u32>().unwrap()).to_bytes(&mut self.cursor)?,
                            "long" => (key.parse::<i64>().unwrap()).to_bytes(&mut self.cursor)?,
                            "ulong" => (key.parse::<u64>().unwrap()).to_bytes(&mut self.cursor)?,
                            "float" => (key.parse::<f32>().unwrap()).to_bytes(&mut self.cursor)?,
                            "double" => (key.parse::<f64>().unwrap()).to_bytes(&mut self.cursor)?,
                            "bool" => (key.parse::<bool>().unwrap()).to_bytes(&mut self.cursor)?,
                            "string" => key.to_bytes(&mut self.cursor)?,
                            other => {
                                return Err(anyhow::format_err!(
                                    "unhandled primitive for dictionary key: {other}"
                                ));
                            }
                        }

                        self.fire_event(DynamicBuilderEvent::DictionaryBuildValue {
                            value_kind,
                            key,
                            value,
                            offset: self.cursor_refs.iter().map(|v| v.position()).sum::<u64>()
                                as usize
                                + self.cursor.position() as usize,
                        });

                        // Build value
                        self.build(value_kind, value)
                            .context("Failed to serialize Dictionary value")?;
                    }
                } else {
                    return Err(anyhow::anyhow!(
                        "non primitive dictionary key is not supported! {key_kind:?}"
                    ));
                }
            }
            ValueKind::Class(class_name) => {
                if let Some(custom) = custom_builder::CUSTOM_BUILDER.get(class_name.as_str()) {
                    return custom(self, data);
                }

                let Some(define) = self.types.get(class_name) else {
                    return Err(anyhow::format_err!("unhandled type: {class_name}"));
                };

                self.build_class_kind(define, data)?;
            }
            ValueKind::Other() => {}
        }

        Ok(())
    }

    fn build_class_kind(&mut self, data_type: &DataDefine, data: &Value) -> anyhow::Result<()> {
        match data_type {
            DataDefine::Class {
                skip_existflag_check,
                fields,
                interfaces: _,
            } => {
                // no-op
                if skip_existflag_check.is_some() {
                    return Ok(());
                }

                let mut exist_flag = ExistFlag::empty(fields.len());

                let mut parser = DynamicBuilder::new(self.types, self.callbacks);
                parser.cursor_refs = self.cursor_refs.clone();
                parser.cursor_refs.push(&self.cursor);

                for (i, field) in fields.iter().enumerate() {
                    if let Some(data) = data.get(&field.field_name) {
                        exist_flag.toggle(i, true);
                        parser.build(&field.data_type, data)?;
                    } else {
                        exist_flag.toggle(i, false);
                    }
                }

                let inner = parser.into_inner();

                // write exist flag
                exist_flag.to_bytes(&mut self.cursor)?;

                // write the actual data
                self.cursor.write_all(&inner)?;
            }
            DataDefine::Struct {
                fields,
                interfaces: _,
            } => {
                for field in fields {
                    let data = data.get(&field.field_name).ok_or(anyhow::anyhow!(
                        "struct data requires full fields to be present"
                    ))?;
                    self.build(&field.data_type, data)?;
                }
            }
            DataDefine::Typeindex { base, descendants } => {
                let ty = data
                    .get("$type")
                    .and_then(|v| v.as_str())
                    .ok_or(anyhow::anyhow!("expecting $type for DataDefine::TypeIndex"))?;

                // TODO: re-check this
                if base == ty {
                    (0u64).to_bytes(&mut self.cursor)?;
                    self.build(descendants.get(&0).unwrap(), data)?;
                    return Ok(());
                }

                let (typeindex, descendant) = descendants
                    .iter()
                    .find_map(|(i, v)| {
                        if let ValueKind::Class(descendant) = v
                            && descendant == ty
                        {
                            // data is typeindex, but descendant also typeindex, target the Inner one
                            if let Some(DataDefine::Typeindex {
                                base: _,
                                descendants,
                            }) = self.types.get(descendant)
                                && let Some(descendant) = descendants.get(&0)
                            {
                                Some((*i, descendant))
                            } else {
                                Some((*i, v))
                            }
                        } else {
                            None
                        }
                    })
                    .ok_or(anyhow::anyhow!("typeindex not exist! {base} {ty}"))?;

                typeindex.to_bytes(&mut self.cursor)?;
                self.build(descendant, data)?;
            }
            DataDefine::Enum(enum_type, enums) => {
                let enum_value = data.as_str().unwrap();
                let enum_discriminant = enums
                    .iter()
                    .find_map(|(discriminant, v)| {
                        if *v == enum_value {
                            Some(discriminant)
                        } else {
                            None
                        }
                    })
                    .map_or(enum_value, |v| v);

                match enum_type.as_str() {
                    "ulong" => enum_discriminant
                        .parse::<u64>()
                        .with_context(|| format!("invalid number {enum_discriminant}"))?
                        .to_bytes(&mut self.cursor)?,
                    "int" => enum_discriminant
                        .parse::<i32>()
                        .with_context(|| format!("invalid number {enum_discriminant}"))?
                        .to_bytes(&mut self.cursor)?,
                    "uint" => enum_discriminant
                        .parse::<u32>()
                        .with_context(|| format!("invalid number {enum_discriminant}"))?
                        .to_bytes(&mut self.cursor)?,
                    "ushort" => enum_discriminant
                        .parse::<u16>()
                        .with_context(|| format!("invalid number {enum_discriminant}"))?
                        .to_bytes(&mut self.cursor)?,
                    kind => return Err(anyhow::format_err!("unknown enum kind {kind}")),
                }
            }
        }

        Ok(())
    }

    #[inline]
    fn fire_event(&mut self, event: DynamicBuilderEvent<'_>) {
        for callback in self.callbacks.iter() {
            callback(event);
        }
    }

    #[inline]
    pub fn register_callback(&mut self, callback: Callback) {
        self.callbacks.push(callback);
    }

    #[inline]
    pub fn clear_callbacks(&mut self) {
        self.callbacks.clear();
    }

    pub fn into_inner(self) -> Vec<u8> {
        self.cursor.into_inner()
    }
}
