use reflection::serializer::BoxedSerializer;
use serde_json::{Map, Value};
use std::fs;

pub fn dump(serializer: &mut BoxedSerializer) {
    let chess_board_data: Vec<Map<String, Value>> = serde_json::from_slice(
        &fs::read("./DUMP/Resources/ExcelOutput/RogueDLCChessBoard.json").unwrap(),
    )
    .unwrap();

    let paths: Vec<_> = chess_board_data
        .iter()
        .map(|data| {
            data.get("ChessBoardConfiguration")
                .unwrap()
                .as_str()
                .unwrap()
                .to_string()
        })
        .collect();

    super::dump_from_config_list("LoadRogueChestMapConfig", paths, serializer);
}
