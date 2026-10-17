use proto::{Avatar, AvatarPathData};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};

use crate::resources::resolve_endgame_node;
use crate::structs::{
    // AllowedLanguages,
    avatar::{AvatarJson, MultiPathAvatar},
    battle::BattleConfig,
    lightcone::Lightcone,
    persistent::Persistent,
    relic::Relic,
    scene::{Position, Scene},
};

#[derive(Debug, Serialize, Deserialize)]
pub struct FreesrData {
    pub lightcones: Vec<Lightcone>,
    pub relics: Vec<Relic>,
    pub avatars: HashMap<u32, AvatarJson>,
    #[serde(default)]
    pub battle_config: BattleConfig,

    // Non freesr-data.json fields
    #[serde(skip_serializing, skip_deserializing)]
    pub lineups: BTreeMap<u32, u32>,
    #[serde(skip_serializing, skip_deserializing)]
    pub position: Position,
    #[serde(skip_serializing, skip_deserializing)]
    pub scene: Scene,
    #[serde(skip_serializing, skip_deserializing)]
    pub main_character: MultiPathAvatar,
    #[serde(skip_serializing, skip_deserializing)]
    pub march_type: MultiPathAvatar,
    #[serde(skip_serializing, skip_deserializing)]
    pub enable_sw_global: Option<bool>,
    #[serde(skip_serializing, skip_deserializing)]
    pub enable_castorice_global: Option<bool>,
    #[serde(skip_serializing, skip_deserializing)]
    pub enable_ex_rank: Option<bool>,
    #[serde(skip_serializing, skip_deserializing)]
    pub challenge_progress:
        BTreeMap<u32, BTreeMap<u32, crate::structs::persistent::ChallengeProgress>>,
    #[serde(skip_serializing, skip_deserializing)]
    pub challenge_origin_scene: Option<Scene>,
    #[serde(skip_serializing, skip_deserializing)]
    pub challenge_origin_position: Option<Position>,
    #[serde(skip_serializing, skip_deserializing)]
    pub challenge_origin_lineups: Option<BTreeMap<u32, u32>>,
    #[serde(skip_serializing, skip_deserializing)]
    pub challenge_origin_battle_config: Option<BattleConfig>,
    #[serde(skip_serializing, skip_deserializing)]
    pub challenge_active_battle_config: Option<BattleConfig>,
    #[serde(skip_serializing, skip_deserializing)]
    pub spawned_monsters: Vec<crate::structs::persistent::SpawnedMonster>,
    #[serde(skip_serializing, skip_deserializing)]
    pub spawned_battle_config: Option<BattleConfig>,
    #[serde(skip_serializing, skip_deserializing)]
    pub spawned_battle_active: bool,
}

impl FreesrData {
    pub fn get_avatar_proto(&self, avatar_id: u32, mc_id: u32, march_id: u32) -> Option<Avatar> {
        let avatar = self.avatars.get(&avatar_id)?;
        let lightcone = self.lightcones.iter().find(|l| l.equip_avatar == avatar_id);
        Some(avatar.to_avatar_proto(lightcone, mc_id, march_id))
    }

    pub fn get_avatar_path_data_proto(&self, avatar_id: u32) -> Option<AvatarPathData> {
        let avatar = self.avatars.get(&avatar_id)?;

        Some(
            avatar.to_avatar_path_data_proto(
                self.lightcones.iter().find(|v| v.equip_avatar == avatar_id),
                self.relics
                    .iter()
                    .filter(|relic| relic.equip_avatar == avatar_id)
                    .collect(),
            ),
        )
    }
}

