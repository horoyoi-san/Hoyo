use std::collections::HashMap;

use super::resources::ResourceDb;
use super::schema::{
    AvatarDataRsp, BagEquipment, BagRelic, BagRsp, DisplayAvatar, Equipment, RelicItem,
    SkillTreePoint,
};

pub fn to_display_avatars(
    data: &AvatarDataRsp,
    bag: &BagRsp,
    db: &ResourceDb,
) -> Vec<DisplayAvatar> {
    let relic_by_id: HashMap<u32, &BagRelic> = bag
        .update_relics_list
        .iter()
        .map(|r| (r.unique_id, r))
        .collect();
    let equip_by_id: HashMap<u32, &BagEquipment> = bag
        .update_equipments_list
        .iter()
        .map(|e| (e.unique_id, e))
        .collect();
    let path_by_id: HashMap<u32, &_> = data
        .avatar_path_data_info_list
        .iter()
        .map(|p| (p.avatar_id, p))
        .collect();

    let mut out = Vec::new();
    for base in &data.avatar_list {
        let active = if base.cur_multi_path_avatar_type != 0 {
            base.cur_multi_path_avatar_type
        } else {
            base.base_avatar_id
        };
        let path = path_by_id.get(&active).copied();
        let enhanced_id = path.and_then(|p| p.unk_enhanced_id);

        let mut relic_list = Vec::new();
        if let Some(p) = path {
            for er in &p.equip_relic_list {
                if let Some(r) = relic_by_id.get(&er.relic_unique_id) {
                    relic_list.push(RelicItem {
                        tid: r.tid,
                        level: r.level,
                        main_affix_id: r.main_affix_id,
                        slot: er.slot,
                        sub_affix_list: r.sub_affix_list.clone(),
                    });
                }
            }
        }

        let equipment = path
            .and_then(|p| equip_by_id.get(&p.path_equipment_id).copied())
            .or_else(|| {
                bag.update_equipments_list
                    .iter()
                    .find(|e| e.belong_avatar_id == active)
            })
            .map(|e| Equipment {
                tid: e.tid,
                level: e.level,
                promotion: e.promotion,
                rank: e.rank,
            });

        let trees = db
            .avatars
            .get(&active.to_string())
            .map(|av| av.skill_trees_for(enhanced_id.is_some()));
        let skilltree_list = match (path, trees) {
            (Some(p), Some(trees)) => p
                .avatar_path_skill_tree
                .iter()
                .filter_map(|n| {
                    let anchor = format!("Point{:02}", n.anchor_type);
                    let point_id = trees.values().find(|t| t.anchor == anchor)?.id;
                    Some(SkillTreePoint {
                        point_id,
                        level: n.level,
                    })
                })
                .collect(),
            _ => Vec::new(),
        };

        out.push(DisplayAvatar {
            avatar_id: active,
            level: base.level,
            promotion: base.promotion,
            rank: path.map_or(0, |p| p.rank),
            pos: 0,
            enhanced_id,
            skilltree_list,
            equipment,
            relic_list,
        });
    }

    out
}
