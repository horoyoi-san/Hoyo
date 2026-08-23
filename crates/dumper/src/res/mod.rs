use std::{borrow::Cow, sync::LazyLock, time::Duration};

use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use il2cpp::get_cached_class;
use reflection::runtime_type::RuntimeType;
use utils::game_assembly_slice;

mod config;
mod excel_output;
mod textmap;

pub static CONFIG_MANIFEST_TYPE_FIELD: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let skill_cut_in_type = RuntimeType::from_class(
        get_cached_class("RPG.Client.DiceCombat.DiceCombatBattleSkillCutInInfo").unwrap(),
    )
    .unwrap();

    let row_type = skill_cut_in_type
        .get_field("_Row".into(), 62)
        .unwrap()
        .get_field_type()
        .unwrap();

    for field in row_type.get_fields_il2cpp() {
        if field
            .get_field_type()
            .is_ok_and(|t| t.get_name().is_ok_and(|n| n.as_str() == "TextID"))
        {
            let name = field.get_name().unwrap().as_str();
            log::debug!("[Resources] TypeName => {name}");
            return name;
        }
    }

    log::debug!("[Resources] cant find TypeName field name");
    Cow::Borrowed("")
});

pub static CONFIG_MANIFEST_PATH_LIST_FIELD: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let config_manifest_type =
        RuntimeType::from_class(get_cached_class("RPG.GameCore.ConfigManifest").unwrap()).unwrap();

    let load_method = config_manifest_type
        .get_methods_il2cpp()
        .into_iter()
        .find(|m| m.get_name().unwrap().as_str() == "LoadManifestItemByFileDiscovery")
        .unwrap();

    let param_type = load_method
        .get_parameters()
        .into_iter()
        .next()
        .unwrap()
        .get_parameter_type()
        .unwrap();

    let ctor = param_type
        .get_methods_il2cpp()
        .into_iter()
        .find(|m| {
            m.get_name().unwrap().as_str() == ".ctor"
                && m.get_parameters().len() == 2
                && m.get_parameters()[1]
                    .get_parameter_type()
                    .is_ok_and(|t| t.il_name() == "System.String[]")
        })
        .unwrap();

    let rva = ctor.get_il2cpp_method().rva();
    let slice = game_assembly_slice();
    let mut decoder = Decoder::with_ip(
        64,
        &slice[rva..rva + 0x20],
        (*il2cpp::GA_BASE + rva) as u64,
        DecoderOptions::NONE,
    );

    let mut written_offsets = Vec::new();
    let mut instruction = Instruction::default();
    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);
        if instruction.mnemonic() == Mnemonic::Ret {
            break;
        }
        if instruction.mnemonic() == Mnemonic::Mov
            && instruction.op0_kind() == OpKind::Memory
            && instruction.memory_base() != Register::None
        {
            written_offsets.push(instruction.memory_displacement32() as usize);
        }
    }

    for field in param_type.get_fields_il2cpp() {
        if field
            .get_field_type()
            .is_ok_and(|t| t.il_name() == "System.String[]")
            && !written_offsets.contains(&field.get_offset())
        {
            let name = field.get_name().unwrap().as_str();
            log::debug!("[Resources] path_list => {name}");
            return name;
        }
    }

    log::debug!("[Resources] cant find path_list field name");
    Cow::Borrowed("")
});

pub static LOAD_METHOD_NAME: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let ty = RuntimeType::from_class(
        get_cached_class("EnviromentSystemV2Space.PropertyDataBase").unwrap(),
    )
    .unwrap();

    for method in ty.get_methods(62) {
        if method.get_parameters().is_empty() {
            let method_name = method.get_name().unwrap().as_str();
            log::debug!("[Resources] Load => {method_name}");
            return method_name;
        }
    }

    log::debug!("[Resources] failed to get 'Load' method name");
    Cow::Borrowed("")
});

#[allow(unused)]
pub fn dump() {
    LazyLock::force(&CONFIG_MANIFEST_TYPE_FIELD);
    LazyLock::force(&CONFIG_MANIFEST_PATH_LIST_FIELD);
    LazyLock::force(&LOAD_METHOD_NAME);

    log::debug!("[Resources] Starting dump...");
    textmap::dump();
    excel_output::dump();
    config::dump();
}
