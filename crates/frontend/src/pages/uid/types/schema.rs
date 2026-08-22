use serde::Deserialize;

#[derive(Debug, Clone, Default, Deserialize)]
pub struct UidDump {
    #[serde(default)]
    pub detail_info: DetailInfo,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct DetailInfo {
    #[serde(default)]
    pub uid: u64,
    #[serde(default)]
    pub nickname: String,
    #[serde(default)]
    pub level: u32,
    #[serde(default)]
    pub world_level: u32,
    #[serde(default)]
    pub signature: String,
    #[serde(default)]
    pub friend_count: u32,
    #[serde(default)]
    pub birthday: Option<u32>,
    #[serde(default)]
    pub head_icon: u32,
    #[serde(default)]
    pub platform_type: u32,
    #[serde(default)]
    pub record_info: RecordInfo,
    #[serde(default)]
    pub display_avatar_list: Vec<DisplayAvatar>,
    #[serde(default)]
    pub assist_avatar_list: Vec<DisplayAvatar>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct RecordInfo {
    #[serde(default, rename = "AchievementCount")]
    pub achievement_count: u32,
    #[serde(default)]
    pub avatar_count: u32,
    #[serde(default)]
    pub lightcone_count: u32,
    #[serde(default)]
    pub su_count: u32,
    #[serde(default, rename = "BookCount")]
    pub book_count: u32,
    #[serde(default, rename = "MusicCount")]
    pub music_count: u32,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct DisplayAvatar {
    #[serde(default)]
    pub avatar_id: u32,
    #[serde(default)]
    pub level: u32,
    #[serde(default)]
    pub promotion: u32,
    #[serde(default)]
    pub rank: u32,
    #[serde(default)]
    pub pos: u32,
    #[serde(default)]
    pub enhanced_id: Option<u32>,
    #[serde(default)]
    pub skilltree_list: Vec<SkillTreePoint>,
    #[serde(default)]
    pub equipment: Option<Equipment>,
    #[serde(default)]
    pub relic_list: Vec<RelicItem>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct SkillTreePoint {
    #[serde(default)]
    pub point_id: u32,
    #[serde(default)]
    pub level: u32,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct Equipment {
    #[serde(default)]
    pub tid: u32,
    #[serde(default)]
    pub level: u32,
    #[serde(default)]
    pub promotion: u32,
    #[serde(default = "default_rank")]
    pub rank: u32,
}

fn default_rank() -> u32 {
    1
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct RelicItem {
    #[serde(default)]
    pub tid: u32,
    #[serde(default)]
    pub level: u32,
    #[serde(default = "default_main_affix")]
    pub main_affix_id: u32,
    #[serde(default, rename = "type")]
    pub slot: u32,
    #[serde(default)]
    pub sub_affix_list: Vec<SubAffix>,
}

fn default_main_affix() -> u32 {
    1
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct SubAffix {
    #[serde(default)]
    pub affix_id: u32,
    #[serde(default)]
    pub cnt: u32,
    #[serde(default)]
    pub step: u32,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct AvatarDataRsp {
    #[serde(default)]
    pub avatar_list: Vec<OwnedAvatar>,
    #[serde(default)]
    pub avatar_path_data_info_list: Vec<AvatarPathData>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct OwnedAvatar {
    #[serde(default)]
    pub base_avatar_id: u32,
    #[serde(default)]
    pub cur_multi_path_avatar_type: u32,
    #[serde(default)]
    pub level: u32,
    #[serde(default)]
    pub promotion: u32,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct AvatarPathData {
    #[serde(default)]
    pub avatar_id: u32,
    #[serde(default)]
    pub rank: u32,
    #[serde(default)]
    pub path_equipment_id: u32,
    #[serde(default)]
    pub unk_enhanced_id: Option<u32>,
    #[serde(default)]
    pub equip_relic_list: Vec<EquipRelic>,
    #[serde(default)]
    pub avatar_path_skill_tree: Vec<PathSkillNode>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct EquipRelic {
    #[serde(default)]
    pub relic_unique_id: u32,
    #[serde(default, rename = "type")]
    pub slot: u32,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct PathSkillNode {
    #[serde(default)]
    pub anchor_type: u32,
    #[serde(default)]
    pub level: u32,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct BagRsp {
    #[serde(default)]
    pub update_relics_list: Vec<BagRelic>,
    #[serde(default)]
    pub update_equipments_list: Vec<BagEquipment>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct BagRelic {
    #[serde(default)]
    pub unique_id: u32,
    #[serde(default)]
    pub tid: u32,
    #[serde(default)]
    pub level: u32,
    #[serde(default = "default_main_affix")]
    pub main_affix_id: u32,
    #[serde(default)]
    pub belong_avatar_id: u32,
    #[serde(default)]
    pub sub_affix_list: Vec<SubAffix>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct BagEquipment {
    #[serde(default)]
    pub unique_id: u32,
    #[serde(default)]
    pub tid: u32,
    #[serde(default)]
    pub level: u32,
    #[serde(default)]
    pub promotion: u32,
    #[serde(default = "default_rank")]
    pub rank: u32,
    #[serde(default)]
    pub belong_avatar_id: u32,
}
