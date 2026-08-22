use std::collections::HashMap;

use il2cpp::get_cached_class;
use reflection::runtime_type::RuntimeType;

pub struct TypeCache {
    pub type_map: HashMap<RuntimeType, CachedType>,
}

#[derive(PartialEq)]
pub enum CachedType {
    Object,
    Boolean,
    Byte,
    SByte,
    UInt16,
    Int16,
    UInt32,
    Int32,
    UInt64,
    Int64,
    Single,
    Double,
    String,
    ByteString,
    Any,
    Enum,
}

impl TypeCache {
    pub fn init() -> Self {
        use CachedType::*;

        TypeCache {
            type_map: HashMap::from([
                (
                    RuntimeType::from_class(get_cached_class("System.Object").unwrap()).unwrap(),
                    Object,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.Boolean").unwrap()).unwrap(),
                    Boolean,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.Byte").unwrap()).unwrap(),
                    Byte,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.SByte").unwrap()).unwrap(),
                    SByte,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.UInt16").unwrap()).unwrap(),
                    UInt16,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.Int16").unwrap()).unwrap(),
                    Int16,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.UInt32").unwrap()).unwrap(),
                    UInt32,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.Int32").unwrap()).unwrap(),
                    Int32,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.UInt64").unwrap()).unwrap(),
                    UInt64,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.Int64").unwrap()).unwrap(),
                    Int64,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.Single").unwrap()).unwrap(),
                    Single,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.Double").unwrap()).unwrap(),
                    Double,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.String").unwrap()).unwrap(),
                    String,
                ),
                (
                    RuntimeType::from_class(get_cached_class("System.Enum").unwrap()).unwrap(),
                    Enum,
                ),
                (
                    RuntimeType::from_class(get_cached_class(super::BYTE_STRING).unwrap()).unwrap(),
                    ByteString,
                ),
                (
                    RuntimeType::from_class(get_cached_class(super::PROTOBUF_ANY).unwrap())
                        .unwrap(),
                    Any,
                ),
                (
                    RuntimeType::from_class(
                        get_cached_class("Google.Protobuf.ByteString").unwrap(),
                    )
                    .unwrap(),
                    ByteString,
                ),
            ]),
        }
    }
}
