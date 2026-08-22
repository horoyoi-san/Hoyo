mod boxed_serializer;
mod newtonsoft_serializer;

use std::{sync::OnceLock, time::Duration};

use il2cpp::{
    CLASS_TABLE_VEC, get_cached_class,
    vm::{metadata_cache, value::Il2CppValue},
};

use crate::runtime_type::RuntimeType;

pub use boxed_serializer::BoxedSerializer;
pub use newtonsoft_serializer::NewtonsoftSerializer;

static POSTFIX_EXPR_TYPE: OnceLock<RuntimeType> = OnceLock::new();
static DYNAMIC_VALUES_TYPE: OnceLock<RuntimeType> = OnceLock::new();

pub fn load() {
    let _ = postfix_expr_type();
    let _ = dynamic_values_type();
}

pub fn postfix_expr_type() -> RuntimeType {
    *POSTFIX_EXPR_TYPE.get_or_init(|| {
        let op_code_class = get_cached_class("RPG.Expression.OpCode").unwrap();
        let Some(op_code_class_idx) = CLASS_TABLE_VEC
            .get()
            .unwrap()
            .iter()
            .position(|&v| v == op_code_class)
        else {
            log::debug!("[Boxed Serializer] failed to get RPG.Expression.OpCode");
            std::thread::sleep(Duration::from_secs(u64::MAX));
            return RuntimeType(0);
        };

        let postfix_expr_class =
            metadata_cache::get_typeinfo_from_typedefindex((op_code_class_idx + 2) as u32);

        if postfix_expr_class.get_fields().len() != 3 {
            log::debug!("[Boxed Serializer] PostfixExpr class ordering is changed!");
            std::thread::sleep(Duration::from_secs(u64::MAX));
            return RuntimeType(0);
        }

        log::debug!(
            "[Boxed Serializer] PostfixExpr => {}",
            postfix_expr_class.byval_arg().il_name()
        );

        RuntimeType::from_class(postfix_expr_class).unwrap()
    })
}

pub fn dynamic_values_type() -> RuntimeType {
    *DYNAMIC_VALUES_TYPE.get_or_init(|| {
        let base_modifier_inst_type =
            RuntimeType::from_class(get_cached_class("RPG.GameCore.BaseModifierInstance").unwrap())
                .unwrap();

        let dynamic_values_prop = base_modifier_inst_type
            .get_property("DynamicValues".into(), 62)
            .unwrap();

        if dynamic_values_prop.is_null() {
            log::debug!(
                "[Boxed Serializer] cannot find DynamicValues property! might be obfuscated now"
            );
            std::thread::sleep(Duration::from_secs(u64::MAX));
            return RuntimeType(0);
        }

        let property_type = dynamic_values_prop.get_property_type().unwrap();

        log::debug!(
            "[Boxed Serializer] DynamicValues => {}",
            property_type.il_name()
        );

        property_type
    })
}
