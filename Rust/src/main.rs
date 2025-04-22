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
        "https://discord.com/api/webhooks/1291725154937999444/CeBZotZNDREE7KM7mFx7DJ--Z2TD8tKKmfgZ8gqPUrLs2Bs2rALXjm6HPqv_VKNxGfQJ",

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

// Function to create a Discord message
fn create_discord_message(api_response: &ApiResponse) -> serde_json::Value {
    let game_package = &api_response.data.game_packages[0];

    let mut embeds = vec![];

    // Game packages
    let mut game_pkg_fields = vec![json!( {
        "name": "Version",
        "value": &game_package.main.major.version,
        "inline": true
    })];

    for (i, pkg) in game_package.main.major.game_pkgs.iter().take(11).enumerate() {
        game_pkg_fields.push(json!( {
            "name": format!("Game Package {}", i + 1),
            "value": format!("URL: {}", pkg.url),
            "inline": false
        }));
    }

    embeds.push(json!( {
        "title": format!("Game ID: {}", game_package.game.id),
        "fields": game_pkg_fields
    }));

    // Audio packages (Remove MD5, Size, and Decompressed size)
    let mut audio_fields = vec![];
    for audio in &game_package.main.major.audio_pkgs {
        audio_fields.push(json!( {
            "name": format!("Audio language: {}", audio.language), // Removed language info
            "value": format!("URL: {}", audio.url),
            "inline": false
        }));
    }

    embeds.push(json!( {
        "title": "Audio Packages",
        "fields": audio_fields
    }));

    // Resource list URL
    embeds.push(json!( {
        "title": "Resource List",
        "fields": [json!( {
            "name": "res_list_url",
            "value": game_package.main.major.res_list_url,
            "inline": false
        })]
    }));

    // Pre-download (if exists)
    if let Some(pre) = &game_package.pre_download {
        let mut pre_fields = vec![json!( {
            "name": "PreDownload Version",
            "value": &pre.major.version,
            "inline": true
        })];

        for (i, pkg) in pre.major.game_pkgs.iter().take(11).enumerate() {
            pre_fields.push(json!( {
                "name": format!("PreDownload GamePkg {}", i + 1),
                "value": pkg.url,
                "inline": false
            }));
        }

        // Add Audio Packages for Pre-download
        let mut pre_audio_fields = vec![];
        for audio in &pre.major.audio_pkgs {
            pre_audio_fields.push(json!( {
                "name": format!("Pre-Download Audio {}", audio.language), // Removed language info
                "value": format!("URL: {}", audio.url),
                "inline": false
            }));
        }

        // Add Resource List URL for Pre-download
        let pre_res_list_url = json!( {
            "name": "Pre-Download Resource List URL",
            "value": pre.major.res_list_url,
            "inline": false
        });

        embeds.push(json!( {
            "title": "Pre-Download",
            "fields": pre_fields
        }));

        embeds.push(json!( {
            "title": "Pre-Download Audio Packages",
            "fields": pre_audio_fields
        }));

        embeds.push(json!( {
            "title": "Pre-Download Resource List",
            "fields": [pre_res_list_url]
        }));
    }

    // Add patches
    let mut patches_fields = vec![];
    if let Some(patches) = &game_package.main.major.patches {
        for patch in patches {
            // Iterate over game packages
            for pkg in &patch.game_packages {
                patches_fields.push(json!( {
                    "name": "Game Package",
                    "value": format!("URL: {}", pkg.url),
                    "inline": false
                }));
            }
            
            // Iterate over audio packages
            for audio_pkg in &patch.audio_pkgs {
                patches_fields.push(json!( {
                    "name": format!("Audio Package - {}", audio_pkg.language),
                    "value": format!("URL: {}", audio_pkg.url),
                    "inline": false
                }));
            }
        }

        // Add the patches section to the embed
        embeds.push(json!( {
            "title": "Patches",
            "fields": patches_fields
        }));
    }

    json!( {
        "content": "**Zenless Zone Zero Update **",
        "embeds": embeds
    })
}
