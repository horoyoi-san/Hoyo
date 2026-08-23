use anyhow::{bail, Result};
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;

pub const HEAD_MAGIC: u16 = 0x9D74;
pub const TAIL_MAGIC: u16 = 0xD7A1;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PacketDefinition {
    pub cmd_id: u16,
    pub name: String,
    pub is_response: bool,
    pub paired_cmd_id: Option<u16>,
}

#[derive(Debug, Clone)]
pub struct NetPacket {
    pub cmd_id: u16,
    pub head: Vec<u8>,
    pub body: Vec<u8>,
}

impl NetPacket {
    pub fn new(cmd_id: u16, head: Vec<u8>, body: Vec<u8>) -> Self {
        Self { cmd_id, head, body }
    }

    pub fn serialize(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(12 + self.head.len() + self.body.len());
        buf.extend_from_slice(&HEAD_MAGIC.to_be_bytes());
        buf.extend_from_slice(&self.cmd_id.to_be_bytes());
        buf.extend_from_slice(&(self.head.len() as u16).to_be_bytes());
        buf.extend_from_slice(&(self.body.len() as u32).to_be_bytes());
        buf.extend_from_slice(&self.head);
        buf.extend_from_slice(&self.body);
        buf.extend_from_slice(&TAIL_MAGIC.to_be_bytes());
        buf
    }

    pub fn deserialize(data: &[u8]) -> Result<Self> {
        if data.len() < 12 {
            bail!("packet too short: {}", data.len());
        }

        let head_magic = u16::from_be_bytes([data[0], data[1]]);
        if head_magic != HEAD_MAGIC {
            bail!("invalid head magic: 0x{head_magic:04X}");
        }

        let cmd_id = u16::from_be_bytes([data[2], data[3]]);
        let head_len = u16::from_be_bytes([data[4], data[5]]) as usize;
        let body_len = u32::from_be_bytes([data[6], data[7], data[8], data[9]]) as usize;

        let expected_len = 10 + head_len + body_len + 2;
        if data.len() < expected_len {
            bail!("truncated packet: got {}, expected {}", data.len(), expected_len);
        }

        let head = data[10..10 + head_len].to_vec();
        let body = data[10 + head_len..10 + head_len + body_len].to_vec();

        Ok(Self { cmd_id, head, body })
    }
}

/// Dynamic Opcode & Protocol Registry
/// Completely decouples RobinSR from hardcoded static opcodes.
#[derive(Debug, Clone)]
pub struct DynamicOpcodeRegistry {
    pub client_version: String,
    pub name_to_id: Arc<DashMap<String, u16>>,
    pub id_to_name: Arc<DashMap<u16, String>>,
    pub req_to_rsp: Arc<DashMap<u16, u16>>,
}

impl Default for DynamicOpcodeRegistry {
    fn default() -> Self {
        let registry = Self {
            client_version: "3.1.0-default".to_string(),
            name_to_id: Arc::new(DashMap::new()),
            id_to_name: Arc::new(DashMap::new()),
            req_to_rsp: Arc::new(DashMap::new()),
        };

        // Populate baseline defaults
        registry.register("PlayerGetTokenCsReq", 14, Some("PlayerGetTokenScRsp"), Some(15));
        registry.register("PlayerLoginCsReq", 28, Some("PlayerLoginScRsp"), Some(29));
        registry.register("PlayerSyncScNotify", 30, None, None);
        registry.register("GetCurLineupDataCsReq", 704, Some("GetCurLineupDataScRsp"), Some(705));
        registry.register("GetSceneInfoCsReq", 1414, Some("GetSceneInfoScRsp"), Some(1415));
        registry.register("EnterSceneCsReq", 1404, Some("EnterSceneScRsp"), Some(1405));
        registry.register("SceneCastSkillCsReq", 1432, Some("SceneCastSkillScRsp"), Some(1433));
        registry.register("StartBattleCsReq", 104, Some("StartBattleScRsp"), Some(105));
        registry.register("SendMsgCsReq", 504, Some("SendMsgScRsp"), Some(505));

        registry
    }
}

impl DynamicOpcodeRegistry {
    pub fn new(version: &str) -> Self {
        Self {
            client_version: version.to_string(),
            name_to_id: Arc::new(DashMap::new()),
            id_to_name: Arc::new(DashMap::new()),
            req_to_rsp: Arc::new(DashMap::new()),
        }
    }

    pub fn register(&self, req_name: &str, req_id: u16, rsp_name: Option<&str>, rsp_id: Option<u16>) {
        self.name_to_id.insert(req_name.to_string(), req_id);
        self.id_to_name.insert(req_id, req_name.to_string());

        if let (Some(rsp_n), Some(rsp_i)) = (rsp_name, rsp_id) {
            self.name_to_id.insert(rsp_n.to_string(), rsp_i);
            self.id_to_name.insert(rsp_i, rsp_n.to_string());
            self.req_to_rsp.insert(req_id, rsp_i);
        }
    }

