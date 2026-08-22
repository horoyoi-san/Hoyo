use il2cpp::vm::value::Il2CppValue;
use reflection::runtime_type::RuntimeType;
use std::collections::BTreeSet;

pub fn recursive(ty: RuntimeType, out: &mut BTreeSet<RuntimeType>) {
    if out.contains(&ty) || ty.is_null() {
        return;
    }

    out.insert(ty);

    for field in ty.all_fields() {
        let field_type = field.get_field_type().unwrap();
        if field_type == ty {
            continue;
        }

        let generics = field_type.get_generic_arguments();
        if field_type.get_isarray().unwrap().unbox() {
            let element_type = field_type.get_element_type().unwrap();
            if !element_type.is_null() {
                recursive(field_type.get_element_type().unwrap(), out);
            }
        } else if generics.len() == 2 {
            recursive(generics[1], out);
        } else {
            recursive(field_type, out);
        }
    }
}
