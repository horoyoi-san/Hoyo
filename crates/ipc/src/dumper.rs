use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum DumperAction {
    Proto { mode: ProtoDumpMode },
    CSharp,
    ParserData,
    Script,
    ScriptV2,
    Resources,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DumperCommand {
    Run { action: DumperAction },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DumperEvent {
    Started { action: DumperAction },
    Finished { action: DumperAction, seconds: u64 },
    Failed { action: DumperAction, error: String },
}

impl DumperAction {
    pub const ALL: [Self; 6] = [
        Self::CSharp,
        Self::Script,
        Self::ScriptV2,
        Self::Proto {
            mode: ProtoDumpMode::WriteTo,
        },
        Self::ParserData,
        Self::Resources,
    ];

    pub const fn label(self) -> &'static str {
        match self {
            Self::Proto { .. } => "Proto",
            Self::CSharp => "Csharp",
            Self::ParserData => "Data",
            Self::Script => "Script",
            Self::ScriptV2 => "Struct",
            Self::Resources => "Resources",
        }
    }

    pub const fn description(self) -> &'static str {
        match self {
            Self::Proto { .. } => "Dump ProtoBuf and NameTranslations",
            Self::CSharp => "Dump IL2CPP Csharp metadata",
            Self::ParserData => "Dump Data.json && ExcelPaths.json for Parser",
            Self::Script => "Dump Script metadata",
            Self::ScriptV2 => "Dump Il2cpp.h",
            Self::Resources => "Dump Res (runtime dump data)",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ProtoDumpMode {
    ClassFieldNumber,
    MergeFrom,
    WriteTo,
    Asm,
}

impl ProtoDumpMode {
    pub const ALL: [Self; 4] = [
        Self::WriteTo,
        Self::MergeFrom,
        Self::ClassFieldNumber,
        Self::Asm,
    ];

    pub const fn id(self) -> &'static str {
        match self {
            Self::ClassFieldNumber => "class_field_number",
            Self::MergeFrom => "merge_from",
            Self::WriteTo => "write_to",
            Self::Asm => "asm",
        }
    }

    pub const fn label(self) -> &'static str {
        match self {
            Self::ClassFieldNumber => "Class Field Number",
            Self::MergeFrom => "MergeFrom",
            Self::WriteTo => "WriteTo",
            Self::Asm => "Asm",
        }
    }

    pub fn from_id(id: &str) -> Option<Self> {
        match id {
            "class_field_number" => Some(Self::ClassFieldNumber),
            "merge_from" => Some(Self::MergeFrom),
            "write_to" => Some(Self::WriteTo),
            "asm" => Some(Self::Asm),
            _ => None,
        }
    }
}
