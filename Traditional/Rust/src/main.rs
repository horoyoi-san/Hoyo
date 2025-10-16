use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tokio;

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
    pub audio_pkgs: Vec<AudioPackage>,
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
    pub audio_pkgs: Vec<AudioPackage>,
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
pub struct AudioPackage {
    pub language: String,
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
    pub game_packages: Vec<Package>,
    pub audio_pkgs: Vec<AudioPackage>,
}

#[tokio::main]
async fn main() {
    let client = Client::new();

    // Fetch data from API
    let url = "https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?game_ids%5B%5D=U5hbdsT9W7&launcher_id=VYTpXlbWo8";
    let res = client.get(url).send().await.unwrap();

    // Check the status of the response
    if !res.status().is_success() {
        println!("Failed to fetch data from API");
        return;
    }

    // Deserialize the JSON data into ApiResponse
    let api_response: ApiResponse = res.json().await.unwrap();

    // Send Discord notifications
    send_discord_notifications(&api_response).await;
}

async fn send_discord_notifications(api_response: &ApiResponse) {
    // URLs ของ Discord Webhook
    let discord_webhook_urls = vec![
        "YOUR_DISCORD_WEBHOOK_URL",

    ];

    let discord_message = create_discord_message(api_response);

    // ส่งข้อมูลไปยังแต่ละ webhook URL
    for url in discord_webhook_urls {
        let client = reqwest::Client::new();
        let response = client
            .post(url)
            .json(&discord_message)
            .send()
            .await;

        match response {
            Ok(resp) => {
                if resp.status().is_success() {
                    println!("ส่งข้อความไปยัง Discord สำเร็จที่ URL: {}", url);
                } else {
                    println!("ส่งข้อความไปยัง Discord ล้มเหลวที่ URL: {}. สถานะ: {}", url, resp.status());
                }
            }
            Err(e) => {
                println!("เกิดข้อผิดพลาดขณะส่งข้อความไปยัง Discord ที่ URL: {}. ข้อผิดพลาด: {}", url, e);
            }
        }
    }
}

fn create_discord_message(api_response: &ApiResponse) -> String {
    // ตรวจสอบและดึงข้อมูลจาก game_packages โดยไม่ทำให้โปรแกรมล้มเหลว
    let game_package = &api_response.data.game_packages.get(0); // Safe access to first item
    if let Some(game_package) = game_package {
        let game_pkg = &game_package.game;
        let main = &game_package.main;

        // ใช้ Option ในการจัดการกับค่าที่อาจจะเป็น null
        let version = main.major.version.clone(); // ถ้าขาดข้อมูลจะใช้ค่าเริ่มต้น
        let audio_packages: String = main.major.audio_pkgs.iter().map(|pkg| {
            format!(
                "**{}:** [{}]({})",
                pkg.language, pkg.url, pkg.url
            )
        }).collect::<Vec<String>>().join("\n");

        // สร้างข้อความ Discord
        let message = json!({
            "content": "Patch Update Information:",
            "embeds": [
                {
                    "title": "Zenless Zone Zero Patch Updates",
                    "description": "Details for game and audio packages in patch versions 1.6.0 and 1.5.0.",
                    "fields": [
                        {
                            "name": format!("Patch Version {}", version),
                            "value": format!(
                                "**Game Package:**\nURL: {}\n\n**Audio Packages:**\n{}",
                                game_pkg.biz, // ใช้ข้อมูลที่มีจากเกม
                                audio_packages
                            )
                        }
                    ]
                }
            ]
        });

        serde_json::to_string(&message).unwrap_or_default()
    } else {
        // ถ้าไม่พบ game_package จะส่งข้อความแสดงข้อผิดพลาด
        serde_json::to_string(&json!({
            "content": "Error: No game packages found in the response."
        })).unwrap_or_default()
    }
}
