use super::resources::{Avatar, ResourceDb};
use super::schema::{DisplayAvatar, Equipment, RelicItem};
use std::collections::HashMap;

pub use super::types::calc::*;

const MAX_LEVELS: [u32; 7] = [20, 30, 40, 50, 60, 70, 80];

pub fn is_percent(property: &str) -> bool {
    property.contains("Ratio") || property.contains("Base")
}

pub fn format_stat_value(property: &str, value: f64) -> String {
    if is_percent(property) {
        format!("{:.1}%", (value * 1000.0).floor() / 10.0)
    } else if property == "SpeedDelta" {
        format!("{value:.1}")
    } else {
        format!("{}", value.floor() as i64)
    }
}

fn add(map: &mut StatMap, property: &str, value: f64) {
    *map.entry(property.to_string()).or_insert(0.0) += value;
}

pub fn format_eff_count(v: f64) -> String {
    if (v - v.round()).abs() < 1e-6 {
        format!("{}", v.round() as i64)
    } else {
        format!("{v:.1}")
    }
}

pub fn relic_grade(score: f64) -> &'static str {
    const THRESHOLDS: &[f64] = &[2.0, 3.5, 4.5, 5.5, 6.5];
    const GRADES: &[&str] = &["C", "B", "A", "S", "SS", "SSS"];

    let idx = THRESHOLDS.partition_point(|&t| score >= t);
    GRADES[idx]
}

pub fn calc_relic(
    db: &ResourceDb,
    lang: &str,
    relic: &RelicItem,
    weights: &HashMap<&'static str, f32>,
    out: &mut StatMap,
) -> Option<RelicPanel> {
    if relic.tid == 0 {
        return None;
    }
    let res = db.relics.get(&relic.tid.to_string())?;
    let main = db
        .relic_main_affixes
        .get(&res.main_affix_id.to_string())?
        .affixes
        .get(&relic.main_affix_id.to_string())?;

    let main_value = main.base + main.step * relic.level as f64;
    add(out, &main.property, main_value);

    let sub_group = db.relic_sub_affixes.get(&res.rarity.to_string())?;
    let mut subs = Vec::new();
    let mut score = 0.0;
    let mut effective_count = 0.0_f64;
    for sub in &relic.sub_affix_list {
        let Some(info) = sub_group.affixes.get(&sub.affix_id.to_string()) else {
            continue;
        };
        let value = info.base * sub.cnt as f64 + info.step * sub.step as f64;
        add(out, &info.property, value);
        let quality = 0.8 * sub.cnt as f64 + 0.1 * sub.step as f64;
        let weight = weights.get(info.property.as_str()).copied().unwrap_or(0.0) as f64;
        score += quality * weight;
        let eff_count = sub.cnt as f64 * weight;
        effective_count += eff_count;
        subs.push(SubLine {
            property: info.property.clone(),
            name: db.stat_name(lang, &info.property),
            icon: db.stat_icon_url(&info.property),
            value,
            count: sub.cnt,
            step: sub.step,
            quality,
            weight,
            effective: weight > 0.0,
            eff_count,
        });
    }

    let set = db.relic_sets.get(&res.set_id.to_string());

    Some(RelicPanel {
        slot: relic.slot,
        slot_type: res.slot.clone(),
        slot_icon: if res.slot.is_empty() {
            String::new()
        } else {
            format!(
                "{}/relic-tabs/{}.png",
                super::resources::SITE_ICON_BASE_URL,
                res.slot
            )
        },
        tid: relic.tid,
        icon: res.icon.clone(),
        set_id: res.set_id,
        set_name: set.map(|s| db.text(lang, s.name)).unwrap_or_default(),
        level: relic.level,
        rarity: res.rarity,
        main_property: main.property.clone(),
        main_name: db.stat_name(lang, &main.property),
        main_icon: db.stat_icon_url(&main.property),
        main_value,
        subs,
        score,
        grade: relic_grade(score),
        effective_count,
    })
}

