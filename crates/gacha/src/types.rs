#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Category {
    Character,
    LightCone,
    Standard,
    Beginner,
    CollabCharacter,
    CollabLightCone,
}

pub(crate) const CATEGORY_ORDER: [Category; 6] = [
    Category::Character,
    Category::LightCone,
    Category::Standard,
    Category::Beginner,
    Category::CollabCharacter,
    Category::CollabLightCone,
];

impl Category {
    pub(crate) fn from_gacha_type(gt: u32) -> Option<Self> {
        Some(match gt {
            11 => Self::Character,
            12 => Self::LightCone,
            1 => Self::Standard,
            2 => Self::Beginner,
            21 => Self::CollabCharacter,
            22 => Self::CollabLightCone,
            _ => return None,
        })
    }

    pub fn gacha_type(self) -> u32 {
        match self {
            Self::Character => 11,
            Self::LightCone => 12,
            Self::Standard => 1,
            Self::Beginner => 2,
            Self::CollabCharacter => 21,
            Self::CollabLightCone => 22,
        }
    }

    pub fn name(self) -> &'static str {
        match self {
            Self::Character => "Character Event Warp",
            Self::LightCone => "Light Cone Event Warp",
            Self::Standard => "Stellar Warp (Standard)",
            Self::Beginner => "Departure Warp",
            Self::CollabCharacter => "Collaboration Character Warp",
            Self::CollabLightCone => "Collaboration Light Cone Warp",
        }
    }

    pub fn max_pity(self) -> u32 {
        match self {
            Self::Character | Self::Standard | Self::CollabCharacter => 90,
            Self::LightCone | Self::CollabLightCone => 80,
            Self::Beginner => 50,
        }
    }

    pub(crate) fn has_up(self) -> bool {
        matches!(
            self,
            Self::Character | Self::LightCone | Self::CollabCharacter | Self::CollabLightCone,
        )
    }

    pub(crate) fn idx(self) -> usize {
        CATEGORY_ORDER.iter().position(|c| *c == self).unwrap_or(0)
    }
}

#[derive(Clone, Debug)]
pub struct Pull {
    pub item_id: String,
    pub item_name: String,
    pub item_type: String,
    pub rank: u32,
    pub pity: u32,
    pub time: String,
    pub id: String,
    pub is_up: Option<bool>,
    pub guaranteed: bool,
}

#[derive(Clone, Debug)]
pub struct CategoryReport {
    pub category: Category,
    pub total: usize,
    pub five_count: usize,
    pub four_count: usize,
    pub three_count: usize,
    pub current_pity: u32,
    pub current_four_pity: u32,
    pub avg_five_pity: f64,
    pub avg_four_pity: f64,
    pub up_count: usize,
    pub up_avg_pity: f64,
    pub five_stars: Vec<Pull>,
    pub four_stars: Vec<Pull>,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}

#[derive(Clone, Debug, Default)]
pub struct Tags {
    pub recent: Option<Pull>,
    pub luckiest: Option<Pull>,
    pub unluckiest: Option<Pull>,
    pub craziest_day: Option<(String, usize)>,
}

#[derive(Clone, Debug, Default)]
pub struct Report {
    pub uid: String,
    pub total_pulls: usize,
    pub total_five: usize,
    pub total_four: usize,
    pub categories: Vec<CategoryReport>,
    pub tags: Tags,
    pub start_time: Option<String>,
    pub end_time: Option<String>,
}