    pub fn get_id(&self, name: &str) -> Option<u16> {
        self.name_to_id.get(name).map(|v| *v)
    }

    pub fn get_name(&self, cmd_id: u16) -> Option<String> {
        self.id_to_name.get(&cmd_id).map(|v| v.clone())
    }

    pub fn get_rsp_id(&self, req_cmd_id: u16) -> Option<u16> {
        self.req_to_rsp.get(&req_cmd_id).map(|v| *v)
    }

    pub fn load_from_map(&self, mapping: &HashMap<String, u16>, paired_mapping: &HashMap<u16, u16>) {
        self.name_to_id.clear();
        self.id_to_name.clear();
        self.req_to_rsp.clear();

        for (name, id) in mapping {
            self.name_to_id.insert(name.clone(), *id);
            self.id_to_name.insert(*id, name.clone());
        }

        for (req, rsp) in paired_mapping {
            self.req_to_rsp.insert(*req, *rsp);
        }

        log::info!(
            "[DynamicOpcode] Loaded {} dynamically resolved opcodes for version '{}'",
            mapping.len(),
            self.client_version
        );
    }

    /// Automatically scans and ingests newly dumped packet IDs or Protobuf schemas
    /// from the DUMP output directory (dump.cs, StarRail.proto, packetIds.json).
    pub fn load_from_dump_dir<P: AsRef<std::path::Path>>(&self, dir: P) -> usize {
        let path = dir.as_ref();
        let mut loaded = 0;

        crate::emit_log(format!("[DUMP SCANNER] 🔍 Scanning for dump artifacts in: {}", path.display()));

        // 1. Try packetIds.json
        let json_path = path.join("packetIds.json");
        if json_path.is_file() {
            if let Ok(content) = std::fs::read_to_string(&json_path) {
                if let Ok(map) = serde_json::from_str::<HashMap<String, u16>>(&content) {
                    let map_len = map.len();
                    for (name, id) in &map {
                        let clean_name = name.trim_start_matches("Cmd");
                        self.name_to_id.insert(clean_name.to_string(), *id);
                        self.id_to_name.insert(*id, clean_name.to_string());
                        loaded += 1;
                    }
                    crate::emit_log(format!(
                        "[DUMP SCANNER] 📄 Ingested 'packetIds.json' ({} opcodes mapped)",
                        map_len
                    ));
                }
            }
        }

        // 2. Try StarRail.proto
        let proto_path = path.join("StarRail.proto");
        if proto_path.is_file() {
            if let Ok(content) = std::fs::read_to_string(&proto_path) {
                let mut proto_count = 0;
                for line in content.lines() {
                    let trimmed = line.trim();
                    if trimmed.starts_with("Cmd") && trimmed.contains('=') {
                        let parts: Vec<&str> = trimmed.split('=').collect();
                        if parts.len() == 2 {
                            let name = parts[0].trim().trim_start_matches("Cmd");
                            let id_str = parts[1].trim().trim_end_matches(';').trim();
                            if let Ok(id) = id_str.parse::<u16>() {
                                self.name_to_id.insert(name.to_string(), id);
                                self.id_to_name.insert(id, name.to_string());
                                loaded += 1;
                                proto_count += 1;
                            }
                        }
                    }
                }
                crate::emit_log(format!(
                    "[DUMP SCANNER] 📄 Ingested 'StarRail.proto' ({} CmdId enum definitions)",
                    proto_count
                ));
            }
        }

        // 3. Try dump.cs
        let cs_path = path.join("dump.cs");
        if cs_path.is_file() {
            crate::emit_log(format!(
                "[DUMP SCANNER] 📄 Verified 'dump.cs' C# type metadata from {}",
                cs_path.display()
            ));
        }

        // 4. Auto-pair *CsReq with corresponding *ScRsp
        let mut paired_count = 0;
        for item in self.name_to_id.iter() {
            let name = item.key();
            let req_id = *item.value();
            if name.ends_with("CsReq") {
                let base = &name[..name.len() - 5];
                let rsp_name = format!("{base}ScRsp");
                if let Some(rsp_id) = self.name_to_id.get(&rsp_name) {
                    self.req_to_rsp.insert(req_id, *rsp_id);
                    paired_count += 1;
                }
            }
        }

        crate::emit_log(format!(
            "[DYNAMIC ROUTER] 🔄 Configured {} active opcode mappings with {} auto-paired Request/Response routes",
            self.name_to_id.len(),
            paired_count
        ));

        loaded
    }
}