pub fn calc_relics(
    db: &ResourceDb,
    lang: &str,
    relics: &[RelicItem],
    weights: &HashMap<&'static str, f32>,
    out: &mut StatMap,
) -> (Vec<RelicPanel>, Vec<SetBonusLine>) {
    let mut panels = Vec::new();
    let mut set_counts: HashMap<u32, u32> = HashMap::new();

    for relic in relics {
        if let Some(panel) = calc_relic(db, lang, relic, weights, out) {
            *set_counts.entry(panel.set_id).or_insert(0) += 1;
            panels.push(panel);
        }
    }
    panels.sort_by_key(|p| p.slot);

    let mut bonuses = Vec::new();
    let mut set_ids: Vec<u32> = set_counts.keys().copied().collect();
    set_ids.sort_unstable();

    for set_id in set_ids {
        let count = set_counts[&set_id];
        if count < 2 {
            continue;
        }
        let Some(set) = db.relic_sets.get(&set_id.to_string()) else {
            continue;
        };

        let mut needs: Vec<u32> = set
            .set_bonus
            .keys()
            .filter_map(|k| k.parse().ok())
            .collect();
        needs.sort_unstable();
        for need in needs {
            if count < need {
                continue;
            }
            if let Some(bonus) = set.set_bonus.get(&need.to_string()) {
                for prop in &bonus.properties {
                    add(out, &prop.property, prop.value);
                }
            }
        }

        bonuses.push(SetBonusLine {
            set_id,
            count,
            name: db.text(lang, set.name),
            icon: set.icon.clone(),
        });
    }

    (panels, bonuses)
}

pub fn calc_lightcone(
    db: &ResourceDb,
    lang: &str,
    wearer_path: &str,
    equipment: Option<&Equipment>,
    out: &mut StatMap,
) -> Option<LightconePanel> {
    let eq = equipment?;
    if eq.tid == 0 {
        return None;
    }
    let excel = db.lightcones.get(&eq.tid.to_string())?;
    let promo = excel
        .promotion
        .values
        .get(eq.promotion as usize)
        .or_else(|| excel.promotion.values.first())?;

    let steps = eq.level.saturating_sub(1) as f64;
    let hp = promo.hp.base + promo.hp.step * steps;
    let atk = promo.atk.base + promo.atk.step * steps;
    let def = promo.def.base + promo.def.step * steps;

    let path_match = wearer_path == excel.path;
    if path_match {
        let idx = (eq.rank.max(1) as usize - 1).min(excel.rank.properties.len().saturating_sub(1));
        if let Some(props) = excel.rank.properties.get(idx) {
            for prop in props {
                add(out, &prop.property, prop.value);
            }
        }
    }

    Some(LightconePanel {
        item_id: eq.tid,
        name: db.text(lang, excel.name),
        icon: excel.icon.clone(),
        level: eq.level,
        rank: eq.rank,
        rarity: excel.rarity,
        path_match,
        hp,
        atk,
        def,
    })
}

fn calc_traces(info: &Avatar, avatar: &DisplayAvatar, out: &mut StatMap) {
    let trees = info.skill_trees_for(avatar.enhanced_id.is_some());
    for point in &avatar.skilltree_list {
        if point.level == 0 {
            continue;
        }
        let Some(tree) = trees.get(&point.point_id.to_string()) else {
            continue;
        };
        for prop in &tree.status_add_list {
            add(out, &prop.property, prop.value);
        }
    }
}

fn additional_skill_level(info: &Avatar, avatar: &DisplayAvatar, skill_id: u32) -> u32 {
    let key = skill_id.to_string();
    let mut extra = 0;
    for rank in info.ranks_for(avatar.enhanced_id.is_some()).values() {
        if avatar.rank >= rank.rank
            && let Some(v) = rank.skill_add_level_map.get(&key)
        {
            extra += v;
        }
    }
    extra
}

fn build_skills(
    db: &ResourceDb,
    info: &Avatar,
    avatar: &DisplayAvatar,
    lang: &str,
) -> Vec<SkillLine> {
    const ANCHORS: [(&str, &str, &str, bool); 9] = [
        ("Point01", "普攻", "Basic", false),
        ("Point02", "战技", "Skill", false),
        ("Point03", "终结技", "Ultimate", false),
        ("Point04", "天赋", "Talent", false),
        ("Point05", "秘技", "Technique", false),
        ("Point19", "忆灵技", "Memo Skill", true),
        ("Point20", "忆灵天赋", "Memo Talent", true),
        ("Point21", "强化普攻", "Enhanced Basic", true),
        ("Point22", "强化战技", "Enhanced Skill", true),
    ];
    let levels: HashMap<u32, u32> = avatar
        .skilltree_list
        .iter()
        .map(|p| (p.point_id, p.level))
        .collect();

    let enhanced = avatar.enhanced_id.is_some();
    let mut skills = Vec::new();
    let trees = info.skill_trees_for(enhanced);
    for (anchor, label_cn, label_en, optional) in ANCHORS {
        let Some(tree) = trees.values().find(|t| t.anchor == anchor) else {
            continue;
        };
        let level = levels.get(&tree.id).copied().unwrap_or(0);
        if optional && level == 0 {
            continue;
        }
        let linked_skill = tree
            .level_up_skills
            .first()
            .and_then(|id| info.skills_for(enhanced).get(&id.to_string()));
        let label = match linked_skill {
            Some(skill) if optional && skill.type_text != 0 => db.text(lang, skill.type_text),
            _ => if lang == "EN" { label_en } else { label_cn }.to_string(),
        };
        let plus = tree
            .level_up_skills
            .first()
            .map_or(0, |&skill_id| additional_skill_level(info, avatar, skill_id));
        skills.push(SkillLine {
            label,
            level,
            plus,
            max: tree.max_level,
        });
    }
    skills
}

