use std::iter::Map;

use dahlah_derive::Il2CppValue;
use il2cpp::vm::array::Il2CppArray;
use il2cpp::vm::value::Il2CppValue;
use il2cpp::vm::{object::Il2CppObject, r#type::Il2CppType};

use crate::r#enum::Enum;
use crate::runtime_type::RuntimeType;

#[inline]
pub fn pointer_size(ty: RuntimeType) -> usize {
    let type_name = ty.get_name().unwrap().as_str();

    match type_name.as_ref() {
        "SByte" | "Byte" | "Boolean" | "Char" => 1,
        "Int16" | "UInt16" => 2,
        "Int32" | "UInt32" | "Single" => 4,
        "Int64" | "UInt64" | "Double" => 8,
        _ if ty.get_isenum().unwrap().unbox() => {
            Enum::get_underlying_type(ty).map_or(4, pointer_size)
        }
        _ if ty.get_isvaluetype().unwrap().unbox() => {
            let fields = ty.get_fields(54); // Public | NonPublic | Instance | DeclaredOnly
            if let Some(field) = fields.last() {
                field.get_il2cpp_field().offset() + pointer_size(field.get_field_type().unwrap())
                    - 0x10 // field offset have 0x10 because all of them treated as Il2CppObject
            } else {
                0
            }
        }
        _ => 8,
    }
}

#[derive(Debug, Clone, Copy, Il2CppValue)]
#[repr(transparent)]
pub struct Array(pub usize);

impl Array {
    pub fn iter(
        self,
        length: Option<i32>,
    ) -> Map<std::ops::Range<usize>, impl FnMut(usize) -> Il2CppObject> {
        let array = Il2CppArray(self.0);

        let element_type = RuntimeType::from_class(array.class())
            .unwrap()
            .get_element_type()
            .unwrap();

        let is_valuetype = element_type.get_isvaluetype().unwrap().unbox();

        let value_size = pointer_size(element_type);

        let count = if let Some(n) = length {
            n as usize
        } else {
            unsafe { *((self.0 + 24) as *const usize) }
        };

        (0..count).map(move |i| {
            let item_pointer = self.0 + 32 + (i * value_size);
            if is_valuetype {
                Il2CppObject::box_value(
                    element_type.get_il2cpp_type().get_class(),
                    item_pointer as *const u8,
                )
            } else {
                Il2CppObject(unsafe { *(item_pointer as *const usize) })
            }
        })
    }
}