impl FreesrData {
    pub async fn load() -> anyhow::Result<Self> {
        let persistent: Persistent = serde_json::from_str(
            &tokio::fs::read_to_string("persistent")
                .await
                .unwrap_or_default(),
        )
        .unwrap_or_default();

        // Inventory and battle setup always come from freesr-data.json.
        // `persistent` stores only server-owned gameplay state.
        let mut freesr_data = tokio::fs::read_to_string("freesr-data.json")
            .await
            .map_err(|e| anyhow::anyhow!("failed to read freesr-data.json: {e}"))
            .and_then(|v| {
                serde_json::from_str::<FreesrData>(&v)
                    .map_err(|e| anyhow::anyhow!("freesr-data.json is broken: {e}, pls redownload"))
            })?;

        freesr_data.lineups = persistent.lineups.clone();
        freesr_data.position = persistent.position.clone();
        freesr_data.scene = persistent.scene.clone();
        freesr_data.main_character = persistent.main_character;
        freesr_data.march_type = persistent.march_type;
        freesr_data.enable_sw_global = persistent.enable_sw_global;
        freesr_data.enable_castorice_global = persistent.enable_castorice_global;
        freesr_data.enable_ex_rank = persistent.enable_ex_rank;
        freesr_data.challenge_progress = persistent.challenge_progress.clone();
        freesr_data.challenge_origin_scene = persistent.challenge_origin_scene.clone();
        freesr_data.challenge_origin_position = persistent.challenge_origin_position.clone();
        freesr_data.challenge_origin_lineups = persistent.challenge_origin_lineups.clone();
        freesr_data.challenge_origin_battle_config =
            persistent.challenge_origin_battle_config.clone();
        freesr_data.challenge_active_battle_config =
            persistent.challenge_active_battle_config.clone();
        freesr_data.spawned_monsters = persistent.spawned_monsters.clone();

        // Old server runs restarted the entity counter at 40000, which could
        // duplicate IDs already persisted. Renumber collisions before sending
        // the scene snapshot to the client.
        let mut used_entity_ids = HashSet::new();
        let mut next_entity_id = 40_000;
        for spawned in &mut freesr_data.spawned_monsters {
            if !used_entity_ids.insert(spawned.entity_id) {
                while used_entity_ids.contains(&next_entity_id) {
                    next_entity_id += 1;
                }
                spawned.entity_id = next_entity_id;
                used_entity_ids.insert(next_entity_id);
                next_entity_id += 1;
            }
        }

        // Repair saved monsters that were stacked at the exact same location
        // by older versions. Only migrate the player's current map once.
        let current_scene = &freesr_data.scene;
        let mut has_stacked_monsters = false;
        'pairs: for (index, first) in freesr_data.spawned_monsters.iter().enumerate() {
            if first.entry_id != current_scene.entry_id
                || first.plane_id != current_scene.plane_id
                || first.floor_id != current_scene.floor_id
            {
                continue;
            }
            for second in freesr_data.spawned_monsters.iter().skip(index + 1) {
                if second.entry_id == first.entry_id
                    && second.plane_id == first.plane_id
                    && second.floor_id == first.floor_id
                    && second.position.x == first.position.x
                    && second.position.y == first.position.y
                    && second.position.z == first.position.z
                {
                    has_stacked_monsters = true;
                    break 'pairs;
                }
            }
        }
        if has_stacked_monsters {
            let origin = freesr_data.position.clone();
            let mut index = 0;
            for spawned in &mut freesr_data.spawned_monsters {
                if spawned.entry_id == current_scene.entry_id
                    && spawned.plane_id == current_scene.plane_id
                    && spawned.floor_id == current_scene.floor_id
                {
                    spawned.position =
                        crate::structs::persistent::spawned_monster_position(&origin, index);
                    index += 1;
                }
            }
        }

        for (&avatar_id, &enhanced_id) in &persistent.unlocked_ex_ranks {
            if let Some(avatar) = freesr_data.avatars.get_mut(&avatar_id) {
                avatar.unlocked_enhanced_id = Some(enhanced_id);
            }
        }
        // Force the known EX ranks reported by the client to stay unlocked
        // across sessions, even if the client's unlock request is repeated.
        for (avatar_id, ex_rank_id) in [(1204, 120401), (1213, 121301), (1308, 130801)] {
            if let Some(avatar) = freesr_data.avatars.get_mut(&avatar_id) {
                avatar.unlocked_enhanced_id = Some(ex_rank_id);
            }
        }

        if let Some(active_battle_config) = persistent.challenge_active_battle_config.clone() {
            freesr_data.battle_config = active_battle_config;
        }
        freesr_data.challenge_active_battle_config = persistent.challenge_active_battle_config;

