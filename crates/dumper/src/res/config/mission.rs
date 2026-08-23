use std::{cell::RefCell, collections::HashSet, rc::Rc};

use reflection::serializer::BoxedSerializer;
use serde_json::{Map, Value};

fn read_performance(name: &str, out: &mut HashSet<String>) {
    let entries = serde_json::from_slice::<Vec<Value>>(
        &std::fs::read(format!("./DUMP/Resources/ExcelOutput/{name}.json")).unwrap(),
    )
    .unwrap();

    for item in entries {
        let Some(Value::String(performance_path)) =
            item.get("PerformancePath").or_else(|| item.get("ActPath"))
        else {
            continue;
        };
        out.insert(performance_path.to_string());
    }
}

fn dump_level_graphs(serializer: &mut BoxedSerializer) {
    let mut performances = HashSet::new();
    read_performance("PerformanceA", &mut performances);
    read_performance("PerformanceC", &mut performances);
    read_performance("PerformanceCG", &mut performances);
    read_performance("PerformanceD", &mut performances);
    read_performance("PerformanceDS", &mut performances);
    read_performance("PerformanceE", &mut performances);
    read_performance("PerformanceVideo", &mut performances);
    read_performance("DialogueNPC", &mut performances);
    super::dump_from_config_list(
        "LoadLevelGraphConfig",
        performances.into_iter().collect(),
        serializer,
    );
}

fn dump_mission_info(serializer: &mut BoxedSerializer) {
    let chess_board_data: Vec<Map<String, Value>> = serde_json::from_slice(
        &std::fs::read("./DUMP/Resources/ExcelOutput/MainMission.json").unwrap(),
    )
    .unwrap();

    let main_mission_paths = chess_board_data
        .iter()
        .filter_map(|data| {
            if let Some(Value::Number(mission_id)) = data.get("MainMissionID") {
                Some(format!(
                    "Config/Level/Mission/{mission_id}/MissionInfo_{mission_id}.json"
                ))
            } else {
                None
            }
        })
        .collect::<HashSet<_>>();

    let sub_mission_paths = Rc::new(RefCell::new(Vec::<String>::new()));
    let sub_mission_paths_clone = sub_mission_paths.clone();

    serializer.add_callback(
        String::from("MissionJsonPath"),
        Rc::new(move |value| {
            if let Value::String(value) = value {
                sub_mission_paths_clone.borrow_mut().push(value.to_string());
            }
        }),
    );

    super::dump_from_config_list(
        "LoadMainMissionInfoConfig",
        main_mission_paths.into_iter().collect(),
        serializer,
    );

    serializer.remove_callback("MissionJsonPath");

    super::dump_from_config_list("LoadLevelGraphConfig", sub_mission_paths.take(), serializer);
}

pub fn dump(serializer: &mut BoxedSerializer) {
    dump_mission_info(serializer);
    dump_level_graphs(serializer);
}
