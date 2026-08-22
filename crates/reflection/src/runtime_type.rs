use std::borrow::Cow;

use crate::{
    assembly::Assembly, attributes::TypeAttributes, event_info::EventInfo, field_info::FieldInfo,
    member_info::MemberInfo, method_info::MethodInfo, property_info::PropertyInfo,
};
use anyhow::Result;
use dahlah_derive::{Il2CppValue, il2cpp_api};
use il2cpp::vm::{
    array::Il2CppArray,
    boxed_value::{BoxedBool, BoxedValue},
    class::Il2CppClass,
    object::Il2CppObject,
    string::Il2CppString,
    r#type::Il2CppType,
    value::Il2CppValue,
};

#[derive(Copy, Clone, Debug, Il2CppValue, PartialEq, Eq, Hash, PartialOrd, Ord)]
#[repr(transparent)]
pub struct RuntimeType(pub usize);

#[il2cpp_api("System.Type")]
impl RuntimeType {
    #[method("GetMethod", 51)]
    pub fn get_method(&self, name: Il2CppString, binding_flags: i32) -> Result<MethodInfo>;

    #[method("GetProperty", 70)]
    pub fn get_property(&self, name: Il2CppString, binding_flags: i32) -> Result<PropertyInfo>;

    #[method("get_Attributes", 91)]
    pub fn get_attributes(&self) -> Result<BoxedValue<TypeAttributes>>;

    #[method("get_IsInterface", 106)]
    pub fn get_isinterface(&self) -> Result<BoxedBool>;

    #[method("get_IsValueType", 107)]
    pub fn get_isvaluetype(&self) -> Result<BoxedBool>;

    #[method("get_IsArray", 117)]
    pub fn get_isarray(&self) -> Result<BoxedBool>;

    #[method("get_IsByRef", 126)]
    pub fn get_isbyref(&self) -> Result<BoxedBool>;

    #[method("get_IsPointer", 127)]
    pub fn get_ispointer(&self) -> Result<BoxedBool>;

    #[method("get_IsPrimitive", 128)]
    pub fn get_isprimitive(&self) -> Result<BoxedBool>;

    #[method("GetType", 193)]
    pub fn from_name(
        name: Il2CppString,
        throw_on_error: bool,
        ignore_case: bool,
    ) -> Result<RuntimeType>;

    #[method("GetTypeFromHandle", 201)]
    pub fn from_il2cpp_type(r#type: Il2CppType) -> Result<RuntimeType>;
}

#[il2cpp_api("System.RuntimeType")]
impl RuntimeType {
    #[method("GetMethods", 20)]
    fn get_methods_internal(&self, binding_flags: i32) -> Result<Il2CppArray>;

    #[method("GetConstructors", 21)]
    fn get_constructors_internal(&self, binding_flags: i32) -> Result<Il2CppArray>;

    #[method("GetProperties", 22)]
    fn get_properties_internal(&self, binding_flags: i32) -> Result<Il2CppArray>;

    #[method("GetEvents", 23)]
    fn get_events_internal(&self, binding_flags: i32) -> Result<Il2CppArray>;

    #[method("GetFields", 24)]
    fn get_fields_internal(&self, binding_flags: i32) -> Result<Il2CppArray>;

    #[method("GetField", 31)]
    pub fn get_field(&self, name: Il2CppString, binding_flags: i32) -> Result<FieldInfo>;

    #[method("get_Assembly", 37)]
    pub fn get_assembly(&self) -> Result<Assembly>;

    #[method("IsAssignableFrom", 44)]
    pub fn is_assignable_from(&self, c: RuntimeType) -> Result<BoxedBool>;

    #[method("get_BaseType", 46)]
    pub fn get_base_type(&self) -> Result<RuntimeType>;

    #[method("get_IsEnum", 57)]
    pub fn get_isenum(&self) -> Result<BoxedBool>;

    #[method("GetElementType", 63)]
    pub fn get_element_type(&self) -> Result<RuntimeType>;

    #[method("GetGenericArguments", 70)]
    fn get_generic_arguments_internal(&self) -> Result<Il2CppArray>;

    #[method("MakeGenericType", 71)]
    pub fn make_generic_type(&self, types: Il2CppArray) -> Result<RuntimeType>;

    #[method("get_IsGenericTypeDefinition", 72)]
    pub fn get_is_generic_type_definition(&self) -> Result<BoxedBool>;

    #[method("get_IsGenericParameter", 73)]
    pub fn get_is_generic_parameter(&self) -> Result<BoxedBool>;

    #[method("GetGenericTypeDefinition", 75)]
    pub fn get_generic_type_definition(&self) -> Result<RuntimeType>;

    #[method("get_IsGenericType", 76)]
    pub fn get_isgenerictype(&self) -> Result<BoxedBool>;

    #[method("GetCustomAttributes", 85, native)]
    fn get_custom_attributes_internal(&self, inherit: bool) -> Result<Il2CppArray>;

    #[method("get_ReflectedType", 91)]
    pub fn get_reflected_type(&self) -> Result<RuntimeType>;