fn aggregate_sub_totals(relics: &[RelicPanel]) -> Vec<SubLine> {
    const ORDER: [&str; 12] = [
        "HPAddedRatio",
        "HPDelta",
        "AttackAddedRatio",
        "AttackDelta",
        "DefenceAddedRatio",
        "DefenceDelta",
        "SpeedDelta",
        "CriticalChanceBase",
        "CriticalDamageBase",
        "BreakDamageAddedRatioBase",
        "StatusProbabilityBase",
        "StatusResistanceBase",
    ];
    let mut totals: HashMap<String, SubLine> = HashMap::new();
    for relic in relics {
        for sub in &relic.subs {
            let entry = totals
                .entry(sub.property.clone())
                .or_insert_with(|| SubLine {
                    property: sub.property.clone(),
                    name: sub.name.clone(),
                    icon: sub.icon.clone(),
                    value: 0.0,
                    count: 0,
                    step: 0,
                    quality: 0.0,
                    weight: sub.weight,
                    effective: sub.effective,
                    eff_count: 0.0,
                });
            entry.value += sub.value;
            entry.count += sub.count;
            entry.step += sub.step;
            entry.quality += sub.quality;
            entry.eff_count += sub.eff_count;
        }
    }
    let mut lines: Vec<SubLine> = totals.into_values().collect();
    lines.sort_by_key(|l| {
        ORDER
            .iter()
            .position(|&p| p == l.property)
            .unwrap_or(ORDER.len())
    });
    lines
}

