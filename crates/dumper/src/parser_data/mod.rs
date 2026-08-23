use std::{borrow::Cow, fs::File, sync::LazyLock};

use il2cpp::get_cached_class;
use reflection::runtime_type::RuntimeType;

mod data_json;
mod excel_mod_rs;
mod field_reorderer;
mod typeindex;
mod util;

static BINARY_READER_CLASS: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let lock_target_param_type =
        RuntimeType::from_class(get_cached_class("RPG.Client.LockTargetParam").unwrap()).unwrap();

    let method = lock_target_param_type
        .get_methods(62)
        .into_iter()
        .next()
        .unwrap();

    let class_name = method
        .get_parameters()
        .first()
        .unwrap()
        .get_parameter_type()
        .unwrap()
        .il_name();
    log::debug!("[Parser Data] BinaryReader Class => {class_name}");

    class_name
});

static FROM_BINARY_FUNC_NAME: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let lock_target_param_type =
        RuntimeType::from_class(get_cached_class("RPG.Client.LockTargetParam").unwrap()).unwrap();

    let method = lock_target_param_type
        .get_methods(62)
        .into_iter()
        .next()
        .unwrap();

    let method_name = method.get_name().unwrap().as_str();

    log::debug!("[Parser Data] FromBinary FuncName => {method_name}");

    method_name
});

#[allow(unused)]
pub fn dump() {
    log::debug!("[Parser Data] generating struct(s)");
    let _ = std::fs::create_dir_all("./DUMP/IL2CPP_Dumper");
    excel_mod_rs::gen_excel_structs(&mut File::create("./DUMP/IL2CPP_Dumper/mod.rs").unwrap());
    data_json::gen_types(
        &mut File::create("./DUMP/IL2CPP_Dumper/data.json").unwrap(),
        &mut File::create("./DUMP/IL2CPP_Dumper/excel_paths.json").unwrap(),
    );
    log::debug!("[Parser Data] struct(s) gen done!");
}
