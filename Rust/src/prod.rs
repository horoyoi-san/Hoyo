use serde::Deserialize;

#[derive(Deserialize, Debug)]
pub struct ApiResponse {
    pub retcode: i32,
    pub message: String,
    pub data: ResponseData,
}

#[derive(Deserialize, Debug)]
pub struct ResponseData {
    pub game_packages: Vec<GamePackage>,
}

#[derive(Deserialize, Debug)]
pub struct GamePackage {
    pub game: Game,
    pub main: Main,
    #[serde(default)]
    pub res_list_url: String,
    pub pre_download: Option<PreDownload>,
}

#[derive(Deserialize, Debug)]
pub struct Game {
    pub id: String,
    pub biz: String,
}

#[derive(Deserialize, Debug)]
pub struct Main {
    pub major: Major,
}

#[derive(Deserialize, Debug)]
pub struct Major {
    pub version: String,
    pub game_pkgs: Vec<Package>,
    pub audio_pkgs: Vec<Package>,
    pub res_list_url: String,
    #[serde(default)]
    pub patches: Option<Vec<PatchPkg>>,
}

#[derive(Deserialize, Debug)]
pub struct PreDownload {
    pub major: Major,
    #[serde(default)]
    pub patches: Vec<Patch>,
}

#[derive(Deserialize, Debug)]
pub struct Patch {
    pub version: String,
    pub game_pkgs: Vec<Package>,
    pub audio_pkgs: Vec<Package>,
    pub res_list_url: String,
    #[serde(default)]
    pub patches: Option<Vec<PatchPkg>>,
}

#[derive(Deserialize, Debug)]
pub struct Package {
    pub url: String,
    pub md5: String,
    pub size: String,
    pub decompressed_size: String,
}

#[derive(Deserialize, Debug)]
pub struct PatchPkg {
    pub url: String,
    pub md5: String,
    pub size: String,
    pub decompressed_size: String,
}