pub fn build_panel(db: &ResourceDb, lang: &str, avatar: &DisplayAvatar) -> Option<AvatarPanel> {
    if avatar.avatar_id == 0 {
        return None;
    }
    let info = db.avatars.get(&avatar.avatar_id.to_string())?;
    let promo = info
        .promotions
        .get(&avatar.promotion.to_string())
        .or_else(|| info.promotions.get("0"))?;

    let steps = avatar.level.saturating_sub(1) as f64;
    let char_hp = promo.hp.base + promo.hp.step * steps;
    let char_atk = promo.atk.base + promo.atk.step * steps;
    let char_def = promo.def.base + promo.def.step * steps;
    let char_spd = promo.spd.base + promo.spd.step * steps;
    let crit_rate = promo.crit_rate.base;
    let crit_dmg = promo.crit_dmg.base;

    let mut props: StatMap = HashMap::new();

    let weights = super::recommend::weights(avatar.avatar_id);
    let (relics, set_bonuses) = calc_relics(db, lang, &avatar.relic_list, &weights, &mut props);
    let lightcone = calc_lightcone(db, lang, &info.path, avatar.equipment.as_ref(), &mut props);
    calc_traces(info, avatar, &mut props);

    let (lc_hp, lc_atk, lc_def) = lightcone
        .as_ref()
        .map_or((0.0, 0.0, 0.0), |lc| (lc.hp, lc.atk, lc.def));
    let base_hp = char_hp + lc_hp;
    let base_atk = char_atk + lc_atk;
    let base_def = char_def + lc_def;
    let base_spd = char_spd;

    let mut ratios = (0.0, 0.0, 0.0, 0.0); // hp, atk, def, spd
    let mut flats = (0.0, 0.0, 0.0, 0.0);
    let mut crit_rate_add = 0.0;
    let mut crit_dmg_add = 0.0;
    let mut energy = 0.0;
    let mut effect_hit = 0.0;
    let mut break_effect = 0.0;
    let mut effect_res = 0.0;
    let mut heal = 0.0;
    let mut damage_bonus: StatMap = HashMap::new();

    for (property, value) in &props {
        let value = *value;
        match property.as_str() {
            "HPAddedRatio" => ratios.0 += value,
            "AttackAddedRatio" => ratios.1 += value,
            "DefenceAddedRatio" => ratios.2 += value,
            "SpeedAddedRatio" => ratios.3 += value,
            "HPDelta" => flats.0 += value,
            "AttackDelta" => flats.1 += value,
            "DefenceDelta" => flats.2 += value,
            "SpeedDelta" | "BaseSpeed" => flats.3 += value,
            "CriticalChanceBase" => crit_rate_add += value,
            "CriticalDamageBase" => crit_dmg_add += value,
            "SPRatioBase" => energy += value,
            "StatusProbabilityBase" => effect_hit += value,
            "BreakDamageAddedRatioBase" => break_effect += value,
            "StatusResistanceBase" => effect_res += value,
            "HealRatioBase" => heal += value,
            _ => {
                if property.to_lowercase().contains("addedratio") {
                    add(&mut damage_bonus, property, value);
                }
            }
        }
    }

    if let Some(all) = damage_bonus.remove("AllDamageTypeAddedRatio") {
        let keys: Vec<String> = damage_bonus.keys().cloned().collect();
        for key in keys {
            if !key.to_lowercase().contains("alldamagetype") {
                add(&mut damage_bonus, &key, all);
            }
        }
        let own = format!("{}AddedRatio", info.element);
        damage_bonus.entry(own).or_insert(all);
    }

    let final_hp = base_hp * (1.0 + ratios.0) + flats.0;
    let final_atk = base_atk * (1.0 + ratios.1) + flats.1;
    let final_def = base_def * (1.0 + ratios.2) + flats.2;
    let final_spd = base_spd * (1.0 + ratios.3) + flats.3;

    let mut stats = Vec::new();
    let mut push = |property: &str, display_key: &str, base: f64, total: f64, breakdown: bool| {
        stats.push(StatLine {
            property: property.to_string(),
            name: db.stat_name(lang, display_key),
            icon: db.stat_icon_url(display_key),
            base,
            added: total - base,
            total,
            breakdown,
        });
    };

    push("HPDelta", "MaxHP", base_hp, final_hp, true);
    push("AttackDelta", "Attack", base_atk, final_atk, true);
    push("DefenceDelta", "Defence", base_def, final_def, true);
    push("SpeedDelta", "Speed", base_spd, final_spd, true);
    push(
        "CriticalChanceBase",
        "CriticalChance",
        crit_rate,
        crit_rate + crit_rate_add,
        false,
    );
    push(
        "CriticalDamageBase",
        "CriticalDamage",
        crit_dmg,
        crit_dmg + crit_dmg_add,
        false,
    );
    push(
        "BreakDamageAddedRatioBase",
        "BreakDamageAddedRatioBase",
        0.0,
        break_effect,
        false,
    );
    push("SPRatioBase", "SPRatioBase", 1.0, 1.0 + energy, false);
    push(
        "StatusProbabilityBase",
        "StatusProbabilityBase",
        0.0,
        effect_hit,
        false,
    );
    push(
        "StatusResistanceBase",
        "StatusResistanceBase",
        0.0,
        effect_res,
        false,
    );
    if heal > 0.0 {
        push("HealRatioBase", "HealRatioBase", 0.0, heal, false);
    }

    let own_dmg = format!("{}AddedRatio", info.element);
    let own_value = damage_bonus.remove(&own_dmg).unwrap_or(0.0);
    push(&own_dmg, &own_dmg, 0.0, own_value, false);
    let mut rest: Vec<(String, f64)> = damage_bonus.into_iter().filter(|(_, v)| *v > 0.0).collect();
    rest.sort_by(|a, b| a.0.cmp(&b.0));
    for (property, value) in rest {
        push(&property, &property, 0.0, value, false);
    }

    let element = db.elements.get(&info.element);
    let path = db.paths.get(&info.path);

    let sub_totals = aggregate_sub_totals(&relics);
    let total_score = relics.iter().map(|r| r.score).sum();
    let total_effective = relics.iter().map(|r| r.effective_count).sum();

    Some(AvatarPanel {
        avatar_id: avatar.avatar_id,
        name: db.text(lang, info.name),
        icon: info.icon.clone(),
        level: avatar.level,
        max_level: MAX_LEVELS
            .get(avatar.promotion as usize)
            .copied()
            .unwrap_or(80),
        promotion: avatar.promotion,
        eidolon: avatar.rank,
        rarity: info.rarity,
        path_id: info.path.clone(),
        path_name: path
            .and_then(|p| p.text.map(|t| db.text(lang, t)))
            .unwrap_or_else(|| info.path.clone()),
        path_icon: path.map(|p| p.icon.clone()).unwrap_or_default(),
        element_id: info.element.clone(),
        element_name: element.map_or_else(|| info.element.clone(), |e| db.text(lang, e.name)),
        element_icon: element.map(|e| e.icon.clone()).unwrap_or_default(),
        stats,
        skills: build_skills(db, info, avatar, lang),
        lightcone,
        relics,
        set_bonuses,
        sub_totals,
        total_score,
        total_effective,
        scored: !weights.is_empty(),
    })
}
