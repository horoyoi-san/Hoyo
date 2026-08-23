use std::{cell::RefCell, rc::Rc};

use reflection::serializer::BoxedSerializer;
use serde_json::Value;

#[inline]
fn extract_npc_json_paths(path: &'static str) -> std::io::Result<Vec<String>> {
    let data = std::fs::read(path)?;
    let json: Vec<Value> = serde_json::from_slice(&data)?;
    Ok(json
        .into_iter()
        .filter_map(|item| item.get("NPCJsonPath")?.as_str().map(std::string::ToString::to_string))
        .collect())
}

pub fn dump(serializer: &mut BoxedSerializer) {
    let rogue_npc_paths = [
        "./DUMP/Resources/ExcelOutput/RogueNPC.json",
        "./DUMP/Resources/ExcelOutput/RogueTournNPC.json",
        "./DUMP/Resources/ExcelOutput/RogueMagicNPC.json",
    ]
    .into_iter()
    .filter_map(|path| extract_npc_json_paths(path).ok())
    .flatten()
    .collect::<Vec<_>>();

    let dialogue_paths = Rc::new(RefCell::new(Vec::<String>::new()));
    let dialogue_paths_clone = dialogue_paths.clone();
    serializer.add_callback(
        String::from("DialoguePath"),
        Rc::new(move |value| {
            if let Value::String(value) = value {
                dialogue_paths_clone.borrow_mut().push(value.to_string());
            }
        }),
    );

    let option_paths = Rc::new(RefCell::new(Vec::<String>::new()));
    let option_paths_clone = option_paths.clone();
    serializer.add_callback(
        String::from("OptionPath"),
        Rc::new(move |value| {
            if let Value::String(value) = value {
                option_paths_clone.borrow_mut().push(value.to_string());
            }
        }),
    );

    super::dump_from_config_list("LoadRogueNPCConfig", rogue_npc_paths, serializer);

    super::dump_from_config_list("LoadLevelGraphConfig", dialogue_paths.take(), serializer);
    serializer.remove_callback("DialoguePath");

    super::dump_from_config_list(
        "LoadRogueDialogueEventConfig",
        option_paths.take(),
        serializer,
    );
    serializer.remove_callback("OptionPath");
}
