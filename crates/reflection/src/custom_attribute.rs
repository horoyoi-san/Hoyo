use std::borrow::Cow;

use il2cpp::vm::{object::Il2CppObject, value::Il2CppValue};

use crate::{runtime_type::RuntimeType, serializer::BoxedSerializer};

#[inline]
fn remove_backing_field(input: Cow<'static, str>) -> String {
    if let Some(pos) = input.find('>') {
        input[1..pos].to_string()
    } else {
        input.into_owned()
    }
}

pub fn format_custom_atrributes(attrs: Vec<Il2CppObject>) -> String {
    if !attrs.is_empty() {
        microseh::try_seh(|| {
            let mut serializer = BoxedSerializer::default();
            attrs
                .iter()
                .filter(|v| !v.is_null())
                .filter_map(|attr| {
                    let attr_type = RuntimeType::from_object(*attr).ok()?;
                    let attr_name = attr_type.get_name().ok()?.as_str().replace("Attribute", "");
                    let properties = attr_type
                        .get_fields(52) // Public | NonPublic | Instance
                        .iter()
                        .filter_map(|v| {
                            Some(format!(
                                "{} = {}",
                                remove_backing_field(v.get_name().ok()?.as_str()),
                                serializer
                                    .serialize(v.get_field_type().ok()?, v.get_value(*attr).ok()?)
                                    .ok()?
                            ))
                        })
                        .collect::<Vec<_>>()
                        .join(", ");

                    let properties = if properties.is_empty() {
                        ""
                    } else {
                        &format!("({properties})")
                    };

                    Some(format!("[{attr_name}{properties}]"))
                })
                .collect::<Vec<_>>()
                .join("\n")
                + "\n"
        })
        .unwrap_or_default()
    } else {
        String::new()
    }
}