    #[method("get_ContainsGenericParameters", 118)]
    pub fn contains_generic_parameters(&self) -> Result<BoxedBool>;

    #[method("GetInterfaces", 148)]
    fn get_interfaces_internal(&self) -> Result<Il2CppArray>;

    #[method("get_DeclaringType", 152)]
    pub fn get_declaring_type(&self) -> Result<RuntimeType>;

    #[method("get_Name", 153)]
    pub fn get_name(&self) -> Result<Il2CppString>;

    #[method("get_Namespace", 154)]
    pub fn get_namespace(&self) -> Result<Il2CppString>;

    #[method("get_FullName", 156)]
    pub fn get_full_name(&self) -> Result<Il2CppString>;
}

#[allow(unused)]
impl RuntimeType {
    #[inline]
    pub fn get_il2cpp_type(&self) -> Il2CppType {
        unsafe { Il2CppType(*((self.0 + 16) as *const usize)) }
    }

    #[inline]
    pub fn from_class(class: Il2CppClass) -> Result<Self> {
        Self::from_il2cpp_type(class.byval_arg())
    }

    #[inline]
    pub fn from_object(obj: Il2CppObject) -> Result<Self> {
        Self::from_class(obj.get_class())
    }

    #[inline]
    pub fn get_generic_arguments(&self) -> Vec<RuntimeType> {
        unsafe {
            self.get_generic_arguments_internal()
                .unwrap()
                .to_vec::<RuntimeType>()
        }
    }

    #[inline]
    pub fn get_properties(&self, binding_flags: i32) -> Vec<PropertyInfo> {
        unsafe {
            self.get_properties_internal(binding_flags)
                .map(il2cpp::api::Il2CppArray::to_vec::<PropertyInfo>)
                .unwrap_or_default()
        }
    }

    #[inline]
    pub fn get_fields(&self, binding_flags: i32) -> Vec<FieldInfo> {
        unsafe {
            self.get_fields_internal(binding_flags)
                .map(il2cpp::api::Il2CppArray::to_vec::<FieldInfo>)
                .unwrap_or_default()
        }
    }

    #[inline]
    pub fn get_events(&self, binding_flags: i32) -> Vec<EventInfo> {
        unsafe {
            self.get_events_internal(binding_flags)
                .map(il2cpp::api::Il2CppArray::to_vec::<EventInfo>)
                .unwrap_or_default()
        }
    }

    #[inline]
    pub fn get_fields_il2cpp(&self) -> Vec<FieldInfo> {
        self.get_il2cpp_type()
            .get_class()
            .get_fields()
            .into_iter()
            .filter_map(|f| FieldInfo::from_il2cpp_field(f).ok())
            .collect()
    }

    #[inline]
    pub fn get_methods(&self, binding_flags: i32) -> Vec<MethodInfo> {
        unsafe {
            self.get_methods_internal(binding_flags)
                .map(il2cpp::api::Il2CppArray::to_vec::<MethodInfo>)
                .unwrap_or_default()
        }
    }

    #[inline]
    pub fn get_methods_il2cpp(&self) -> Vec<MethodInfo> {
        self.get_il2cpp_type()
            .get_class()
            .get_methods()
            .into_iter()
            .filter_map(|f| MethodInfo::from_handle(f).ok())
            .collect()
    }

    #[inline]
    pub fn find_method_il2cpp(&self, name: &str) -> Option<MethodInfo> {
        self.get_methods_il2cpp()
            .iter()
            .find(|m| m.get_name().unwrap().as_str() == name)
            .copied()
    }

    #[inline]
    pub fn get_constructors(&self, binding_flags: i32) -> Vec<MethodInfo> {
        unsafe {
            self.get_constructors_internal(binding_flags)
                .map(il2cpp::api::Il2CppArray::to_vec::<MethodInfo>)
                .unwrap_or_default()
        }
    }

    #[inline]
    pub fn get_interfaces(&self) -> Vec<RuntimeType> {
        unsafe {
            self.get_interfaces_internal()
                .map(il2cpp::api::Il2CppArray::to_vec::<RuntimeType>)
                .unwrap_or_default()
        }
    }

    #[inline]
    fn impl_get_method_specific(
        &self,
        methods: Vec<MethodInfo>,
        name: &str,
        arg_types: &[&str],
    ) -> Option<MethodInfo> {
        methods
            .iter()
            .find(|method| {
                method.get_name().unwrap().as_str() == name
                    && method.get_parameters().len() == arg_types.len()
                    && method.get_parameters().iter().zip(arg_types.iter()).all(
                        |(param, &arg_type)| {
                            param.get_parameter_type().unwrap().format_type_name(true) == arg_type
                        },
                    )
            })
            .copied()
    }

    #[inline]
    pub fn find_method_specific(
        &self,
        name: &str,
        binding_flags: i32,
        arg_types: &[&str],
    ) -> Option<MethodInfo> {
        self.impl_get_method_specific(self.get_methods(binding_flags), name, arg_types)
    }

