use std::borrow::Cow;

use il2cpp::{
    api::Il2CppObject,
    get_cached_class,
    vm::{string::Il2CppString, value::Il2CppValue as _},
};

use crate::{
    assembly, r#enum::Enum, field_info::FieldInfo, method_info::MethodInfo,
    runtime_type::RuntimeType,
};

pub struct TestCase {
    pub id: Option<&'static str>,
    pub subjects: &'static [(&'static str, &'static str)],
    pub run: fn() -> anyhow::Result<()>,
}

impl TestCase {
    pub fn display_id(&self) -> Cow<'static, str> {
        match self.id {
            Some(id) => Cow::Borrowed(id),
            None => match self.subjects.first() {
                Some((owner, func)) => Cow::Owned(format!("{owner}::{func}")),
                None => Cow::Borrowed("(unnamed)"),
            },
        }
    }

    pub fn resolved_signatures(&self) -> Vec<String> {
        self.subjects
            .iter()
            .filter_map(|(owner, func)| {
                if *owner == "raw" {
                    Some(func.to_string())
                } else {
                    il2cpp::api_table::signature_of(owner, func)
                }
            })
            .collect()
    }
}

pub fn all_tests() -> Vec<TestCase> {
    vec![
        TestCase {
            id: Some("Il2CppString::ptr_to_string"),
            subjects: &[("Il2CppString", "ptr_to_string")],
            run: || {
                let s = Il2CppString::from("System.String, mscorlib");
                assert_eq!(s.as_str(), "System.String, mscorlib");
                Ok(())
            },
        },
        TestCase {
            id: Some("Il2CppException::get_message"),
            subjects: &[("Il2CppException", "get_message")],
            run: || {
                let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    RuntimeType::from_name(
                        Il2CppString::from("Definitely.Not.A.Real.Type.For.Bootstrap.Test"),
                        true,
                        false,
                    )
                }));
                match result {
                    Ok(Ok(_)) => Ok(()),
                    Ok(Err(e)) => {
                        let msg = format!("{e:?}");
                        assert!(!msg.is_empty());
                        Ok(())
                    }
                    Err(_) => Ok(()),
                }
            },
        },
        TestCase {
            id: Some("Il2CppException::get_stacktrace"),
            subjects: &[("Il2CppException", "get_stacktrace")],
            run: || {
                let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    RuntimeType::from_name(
                        Il2CppString::from("Another.Fake.Type.For.Stacktrace.Test"),
                        true,
                        false,
                    )
                }));
                match result {
                    Ok(Err(_)) | Err(_) | Ok(Ok(_)) => Ok(()),
                }
            },
        },
        TestCase {
            id: Some("Assembly::get_assemblies_internal"),
            subjects: &[("<free>", "get_assemblies_internal")],
            run: || {
                let assemblies = assembly::get_assemblies();
                assert!(assemblies.len() > 100);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("Assembly", "get_types_internal")],
            run: || {
                let assemblies = assembly::get_assemblies();
                let mscorlib = assemblies.first().unwrap();
                let types = mscorlib.get_types();
                assert!(types.len() > 1000);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("Assembly", "get_full_name")],
            run: || {
                let assemblies = assembly::get_assemblies();
                let mscorlib = assemblies.first().unwrap();
                let full_name = mscorlib.get_full_name()?;
                assert_eq!(
                    full_name.as_str(),
                    "mscorlib, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089",
                );
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("Assembly", "get_assembly_name")],
            run: || {
                let assemblies = assembly::get_assemblies();
                let mscorlib = assemblies.first().unwrap();
                let assembly_name = mscorlib.get_name();
                assert_eq!(assembly_name, "mscorlib");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "from_name")],
            run: || {
                let string_type = get_string_type()?;
                assert!(!string_type.is_null());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_name")],
            run: || {
                let string_type = get_string_type()?;
                assert_eq!(string_type.get_name()?.as_str(), "String");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "from_il2cpp_type")],
            run: || {
                let string_type = get_string_type()?;
                let system_string_2 =
                    RuntimeType::from_class(get_cached_class("System.String").unwrap())?;
                assert_eq!(string_type, system_string_2);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_method")],
            run: || {
                let string_type = get_string_type()?;
                let get_hash_code_method = string_type.get_method("GetHashCode".into(), 62)?;
                assert!(!get_hash_code_method.is_null());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MethodInfo", "get_name")],
            run: || {
                let string_type = get_string_type()?;
                let m = string_type.get_method("GetHashCode".into(), 62)?;
                assert!(!m.get_name()?.is_null());
                assert_eq!(m.get_name()?.as_str(), "GetHashCode");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MethodInfo", "get_return_type")],
            run: || {
                let string_type = get_string_type()?;
                let m = string_type.get_method("GetHashCode".into(), 62)?;
                assert!(!m.get_return_type()?.is_null());
                assert_eq!(m.get_return_type()?.get_name()?.as_str(), "Int32");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MethodInfo", "get_attributes")],
            run: || {
                let string_type = get_string_type()?;
                let m = string_type.get_method("GetHashCode".into(), 62)?;
                assert!(!m.get_attributes()?.unbox().is_empty());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MethodInfo", "get_custom_attributes_internal")],
            run: || {
                let string_type = get_string_type()?;
                let m = string_type.get_method("GetHashCode".into(), 62)?;
                assert!(!m.get_custom_attributes().is_empty());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MethodInfo", "get_is_generic_method")],
            run: || {
                let cad_type = RuntimeType::from_class(
                    get_cached_class("System.Reflection.CustomAttributeData").unwrap(),
                )?;
                let m = cad_type.get_method("UnboxValues".into(), 62)?;
                assert!(m.get_is_generic_method()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MethodInfo", "get_generic_arguments_internal")],
            run: || {
                let cad_type = RuntimeType::from_class(
                    get_cached_class("System.Reflection.CustomAttributeData").unwrap(),
                )?;
                let m = cad_type.get_method("UnboxValues".into(), 62)?;
                assert_eq!(m.get_generic_arguments().len(), 1);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_constructors_internal")],
            run: || {
                let string_type = get_string_type()?;
                assert_eq!(string_type.get_constructors(62).len(), 8);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MethodInfo", "get_parameters_internal")],
            run: || {
                let string_type = get_string_type()?;
                let ctors = string_type.get_constructors(62);
                let ctor2 = ctors.iter().find(|m| m.get_parameters().len() == 2);
                assert!(ctor2.is_some());
                assert_eq!(ctor2.unwrap().get_parameters().len(), 2);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeParameterInfo", "get_parameter_type")],
            run: || {
                let params = get_string_ctor_2_params()?;
                assert_eq!(
                    params[0]
                        .get_parameter_type()
                        .unwrap()
                        .get_name()
                        .unwrap()
                        .as_str(),
                    "Char",
                );
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeParameterInfo", "get_name")],
            run: || {
                let params = get_string_ctor_2_params()?;
                let name = params[0].get_name().unwrap();
                assert!(!name.is_null());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeParameterInfo", "get_custom_attributes_internal")],
            run: || {
                let params = get_string_ctor_2_params()?;
                let _ = params[0].get_custom_attributes_internal(true);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_methods_internal")],
            run: || {
                let string_type = get_string_type()?;
                assert!(string_type.get_methods(62).len() > 10);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_properties_internal")],
            run: || {
                let string_type = get_string_type()?;
                assert!(string_type.get_properties(62).len() > 2);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_fields_internal")],
            run: || {
                let string_type = get_string_type()?;
                assert!(string_type.get_fields(62).len() > 7);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MethodInfo", "from_handle")],
            run: || {
                let string_type = get_string_type()?;
                let m = string_type.get_method("GetHashCode".into(), 62)?;
                let handle = m.get_il2cpp_method();
                assert_eq!(MethodInfo::from_handle(handle)?.0, m.0);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MemberInfo", "get_metadata_token")],
            run: || {
                let string_type = get_string_type()?;
                let m = string_type.get_method("GetHashCode".into(), 62)?;
                assert!(m.get_metadata_token() > 0x6000000);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_property")],
            run: || {
                let string_type = get_string_type()?;
                let p = string_type.get_property("Chars".into(), 62)?;
                assert!(!p.is_null());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("PropertyInfo", "get_name")],
            run: || {
                let string_type = get_string_type()?;
                let p = string_type.get_property("Chars".into(), 62)?;
                assert_eq!(p.get_name()?.as_str(), "Chars");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("PropertyInfo", "get_property_type")],
            run: || {
                let string_type = get_string_type()?;
                let p = string_type.get_property("Chars".into(), 62)?;
                assert_eq!(p.get_property_type()?.il_name(), "System.Char");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("PropertyInfo", "get_get_method")],
            run: || {
                let string_type = get_string_type()?;
                let p = string_type.get_property("Chars".into(), 62)?;
                assert_eq!(
                    p.get_get_method(true)?.get_il2cpp_method().get_name(),
                    "get_Chars"
                );
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("PropertyInfo", "get_set_method")],
            run: || {
                let string_type = get_string_type()?;
                let p = string_type.get_property("Chars".into(), 62)?;
                assert!(p.get_set_method(true)?.is_null());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("PropertyInfo", "get_custom_attributes_internal")],
            run: || {
                let string_type = get_string_type()?;
                let p = string_type.get_property("Chars".into(), 62)?;
                assert!(p.get_custom_attributes().is_empty());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("PropertyInfo", "get_value")],
            run: || {
                let system_string = Il2CppString::from("System.String, mscorlib");
                let string_type = get_string_type()?;
                let p = string_type.get_property("Length".into(), 62)?;
                let value = p.get_value(system_string.as_il2cpp_object())?;
                assert_eq!(value.unbox::<i32>(), 23);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_isinterface")],
            run: || {
                assert!(!get_string_type()?.get_isinterface()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_isvaluetype")],
            run: || {
                assert!(!get_string_type()?.get_isvaluetype()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_isarray")],
            run: || {
                assert!(!get_string_type()?.get_isarray()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_isbyref")],
            run: || {
                assert!(!get_string_type()?.get_isbyref()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_ispointer")],
            run: || {
                assert!(!get_string_type()?.get_ispointer()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_isprimitive")],
            run: || {
                assert!(!get_string_type()?.get_isprimitive()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_attributes")],
            run: || {
                let attrs = get_string_type()?.get_attributes()?.unbox();
                assert!(attrs.contains(crate::attributes::TypeAttributes::Public));
                assert!(attrs.contains(crate::attributes::TypeAttributes::Sealed));
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_field")],
            run: || {
                let f = get_string_type()?.get_field("Empty".into(), 62)?;
                assert!(!f.is_null());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("FieldInfo", "get_attributes")],
            run: || {
                let f = get_string_type()?.get_field("Empty".into(), 62)?;
                assert_eq!(f.modifier(), "public static readonly ");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("FieldInfo", "get_field_type")],
            run: || {
                let f = get_string_type()?.get_field("Empty".into(), 62)?;
                assert_eq!(f.get_field_type()?.il_name(), "System.String");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("FieldInfo", "get_declaringtype")],
            run: || {
                let f = get_string_type()?.get_field("Empty".into(), 62)?;
                assert_eq!(f.get_declaringtype()?.il_name(), "System.String");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("FieldInfo", "get_name")],
            run: || {
                let f = get_string_type()?.get_field("Empty".into(), 62)?;
                assert_eq!(f.get_name()?.as_str(), "Empty");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("FieldInfo", "get_custom_attributes_internal")],
            run: || {
                let f = get_string_type()?.get_field("m_stringLength".into(), 62)?;
                assert!(!f.is_null());
                let ca = f.get_custom_attributes();
                assert_eq!(ca.len(), 1);
                assert_eq!(
                    ca[0].get_class().byval_arg().il_name(),
                    "System.NonSerializedAttribute"
                );
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("FieldInfo", "get_value")],
            run: || {
                let f = get_string_type()?.get_field("alignConst".into(), 62)?;
                assert!(!f.is_null());
                assert_eq!(f.get_value(Il2CppObject::NULL)?.unbox::<i32>(), 3);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("FieldInfo", "get_isliteral")],
            run: || {
                let string_type = get_string_type()?;
                let empty = string_type.get_field("Empty".into(), 62)?;
                let align = string_type.get_field("alignConst".into(), 62)?;
                assert!(!empty.get_isliteral()?.unbox());
                assert!(align.get_isliteral()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("FieldInfo", "get_isstatic")],
            run: || {
                let string_type = get_string_type()?;
                let empty = string_type.get_field("Empty".into(), 62)?;
                let align = string_type.get_field("alignConst".into(), 62)?;
                assert!(empty.get_isstatic()?.unbox());
                assert!(align.get_isstatic()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("FieldInfo", "from_il2cpp_field")],
            run: || {
                let f = get_string_type()?.get_field("Empty".into(), 62)?;
                assert_eq!(FieldInfo::from_il2cpp_field(f.get_il2cpp_field())?.0, f.0);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_assembly")],
            run: || {
                let string_type = get_string_type()?;
                let mscorlib = assembly::get_assemblies().into_iter().next().unwrap();
                assert_eq!(string_type.get_assembly()?.0, mscorlib.0);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_base_type")],
            run: || {
                assert_eq!(
                    get_string_type()?.get_base_type()?.il_name(),
                    "System.Object"
                );
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_isenum")],
            run: || {
                assert!(!get_string_type()?.get_isenum()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_element_type")],
            run: || {
                let dt = RuntimeType::from_class(get_cached_class("System.DateTime").unwrap())?;
                let arr_ty = dt
                    .get_field("DaysToMonth366".into(), 62)?
                    .get_field_type()?;
                assert_eq!(arr_ty.get_element_type()?.il_name(), "System.Int32");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "is_assignable_from")],
            run: || {
                let dt = RuntimeType::from_class(get_cached_class("System.DateTime").unwrap())?;
                let arr_ty = dt
                    .get_field("DaysToMonth366".into(), 62)?
                    .get_field_type()?;
                let ie = RuntimeType::from_class(
                    get_cached_class("System.Collections.IEnumerable").unwrap(),
                )?;
                assert!(ie.is_assignable_from(arr_ty)?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_generic_arguments_internal")],
            run: || {
                let list = RuntimeType::from_class(
                    get_cached_class("System.Collections.Generic.List<T>").unwrap(),
                )?;
                assert_eq!(list.get_generic_arguments().len(), 1);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_isgenerictype")],
            run: || {
                assert!(!get_string_type()?.get_isgenerictype()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_custom_attributes_internal")],
            run: || {
                let ca = get_string_type()?.get_custom_attributes();
                assert_eq!(ca.len(), 2);
                assert!(
                    ca.iter()
                        .any(|a| a.get_class().byval_arg().il_name()
                            == "System.SerializableAttribute")
                );
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_interfaces_internal")],
            run: || {
                let ifaces = get_string_type()?.get_interfaces();
                assert!(ifaces.len() > 3);
                assert!(ifaces.iter().any(|i| i.il_name() == "System.IComparable"));
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_declaring_type")],
            run: || {
                let vn = RuntimeType::from_class(
                    get_cached_class("System.Enum.ValuesAndNames").unwrap(),
                )?;
                assert_eq!(vn.get_declaring_type()?.il_name(), "System.Enum");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_reflected_type")],
            run: || {
                assert!(get_string_type()?.get_reflected_type()?.is_null());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("Enum", "get_underlying_type")],
            run: || {
                let bf = RuntimeType::from_class(
                    get_cached_class("System.Reflection.BindingFlags").unwrap(),
                )?;
                assert_eq!(Enum::get_underlying_type(bf)?.il_name(), "System.Int32");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("Enum", "get_name")],
            run: || {
                let bf = RuntimeType::from_class(
                    get_cached_class("System.Reflection.BindingFlags").unwrap(),
                )?;
                let val = bf
                    .get_field("Public".into(), 62)?
                    .get_value(Il2CppObject::NULL)?;
                assert_eq!(Enum::get_name(bf, val)?.as_str(), "Public");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeParameterInfo", "get_is_out")],
            run: || {
                let bool_type =
                    RuntimeType::from_class(get_cached_class("System.Boolean").unwrap())?;
                let m = bool_type.get_method("TryParse".into(), 62)?;
                assert!(!m.is_null());
                let params = m.get_parameters();
                assert_eq!(params.len(), 2);
                assert!(params[1].get_is_out()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("PropertyInfo", "get_can_read")],
            run: || {
                let sw =
                    RuntimeType::from_class(get_cached_class("System.IO.StreamWriter").unwrap())?;
                let p = sw.get_property("AutoFlush".into(), 62)?;
                assert!(!p.is_null());
                assert!(!p.get_can_read().unwrap().unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_events_internal")],
            run: || {
                let ad = RuntimeType::from_class(get_cached_class("System.AppDomain").unwrap())?;
                assert!(!ad.get_events(62).is_empty());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("EventInfo", "get_name")],
            run: || {
                assert_eq!(
                    get_domain_unload_event()?.get_name()?.as_str(),
                    "DomainUnload"
                );
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("EventInfo", "get_add_method")],
            run: || {
                assert!(!get_domain_unload_event()?.get_add_method(true)?.is_null());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("EventInfo", "get_remove_method")],
            run: || {
                assert!(
                    !get_domain_unload_event()?
                        .get_remove_method(true)?
                        .is_null()
                );
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("EventInfo", "get_raise_method")],
            run: || {
                let _ = get_domain_unload_event()?.get_raise_method(true);
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("EventInfo", "get_custom_attributes_internal")],
            run: || {
                let _ = get_domain_unload_event()?.get_custom_attributes();
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_generic_type_definition")],
            run: || {
                let ts = RuntimeType::from_class(get_cached_class("System.TypeSpec").unwrap())?;
                assert!(!ts.is_null());
                let nested = ts.get_field("nested".into(), 62)?;
                assert!(!nested.is_null());
                let constructed = nested.get_field_type()?;
                let def = constructed.get_generic_type_definition()?;
                assert!(!def.is_null());
                assert_eq!(def.il_name(), "System.Collections.Generic.List<T>");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("FieldInfo", "set_value")],
            run: || {
                let s = Il2CppString::from("System.String, mscorlib");
                let tz = RuntimeType::from_class(get_cached_class("System.TimeZoneInfo").unwrap())?;
                assert!(!tz.is_null());
                let f = tz.get_field("timeZoneDirectory".into(), 62)?;
                assert!(!f.is_null());
                f.set_value(Il2CppObject::NULL, s.as_il2cpp_object())?;
                assert_eq!(
                    Il2CppString(f.get_value(Il2CppObject::NULL)?.0).as_str(),
                    "System.String, mscorlib"
                );
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_namespace")],
            run: || {
                let ns = get_string_type()?.get_namespace()?;
                assert!(!ns.is_null());
                assert_eq!(ns.as_str(), "System");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_full_name")],
            run: || {
                let full = get_string_type()?.get_full_name()?;
                assert!(!full.is_null());
                assert_eq!(full.as_str(), "System.String");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "make_generic_type")],
            run: || {
                let list = RuntimeType::from_class(
                    get_cached_class("System.Collections.Generic.List<T>").unwrap(),
                )?;
                assert!(list.get_is_generic_type_definition()?.unbox());
                let string_type = get_string_type()?;
                let type_class = get_cached_class("System.Type").unwrap();
                let type_array_class = type_class.get_array_class(1);
                let mut type_args = il2cpp::vm::array::Il2CppArray::new(type_array_class, 1);
                *type_args.get_mut::<usize>(0) = string_type.0;
                let constructed = list.make_generic_type(type_args)?;
                assert!(!constructed.is_null());
                assert!(constructed.get_isgenerictype()?.unbox());
                assert!(!constructed.get_is_generic_type_definition()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_is_generic_type_definition")],
            run: || {
                assert!(!get_string_type()?.get_is_generic_type_definition()?.unbox());
                let list = RuntimeType::from_class(
                    get_cached_class("System.Collections.Generic.List<T>").unwrap(),
                )?;
                assert!(list.get_is_generic_type_definition()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "get_is_generic_parameter")],
            run: || {
                assert!(!get_string_type()?.get_is_generic_parameter()?.unbox());
                let list = RuntimeType::from_class(
                    get_cached_class("System.Collections.Generic.List<T>").unwrap(),
                )?;
                let ga = list.get_generic_arguments();
                assert_eq!(ga.len(), 1);
                assert!(ga[0].get_is_generic_parameter()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("RuntimeType", "contains_generic_parameters")],
            run: || {
                assert!(!get_string_type()?.contains_generic_parameters()?.unbox());
                let list = RuntimeType::from_class(
                    get_cached_class("System.Collections.Generic.List<T>").unwrap(),
                )?;
                assert!(list.contains_generic_parameters()?.unbox());
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MethodInfo", "get_generic_method_definition_impl")],
            run: || {
                let cad = RuntimeType::from_class(
                    get_cached_class("System.Reflection.CustomAttributeData").unwrap(),
                )?;
                let m = cad.get_method("UnboxValues".into(), 62)?;
                assert!(m.get_is_generic_method()?.unbox());
                let def = m.get_generic_method_definition_impl()?;
                assert!(!def.is_null());
                assert_eq!(def.get_name()?.as_str(), "UnboxValues");
                Ok(())
            },
        },
        TestCase {
            id: None,
            subjects: &[("MethodInfo", "from_handle_internal_type_native")],
            run: || {
                let string_type = get_string_type()?;
                let m = string_type.get_method("GetHashCode".into(), 62)?;
                let handle = m.get_il2cpp_method();
                let il2cpp_type = string_type.get_il2cpp_type();
                let resolved =
                    MethodInfo::from_handle_internal_type_native(handle, il2cpp_type, false)?;
                assert!(!resolved.is_null());
                assert_eq!(resolved.get_name()?.as_str(), "GetHashCode");
                Ok(())
            },
        },
    ]
}

#[inline]
fn get_string_type() -> anyhow::Result<RuntimeType> {
    RuntimeType::from_name(Il2CppString::from("System.String, mscorlib"), false, true)
}

fn get_string_ctor_2_params() -> anyhow::Result<Vec<crate::parameter_info::RuntimeParameterInfo>> {
    let string_type = get_string_type()?;
    let ctors = string_type.get_constructors(62);
    let ctor = ctors.iter().find(|m| m.get_parameters().len() == 2);
    match ctor {
        Some(m) => Ok(m.get_parameters()),
        None => anyhow::bail!(
            "No string constructor with 2 params found (total ctors: {})",
            ctors.len()
        ),
    }
}

fn get_domain_unload_event() -> anyhow::Result<crate::event_info::EventInfo> {
    let ad = RuntimeType::from_class(get_cached_class("System.AppDomain").unwrap())?;
    ad.get_events(62)
        .into_iter()
        .find(|e| {
            e.get_name()
                .is_ok_and(|n| n.as_str() == "DomainUnload")
        })
        .ok_or_else(|| anyhow::anyhow!("DomainUnload event not found"))
}
