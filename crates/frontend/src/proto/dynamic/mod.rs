#![allow(dead_code)]
pub mod decoder;
pub mod descriptor;
pub mod encoder;
pub mod utils;

pub use descriptor::DynamicDescriptor;

use std::{collections::HashMap, path::PathBuf, time::SystemTime};

#[derive(Clone)]
pub struct DynamicProto {
    pub path: PathBuf,
    pub modified: Option<SystemTime>,
    pub descriptor: Option<DynamicDescriptor>,
    pub descriptor_error: Option<String>,
    pub cmd_names: HashMap<u32, String>,
}

impl DynamicProto {
    pub fn load(path: impl Into<PathBuf>) -> anyhow::Result<Self> {
        let path = path.into();
        let source = std::fs::read_to_string(&path)?;
        let modified = std::fs::metadata(&path)
            .and_then(|meta| meta.modified())
            .ok();

        let cmd_names = utils::parse_cmd_ids(&source);
        let (descriptor, descriptor_error) = match descriptor::parse_descriptor(&path) {
            Ok(descriptor) => (Some(descriptor), None),
            Err(error) => {
                let error = format!("{error:#}");
                log::debug!(
                    "[Sniffer Proto] descriptor parse failed for {}:\n{error}",
                    path.display()
                );
                (None, Some(error))
            }
        };

        Ok(Self {
            path,
            modified,
            descriptor,
            descriptor_error,
            cmd_names,
        })
    }

    pub fn reload_if_changed(&mut self) -> anyhow::Result<bool> {
        let modified = std::fs::metadata(&self.path)
            .and_then(|meta| meta.modified())
            .ok();
        if modified == self.modified {
            return Ok(false);
        }

        *self = Self::load(self.path.clone())?;
        Ok(true)
    }

    pub fn path_display(&self) -> String {
        self.path.display().to_string()
    }

    pub fn packet_count(&self) -> usize {
        self.cmd_names.len()
    }

    pub fn is_decodable(&self) -> bool {
        self.descriptor.is_some()
    }

    pub fn descriptor_error(&self) -> Option<&str> {
        self.descriptor_error.as_deref()
    }

    pub fn packet_names(&self) -> Vec<(u32, String)> {
        let mut items = self
            .cmd_names
            .iter()
            .map(|(cmd_id, name)| (*cmd_id, name.clone()))
            .collect::<Vec<_>>();
        items.sort_by_key(|(cmd_id, _)| *cmd_id);
        items
    }

    pub fn message_name(&self, cmd_id: u32) -> Option<&str> {
        self.cmd_names.get(&cmd_id).map(String::as_str)
    }

    pub fn decode_body(&self, cmd_id: u32, body: &[u8]) -> anyhow::Result<String> {
        let name = self
            .message_name(cmd_id)
            .ok_or_else(|| anyhow::anyhow!("cmd_id not found in proto: {cmd_id}"))?;
        let descriptor = self
            .descriptor
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("proto descriptor is not loaded"))?;
        descriptor.decode(name, body)
    }

    pub fn encode_body(&self, cmd_id: u32, json: &str) -> anyhow::Result<Vec<u8>> {
        let name = self
            .message_name(cmd_id)
            .ok_or_else(|| anyhow::anyhow!("cmd_id not found in proto: {cmd_id}"))?;
        let descriptor = self
            .descriptor
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("proto descriptor is not loaded"))?;
        descriptor.encode(name, json)
    }

    pub fn default_json(&self, cmd_id: u32) -> anyhow::Result<String> {
        let name = self
            .message_name(cmd_id)
            .ok_or_else(|| anyhow::anyhow!("cmd_id not found in proto: {cmd_id}"))?;
        let descriptor = self
            .descriptor
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("proto descriptor is not loaded"))?;
        let json_value = descriptor
            .default_json(name)
            .ok_or_else(|| anyhow::anyhow!("failed to generate default json for {name}"))?;
        Ok(serde_json::to_string_pretty(&json_value)?)
    }
}