    #[inline]
    pub fn find_constructor_specific(
        &self,
        name: &str,
        binding_flags: i32,
        arg_types: &[&str],
    ) -> Option<MethodInfo> {
        self.impl_get_method_specific(self.get_constructors(binding_flags), name, arg_types)
    }

    #[inline]
    pub fn get_custom_attributes(&self) -> Vec<Il2CppObject> {
        unsafe {
            self.get_custom_attributes_internal(true)
                .map(il2cpp::api::Il2CppArray::to_vec::<Il2CppObject>)
                .unwrap_or_default()
        }
    }

    #[inline]
    pub fn get_metadata_token(&self) -> i32 {
        unsafe { MemberInfo(self.0).get_metadata_token().unwrap().unbox() }
    }
}

impl RuntimeType {
    #[inline]
    pub fn reflected_type_string(runtime_type: RuntimeType) -> Cow<'static, str> {
        let mut name = runtime_type.get_name().unwrap().as_str();
        if let Ok(reflected) = runtime_type.get_reflected_type()
            && !reflected.is_null()
            && !reflected.get_isgenerictype().unwrap().unbox()
        {
            name = Self::reflected_type_string(reflected) + "." + name;
        }
        name
    }

    #[inline]
    pub fn base_types(&self) -> Vec<RuntimeType> {
        let base_type = self
            .get_base_type()
            .ok()
            .filter(|base_type| !base_type.is_null());

        base_type.into_iter().chain(self.get_interfaces()).collect()
    }

    #[inline]
    pub fn all_fields(&self) -> Vec<FieldInfo> {
        let mut fields = self.get_fields(60);

        for base in self.base_types() {
            fields.extend(base.all_fields());
        }

        fields
    }

    #[inline]
    pub fn all_properties(&self) -> Vec<PropertyInfo> {
        let mut properties = self.get_properties(60);

        for base in self.base_types() {
            properties.extend(base.all_properties());
        }

        properties
    }

    pub fn format_type_name(&self, format_primitive: bool) -> String {
        if self.get_isbyref().unwrap().unbox() {
            let element = self.get_element_type();
            if let Ok(element) = element
                && !element.is_null()
            {
                return element.format_type_name(format_primitive) + "&";
            }
        }

        if self.get_isarray().unwrap().unbox() {
            let element = self.get_element_type();
            if let Ok(element) = element
                && !element.is_null()
            {
                return format!("{}[]", element.format_type_name(format_primitive));
            }
        }

        if self.get_ispointer().unwrap().unbox() {
            let element = self.get_element_type();
            if let Ok(element) = element
                && !element.is_null()
            {
                return element.format_type_name(format_primitive) + "*";
            }
        }

        if self.get_isgenerictype().unwrap().unbox() {
            let mut base_name = self
                .get_generic_type_definition()
                .unwrap()
                .get_name()
                .unwrap()
                .as_str();

            if let Some(pos) = base_name.find('`') {
                base_name = base_name[..pos].to_string().into();
            }

            let generic_args = self
                .get_generic_arguments()
                .iter()
                .map(|v| v.format_type_name(format_primitive))
                .collect::<Vec<_>>()
                .join(", ");

            return format!("{base_name}<{generic_args}>");
        }

        let il2cpp_type = self.get_il2cpp_type();
        if format_primitive && il2cpp_type.get_class().get_namespace() == "System" {
            match il2cpp_type.full_name().as_ref() {
                "System.Int32" => return String::from("int"),
                "System.UInt32" => return String::from("uint"),
                "System.Int16" => return String::from("short"),
                "System.UInt16" => return String::from("ushort"),
                "System.Int64" => return String::from("long"),
                "System.UInt64" => return String::from("ulong"),
                "System.Byte" => return String::from("byte"),
                "System.SByte" => return String::from("sbyte"),
                "System.Boolean" => return String::from("bool"),
                "System.Single" => return String::from("float"),
                "System.Double" => return String::from("double"),
                "System.String" => return String::from("string"),
                "System.Char" => return String::from("char"),
                "System.Object" => return String::from("object"),
                "System.Void" => return String::from("void"),
                "System.Decimal" => return String::from("decimal"),
                "System.DateTime" => return String::from("DateTime"),
                _ => {}
            }
        }

        Self::reflected_type_string(*self).to_string()
    }

    #[inline(always)]
    pub fn format_type_name_with_namespace(
        &self,
        format_primitive: bool,
        skip_system_type: bool,
    ) -> Cow<'static, str> {
        let formatted = self.format_type_name(format_primitive);
        let ns = self.get_namespace().unwrap();

        let ns = if ns.is_null() {
            self.get_il2cpp_type().get_class().get_namespace()
        } else {
            ns.as_str()
        };

        let ns = if ns.starts_with("System") && skip_system_type {
            String::new()
        } else {
            format!("{ns}{}", if ns.is_empty() { "" } else { "." })
        };

        Cow::Owned(format!("{ns}{formatted}"))
    }

    pub fn il_name(&self) -> Cow<'static, str> {
        self.get_il2cpp_type().il_name()
    }
}
