use reflection::serializer::BoxedSerializer;
use serde_json::Value;

#[inline]
fn extract_caption_paths(path: &'static str) -> std::io::Result<Vec<String>> {
    let data = std::fs::read(path)?;
    let json: Vec<Value> = serde_json::from_slice(&data)?;
    Ok(json
        .into_iter()
        .filter_map(|item| item.get("CaptionPath")?.as_str().map(std::string::ToString::to_string))
        .collect())
}

pub fn dump(serializer: &mut BoxedSerializer) {
    let paths = [
        "./DUMP/Resources/ExcelOutput/VideoConfig.json",
        "./DUMP/Resources/ExcelOutput/CutSceneConfig.json",
        "./DUMP/Resources/ExcelOutput/LoopCGConfig.json",
    ]
    .into_iter()
    .filter_map(|path| extract_caption_paths(path).ok())
    .flatten()
    .collect::<Vec<_>>();

    super::dump_from_config_list("LoadVideoCaptionConfig", paths, serializer);
}