        // Challenge IDs are tied to the resource version. If a saved active
        // challenge no longer exists, the client cannot reconstruct its UI on
        // login. Restore the pre-challenge state saved when it was entered.
        if let Some(challenge_id) = freesr_data.battle_config.challenge_id {
            let challenge_node = freesr_data.battle_config.challenge_node.unwrap_or(1);
            // Login resumes through GetCurChallenge (the legacy challenge
            // protocol). A Tierce-only ID cannot be resumed through that
            // response even if it exists in ChallengeMazeTierceConfig.
            let challenge_is_supported =
                resolve_endgame_node(challenge_id, challenge_node).is_some();
            if !challenge_is_supported {
                if let (
                    Some(origin_scene),
                    Some(origin_position),
                    Some(origin_lineups),
                    Some(origin_battle_config),
                ) = (
                    freesr_data.challenge_origin_scene.clone(),
                    freesr_data.challenge_origin_position.clone(),
                    freesr_data.challenge_origin_lineups.clone(),
                    freesr_data.challenge_origin_battle_config.clone(),
                ) {
                    tracing::warn!(
                        "Discarding stale challenge state {challenge_id}; restoring saved origin scene"
                    );
                    freesr_data.scene = origin_scene;
                    freesr_data.position = origin_position;
                    freesr_data.lineups = origin_lineups;
                    freesr_data.battle_config = origin_battle_config;
                    freesr_data.challenge_origin_scene = None;
                    freesr_data.challenge_origin_position = None;
                    freesr_data.challenge_origin_lineups = None;
                    freesr_data.challenge_origin_battle_config = None;
                    freesr_data.challenge_active_battle_config = None;
                }
            }
        }
        // freesr_data.game_language = persistent.game_language;
        // freesr_data.voice_langauge = persistent.voice_language;

        // remove unequipped lightcones
        if freesr_data.lightcones.len() > 1500 {
            freesr_data.lightcones.retain(|v| v.equip_avatar != 0);
        }

        // remove unequipped relics
        if freesr_data.relics.len() > 3000 {
            freesr_data.relics.retain(|v| v.equip_avatar != 0);
        }

        freesr_data.verify_lineup().await;

        if freesr_data.march_type as u32 > 8000 {
            freesr_data.march_type = MultiPathAvatar::MarchHunt;
        }

        Ok(freesr_data)
    }

    pub async fn update(&mut self) -> anyhow::Result<()> {
        *self = Self::load().await?;
        Ok(())
    }

    // pub async fn refresh_persistent(&mut self) -> anyhow::Result<()> {
    //     let persistent: Persistent = serde_json::from_str(
    //         &tokio::fs::read_to_string("persistent")
    //             .await
    //             .unwrap_or_default(),
    //     )
    //     .unwrap_or_default();

    //     self.lineups = persistent.lineups;
    //     self.position = persistent.position;
    //     self.scene = persistent.scene;
    //     self.main_character = persistent.main_character;
    //     self.march_type = persistent.march_type;
    //     self.enable_sw_global = persistent.enable_sw_global;
    //     self.enable_castorice_global = persistent.enable_castorice_global;

    //     Ok(())
    // }

    async fn verify_lineup(&mut self) {
        if self.lineups.is_empty() {
            self.lineups = BTreeMap::<u32, u32>::from([(0, 8001), (1, 0), (2, 0), (3, 0)])
        } else if self.lineups.len() < 4 {
            for i in self.lineups.len()..4 {
                self.lineups.insert(i as u32, 0);
            }
        }
        self.save_persistent().await;
    }

    pub async fn save_persistent(&self) {
        if let Ok(data) = serde_json::to_string_pretty(&Persistent {
            lineups: self.lineups.clone(),
            main_character: self.main_character,
            position: self.position.clone(),
            scene: self.scene.clone(),
            march_type: self.march_type,
            enable_sw_global: self.enable_sw_global,
            enable_castorice_global: self.enable_castorice_global,
            enable_ex_rank: self.enable_ex_rank,
            challenge_progress: self.challenge_progress.clone(),
            challenge_origin_scene: self.challenge_origin_scene.clone(),
            challenge_origin_position: self.challenge_origin_position.clone(),
            challenge_origin_lineups: self.challenge_origin_lineups.clone(),
            challenge_origin_battle_config: self.challenge_origin_battle_config.clone(),
            challenge_active_battle_config: self
                .battle_config
                .challenge_id
                .map(|_| self.battle_config.clone()),
            spawned_monsters: self.spawned_monsters.clone(),
            unlocked_ex_ranks: self
                .avatars
                .iter()
                .filter_map(|(&avatar_id, avatar)| {
                    avatar.unlocked_enhanced_id.map(|id| (avatar_id, id))
                })
                .collect(),
            // game_language: self.game_language,
            // voice_language: self.voice_langauge,
        }) {
            let _ = tokio::fs::write("persistent", data).await;
            tracing::info!("persistent saved");
        }
    }
}
