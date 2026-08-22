use std::collections::HashMap;

use reflection::{attributes::MethodAttributes, runtime_type::RuntimeType};

pub fn get_battle_send_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let mapping = [
        ("<SendPVEBattleResultCsReq", "BattleOp"),
        ("<SendIdleLiveReplaceTeamCsReq", "KVP"),
    ];

    let Some(c_class) = il2cpp::get_cached_class("RPG.Client.NetworkManager.<>c")
        .and_then(|c| RuntimeType::from_class(c).ok())
    else {
        return map;
    };

    for method in c_class.get_methods_il2cpp() {
        if let (Ok(m_name), Ok(return_type)) = (method.get_name(), method.get_return_type()) {
            let m_str = m_name.as_str();
            let obf_name = return_type.il_name();
            if obf_name.len() == 11
                && obf_name.chars().all(char::is_uppercase)
                && let Some(deobf) = mapping
                    .iter()
                    .find_map(|(prefix, name)| m_str.starts_with(prefix).then_some(*name))
            {
                log::debug!("[Method NT] param nt: {obf_name} -> {deobf}");
                map.insert(obf_name.into_owned(), deobf.to_string());
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Method NT] failed to find battle send nt");
    }
    map
}

pub fn get_compare_repeated_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    const PREFIX: &str = "<_CompareRepeated";

    let handler = (start..max).find_map(|i| {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            return None;
        };

        let methods: Vec<_> = rt.get_methods_il2cpp();
        let has_npc = methods.iter().any(|m| {
            m.get_name()
                .is_ok_and(|n| n.as_str().contains("_CompareRepeatedGridFightNPCInfo"))
        });
        let has_avatar = methods.iter().any(|m| {
            m.get_name()
                .is_ok_and(|n| n.as_str().contains("_CompareRepeatedBattleAvatar"))
        });
        (has_npc && has_avatar).then_some(rt)
    });

    let Some(handler) = handler else {
        log::debug!("[Method NT] failed to find compare repeated nt");
        return map;
    };

    for method in handler.get_methods_il2cpp() {
        let params = method.get_parameters();
        if let (Ok(m_name), Some(param_type)) = (
            method.get_name(),
            params.first().and_then(|p| p.get_parameter_type().ok()),
        ) {
            let m_str = m_name.as_str();
            let obf_name = param_type.il_name();
            if obf_name.len() == 11
                && obf_name.chars().all(char::is_uppercase)
                && !map.contains_key(obf_name.as_ref())
                && let Some(inner) = m_str
                    .strip_prefix(PREFIX)
                    .and_then(|s| s.split('>').next())
                    .filter(|s| s.len() != 11 || !s.chars().all(char::is_uppercase))
            {
                log::debug!("[Method NT] param nt: {obf_name} -> {inner}");
                map.insert(obf_name.into_owned(), inner.to_string());
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Method NT] failed to find compare repeated nt");
    }
    map
}

pub fn get_battle_grid_fight_equip_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();

    let Some(c_class) = il2cpp::get_cached_class("RPG.Client.GridFightGameSession.<>c")
        .and_then(|c| RuntimeType::from_class(c).ok())
    else {
        return map;
    };

    for method in c_class.get_methods_il2cpp() {
        let params = method.get_parameters();
        if let (Ok(m_name), Some(param_type)) = (
            method.get_name(),
            params.first().and_then(|p| p.get_parameter_type().ok()),
        ) {
            let m_str = m_name.as_str();
            let obf_name = param_type.il_name();
            if obf_name.len() == 11
                && obf_name.chars().all(char::is_uppercase)
                && !map.contains_key(obf_name.as_ref())
                && m_str.contains("_AddStarChangedRoleToBattleChangeEvent")
            {
                log::debug!("[Method NT] param nt: {obf_name} -> BattleGridFightEquipInfo");
                map.insert(
                    obf_name.into_owned(),
                    "BattleGridFightEquipInfo".to_string(),
                );
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Method NT] failed to find BattleGridFightEquipInfo nt");
    }
    map
}

pub fn get_grid_fight_statistics_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();

    let stats_type = il2cpp::get_cached_class("RPG.GameCore.GridFightManager")
        .and_then(|c| RuntimeType::from_class(c).ok())
        .and_then(|rt| rt.get_property("GridFightStatistics".into(), 62).ok())
        .and_then(|p| p.get_property_type().ok());
    let Some(stats_type) = stats_type else {
        return map;
    };

    for method in stats_type.get_methods_il2cpp() {
        let params = method.get_parameters();
        if params.len() == 2
            && method.get_attributes().is_ok_and(|a| {
                a.unbox()
                    .contains(MethodAttributes::Public | MethodAttributes::Static)
            })
            && let Ok(p0) = params[0].get_parameter_type()
        {
            let obf_name = p0.il_name();
            if obf_name.len() == 11
                && obf_name.chars().all(char::is_uppercase)
                && !map.contains_key(obf_name.as_ref())
            {
                log::debug!("[Method NT] param nt: {obf_name} -> GridFightInfo");
                map.insert(obf_name.into_owned(), "GridFightInfo".to_string());
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Method NT] failed to find GridFightInfo nt");
    }
    map
}
