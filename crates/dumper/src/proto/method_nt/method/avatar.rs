use std::{borrow::Cow, collections::HashMap, sync::LazyLock};

use reflection::runtime_type::RuntimeType;

const TARGET_PROPERTY: &str = "System.Collections.Generic.IEnumerator<System.ValueTuple<RPG.GameCore.RelicType,RPG.AvatarSystem.IRelicProxy>>.Current";

pub static AVATAR_HANDLER_CLASS: LazyLock<Cow<'static, str>> = LazyLock::new(|| {
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        let has_prop = rt
            .get_properties(62)
            .iter()
            .any(|p| p.get_name().is_ok_and(|n| n.as_str() == TARGET_PROPERTY));
        if !has_prop {
            continue;
        }

        let has_unique = rt
            .get_fields_il2cpp()
            .iter()
            .any(|f| f.get_name().is_ok_and(|n| n.as_str() == "uniqueData"));
        if !has_unique {
            continue;
        }

        let name = rt.il_name();
        if let Some(stripped) = name.split('.').next() {
            let result = stripped.to_string();
            log::debug!("[Method NT] AvatarHandlerClass => {result}");
            return Cow::Owned(result);
        }
    }

    log::debug!("[Method NT] failed to find AvatarHandlerClass");
    std::thread::sleep(std::time::Duration::from_millis(u64::MAX));
    Cow::Borrowed("")
});

pub fn get_avatar_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let handler_class_name = &*AVATAR_HANDLER_CLASS;
    if handler_class_name.is_empty() {
        return map;
    }

    let Some(class) = il2cpp::get_cached_class(handler_class_name) else {
        return map;
    };
    let Ok(rt) = RuntimeType::from_class(class) else {
        return map;
    };

    for method in rt.get_methods_il2cpp() {
        let params = method.get_parameters();

        if params.len() == 1
            && let Ok(param_type) = params[0].get_parameter_type()
            && let Ok(return_type) = method.get_return_type()
        {
            let ret_name = return_type.il_name();
            if !ret_name.contains("IEnumerable") {
                continue;
            }
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                map.insert(obf_name, "AvatarPathData".to_string());
            }
        }
    }

    for method in rt.get_methods_il2cpp() {
        if method.get_parameters().len() == 2
            && let Ok(p2_type) = method.get_parameters()[1].get_parameter_type()
        {
            let obf_name = p2_type.il_name().into_owned();
            if obf_name.len() == 11
                && obf_name.chars().all(char::is_uppercase)
                && !map.contains_key(&obf_name)
            {
                log::debug!("[Method NT] param nt: {obf_name} -> Avatar");
                map.insert(obf_name, "Avatar".to_string());
            }
        }
    }

    if map.is_empty() {
        log::debug!("[Method NT] failed to find avatar nt");
    }
    map
}

// dont ask me why make shit like this
// why not code as get_challenge_tierce_handler_nt
// because from different class then easier update
pub fn get_level_up_avatar_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<LevelUpAvatar") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> AvatarExpUpScRsp");
                map.insert(obf_name, "AvatarExpUpScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find AvatarExpUpScRsp nt");
    }
    map
}

pub fn get_unlock_skill_tree_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<UnlockTraceNode") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> UnlockSkilltreeScRsp");
                map.insert(obf_name, "UnlockSkilltreeScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find UnlockSkilltreeScRsp nt");
    }
    map
}

pub fn get_promote_avatar_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<PromoteAvatar") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> PromoteAvatarScRsp");
                map.insert(obf_name, "PromoteAvatarScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find PromoteAvatarScRsp nt");
    }
    map
}

pub fn get_dress_avatar_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<EquipLightCone") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> DressAvatarScRsp");
                map.insert(obf_name, "DressAvatarScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find DressAvatarScRsp nt");
    }
    map
}

pub fn get_take_off_equiment_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<TakeOffLightCone") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> TakeOffEquipmentScRsp");
                map.insert(obf_name, "TakeOffEquipmentScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find TakeOffEquipmentScRsp nt");
    }
    map
}

pub fn get_rank_up_avatar_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<ActiveEidolon") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> RankUpAvatarScRsp");
                map.insert(obf_name, "RankUpAvatarScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find RankUpAvatarScRsp nt");
    }
    map
}

pub fn get_dress_relic_avatar_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<EquipRelics") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> DressRelicAvatarScRsp");
                map.insert(obf_name, "DressRelicAvatarScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find DressRelicAvatarScRsp nt");
    }
    map
}

pub fn get_take_off_relic_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<TakeOffRelics") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> TakeOffRelicScRsp");
                map.insert(obf_name, "TakeOffRelicScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find TakeOffRelicScRsp nt");
    }
    map
}

pub fn get_take_promotion_reward_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<TakePromotionReward") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> TakePromotionRewardScRsp");
                map.insert(obf_name, "TakePromotionRewardScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find TakePromotionRewardScRsp nt");
    }
    map
}

pub fn get_dress_avatar_skin_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<DressSkin") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> DressAvatarSkinScRsp");
                map.insert(obf_name, "DressAvatarSkinScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find DressAvatarSkinScRsp nt");
    }
    map
}

pub fn get_take_off_avatar_skin_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<TakeOffSkin") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> TakeOffAvatarSkinScRsp");
                map.insert(obf_name, "TakeOffAvatarSkinScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find TakeOffAvatarSkinScRsp nt");
    }
    map
}

pub fn get_mark_avatar_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<FlipIsMarked") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> MarkAvatarScRsp");
                map.insert(obf_name, "MarkAvatarScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find MarkAvatarScRsp nt");
    }
    map
}

pub fn get_set_growth_target_avatar_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<SetGrowthTarget") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> SetGrowthTargetAvatarScRsp");
                map.insert(obf_name, "SetGrowthTargetAvatarScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find SetGrowthTargetAvatarScRsp nt");
    }
    map
}

pub fn get_set_mult_avatar_path_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<SwitchAcivePathes") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> SetMultipleAvatarPathsScRsp");
                map.insert(obf_name, "SetMultipleAvatarPathsScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find SetMultipleAvatarPathsScRsp nt");
    }
    map
}

pub fn get_unlock_avatar_path_nt() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let start = unsafe { il2cpp::ASSEMBLY_CSHARP_START };
    let max = unsafe { il2cpp::MAX_TYPEDEFINDEX };
    for i in start..max {
        let Ok(rt) = RuntimeType::from_class(
            il2cpp::vm::metadata_cache::get_typeinfo_from_typedefindex(i),
        ) else {
            continue;
        };

        for method in rt.get_methods_il2cpp() {
            let Ok(m_name) = method.get_name() else {
                continue;
            };
            if !m_name.as_str().contains("<UnlockAvatarPath") {
                continue;
            }
            let params = method.get_parameters();
            let Some(param) = params.first() else {
                continue;
            };
            let Ok(param_type) = param.get_parameter_type() else {
                continue;
            };
            let obf_name = param_type.il_name().into_owned();
            if obf_name.len() == 11 && obf_name.chars().all(char::is_uppercase) {
                log::debug!("[Method NT] param nt: {obf_name} -> UnlockAvatarPathScRsp");
                map.insert(obf_name, "UnlockAvatarPathScRsp".to_string());
            }
        }
    }
    if map.is_empty() {
        log::debug!("[Method NT] failed to find UnlockAvatarPathScRsp nt");
    }
    map
}
