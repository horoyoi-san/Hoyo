use super::{custom_attribute::format_custom_atrributes, runtime_type::RuntimeType};
use crate::{attributes::FieldAttributes, member_info::MemberInfo, serializer::BoxedSerializer};
use dahlah_derive::{Il2CppValue, il2cpp_api};
use il2cpp::vm::{
    array::Il2CppArray,
    boxed_value::{BoxedBool, BoxedValue},
    class::Il2CppClass,
    field::Il2CppField,
    object::Il2CppObject,
    string::Il2CppString,
    r#type::Il2CppType,
    value::Il2CppValue,
};
use std::fmt::{Display, Write};

#[derive(Clone, Copy, Debug, Il2CppValue)]
#[repr(transparent)]
pub struct FieldInfo(pub usize);

#[il2cpp_api("System.Reflection.MonoField")]
impl FieldInfo {
    #[method("get_Attributes", 1)]
    pub fn get_attributes(&self) -> Result<BoxedValue<FieldAttributes>>;

    #[method("get_FieldType", 4)]
    pub fn get_field_type(&self) -> Result<RuntimeType>;

    #[method("get_DeclaringType", 7)]
    pub fn get_declaringtype(&self) -> Result<RuntimeType>;

    #[method("get_Name", 8)]
    pub fn get_name(&self) -> Result<Il2CppString>;

    #[method("GetCustomAttributes", 10, native)]
    fn get_custom_attributes_internal(&self, inherit: bool) -> Result<Il2CppArray>;

    #[method("GetValue", 14)]
    pub fn get_value(&self, obj: Il2CppObject) -> Result<Il2CppObject>;
}

#[il2cpp_api("System.Reflection.FieldInfo")]
impl FieldInfo {
    #[method("get_IsLiteral", 6)]
    pub fn get_isliteral(&self) -> Result<BoxedBool>;

    #[method("get_IsStatic", 7)]
    pub fn get_isstatic(&self) -> Result<BoxedBool>;

    #[method("SetValue", 13)]
    pub fn set_value(&self, obj: Il2CppObject, value: Il2CppObject) -> Result<Il2CppObject>;

    #[method("GetFieldFromHandle", 15)]
    pub fn from_il2cpp_field(r#field: Il2CppField) -> Result<Self>;
}

#[allow(unused)]
impl FieldInfo {
    #[inline]
    pub fn get_custom_attributes(&self) -> Vec<Il2CppObject> {
        self.get_custom_attributes_internal(true)
            .map(il2cpp::api::Il2CppArray::to_vec)
            .unwrap_or_default()
    }

    #[inline]
    pub fn get_il2cpp_class(&self) -> Il2CppClass {
        unsafe { Il2CppClass(*((self.0 + 0x10) as *const usize)) }
    }

    #[inline]
    pub fn get_il2cpp_field(&self) -> Il2CppField {
        unsafe { Il2CppField(*((self.0 + 0x18) as *const usize)) }
    }

    #[inline]
    pub fn get_offset(&self) -> usize {
        self.get_il2cpp_field().offset()
    }

    #[inline]
    pub fn get_metadata_token(&self) -> i32 {
        unsafe { MemberInfo(self.0).get_metadata_token().unwrap().unbox() }
    }
}

impl FieldInfo {
    #[inline]
    pub fn get_field_data_ptr(&self, obj: &Il2CppObject) -> *const u8 {
        (obj.0 as *const u8).wrapping_add(self.get_offset())
    }

    #[inline]
    pub fn get_mut_field_data_ptr<T: Copy>(&self, obj: &Il2CppObject) -> *mut T {
        (obj.0 as *mut T).wrapping_add(self.get_offset())
    }

    pub fn is_instance(&self) -> bool {
        let attrs = self.get_attributes().unwrap().unbox();
        !attrs.contains(FieldAttributes::Static) && !attrs.contains(FieldAttributes::Literal)
    }

    #[inline]
    pub fn modifier(&self) -> String {
        let attrs = self.get_attributes().unwrap().unbox();
        let access = attrs & FieldAttributes::FieldAccessMask;

        let mut output = String::from(match access {
            FieldAttributes::Private => "private ",
            FieldAttributes::Public => "public ",
            FieldAttributes::Family => "protected ",
            FieldAttributes::Assembly | FieldAttributes::FamANDAssem => "internal ",
            FieldAttributes::FamORAssem => "protected internal ",
            _ => "",
        });

        if attrs.contains(FieldAttributes::Literal) {
            output.push_str("const ");
        } else {
            if attrs.contains(FieldAttributes::Static) {
                output.push_str("static ");
            }
            if attrs.contains(FieldAttributes::InitOnly) {
                output.push_str("readonly ");
            }
        }

        output
    }

    pub fn format_value<W: Write>(&self, out: &mut W) {
        let mut serializer = BoxedSerializer::new2(true);
        if let Ok(Ok(serialized)) = self
            .get_value(Il2CppObject::NULL)
            .map(|v| serializer.serialize(self.get_field_type().unwrap(), v))
        {
            let _ = out.write_str(&format!(" = {serialized}"));
        }
    }
}

impl Display for FieldInfo {
    fn fmt(&self, out: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let attributes = format_custom_atrributes(self.get_custom_attributes());
        let modifier = self.modifier();
        let field_type = self.get_field_type().unwrap().format_type_name(true);
        let field_offset = self.get_offset();
        let field_name = self.get_name().unwrap().as_str();

        write!(out, "{attributes}{modifier}{field_type} {field_name}")?;

        if self.get_isliteral().unwrap().unbox() {
            let _ = microseh::try_seh(|| {
                self.format_value(out);
            });
        }

        write!(
            out,
            "; // {}Token: 0x{:X}",
            if field_offset > 0 {
                format!("Offset: 0x{field_offset:X} ")
            } else {
                String::new()
            },
            self.get_metadata_token()
        )?;

        Ok(())
    }
}
