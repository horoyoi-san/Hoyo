use std::collections::BTreeMap;

use serde::Deserialize;

#[derive(Debug, Deserialize)]
pub enum DataDefine {
    Class {
        skip_existflag_check: Option<bool>,
        fields: Vec<DataField>,
        interfaces: Vec<String>,
    },
    Struct {
        fields: Vec<DataField>,
        interfaces: Vec<String>,
    },
    Typeindex {
        base: String,
        descendants: BTreeMap<u64, ValueKind>,
    },
    Enum(String, BTreeMap<String, String>),
}

#[derive(Debug, Deserialize)]
pub struct DataField {
    pub field_name: String,
    pub data_type: ValueKind,
}

#[derive(Debug, Deserialize, Clone, PartialEq, Eq)]
pub enum ValueKind {
    Primitive(String),
    Array(Box<ValueKind>),
    Dictionary(Box<ValueKind>, Box<ValueKind>),
    Class(String),
    Other(),
}
