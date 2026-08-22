use std::collections::HashMap;

use reflection::{attributes::MethodAttributes, runtime_type::RuntimeType};

pub fn get_scene_prop_info_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();

    let Some(prop_def) = il2cpp::get_cached_class("RPG.Client.MapPropDef")
        .and_then(|c| RuntimeType::from_class(c).ok())
    else {
        return map;
    };

    for ctor in prop_def
        .get_methods_il2cpp()
        .into_iter()
        .filter(|m| m.get_name().is_ok_and(|n| n.as_str() == ".ctor"))
    {
        let params = ctor.get_parameters();
        if params.len() > 10
            && let Ok(param_type) = params[10].get_parameter_type()
        {
            let obf_name = param_type.il_name();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> ScenePropInfo");
                map.insert(obf_name.into_owned(), "ScenePropInfo".to_string());
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Method NT] failed to find scene prop info nt");
    }
    map
}

pub fn get_maze_prop_state_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();

    let strategy_type = il2cpp::get_cached_class("RPG.Client.NavMap.MapData")
        .and_then(|c| RuntimeType::from_class(c).ok())
        .and_then(|rt| rt.get_field("_CrossMapDataStrategy".into(), 62).ok())
        .and_then(|f| f.get_field_type().ok());
    let Some(strategy_type) = strategy_type else {
        return map;
    };

    for method in strategy_type.get_methods_il2cpp() {
        let params = method.get_parameters();
        if params.len() == 2
            && method
                .get_attributes()
                .is_ok_and(|a| a.unbox().contains(MethodAttributes::Private))
            && let Ok(p0) = params[0].get_parameter_type()
        {
            let obf_name = p0
                .get_generic_arguments()
                .into_iter()
                .next()
                .map(|t| t.il_name())
                .filter(|n| n.len() == 11 && n.chars().all(char::is_uppercase));
            if let Some(name) = obf_name {
                log::debug!("[Method NT] param nt: {name} -> MazePropState");
                map.insert(name.into_owned(), "MazePropState".to_string());
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Method NT] failed to find MazePropState nt");
    }
    map
}

pub fn get_scene_monster_wave_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();

    let monster_reward_type = il2cpp::get_cached_class("RPG.GameCore.LineUpContext")
        .and_then(|c| RuntimeType::from_class(c).ok())
        .and_then(|rt| rt.get_field("MonsterRewardList".into(), 62).ok())
        .and_then(|f| f.get_field_type().ok());
    let Some(monster_reward_type) = monster_reward_type else {
        return map;
    };
    let reward_class = monster_reward_type
        .get_generic_arguments()
        .into_iter()
        .next()
        .or_else(|| monster_reward_type.get_element_type().ok())
        .unwrap_or(monster_reward_type)
        .get_il2cpp_type()
        .get_class()
        .0;

    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    let handler_class = (start..max).find_map(|i| {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            return None;
        };
        let has_field = rt.get_fields_il2cpp().iter().any(|f| {
            f.get_field_type()
                .ok()
                .and_then(|t| {
                    t.get_generic_arguments()
                        .into_iter()
                        .next()
                        .map(|g| g.il_name().contains("BattleRogueMagicData.Scepter"))
                })
                .unwrap_or(false)
        });
        has_field
            .then(|| {
                let name = rt.il_name();
                name.rsplit_once(".<>O")
                    .map(|(prefix, _)| prefix.to_string())
            })
            .flatten()
    });

    let Some(handler_rt) = handler_class
        .as_ref()
        .and_then(|c| il2cpp::get_cached_class(c))
        .and_then(|c| RuntimeType::from_class(c).ok())
    else {
        return map;
    };

    for method in handler_rt.get_methods_il2cpp() {
        let params = method.get_parameters();
        if let (Ok(return_type), Some(param_type)) = (
            method.get_return_type(),
            params.first().and_then(|p| p.get_parameter_type().ok()),
        ) {
            let obf_name = param_type
                .get_generic_arguments()
                .into_iter()
                .next().map_or_else(|| param_type.il_name(), |t| t.il_name());
            if obf_name.len() == 11
                && obf_name.chars().all(char::is_uppercase)
                && return_type
                    .get_element_type()
                    .is_ok_and(|e| e.0 != 0 && e.get_il2cpp_type().get_class().0 == reward_class)
            {
                log::debug!("[Method NT] param nt: {obf_name} -> SceneMonsterReward");
                map.insert(obf_name.into_owned(), "SceneMonsterReward".to_string());
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Method NT] failed to find SceneMonsterReward nt");
    }
    map
}
