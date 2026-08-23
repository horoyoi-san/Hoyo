use reflection::serializer::BoxedSerializer;
use serde_json::{Map, Value};
use std::fs;

pub fn dump(serializer: &mut BoxedSerializer) {
    let summon_unit_data: Vec<Map<String, Value>> = serde_json::from_slice(
        &fs::read("./DUMP/Resources/ExcelOutput/SummonUnitData.json").unwrap(),
    )
    .unwrap();

    let paths: Vec<_> = summon_unit_data
        .iter()
        .map(|data| data.get("JsonPath").unwrap().as_str().unwrap().to_string())
        .collect();

    super::dump_from_config_list("LoadSummonUnitConfig", paths, serializer);
}
