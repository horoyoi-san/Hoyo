use std::{borrow::Cow, sync::LazyLock};

use il2cpp::{
    get_cached_class,
    vm::{object::Il2CppObject, string::Il2CppString},
};
use reflection::runtime_type::RuntimeType;

pub static GAME_VERSION: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let global_vars =
        RuntimeType::from_class(get_cached_class("RPG.Client.GlobalVars").unwrap()).unwrap();

    let version_data = global_vars
        .get_field("s_VersionData".into(), 62)
        .unwrap()
        .get_value(Il2CppObject::NULL)
        .unwrap();

    RuntimeType::from_object(version_data)
        .unwrap()
        .get_method("GetServerPakTypeVersion".into(), 62)
        .unwrap()
        .get_il2cpp_method()
        .invoke::<Il2CppString>(version_data, &[])
        .unwrap()
        .as_str()
});
