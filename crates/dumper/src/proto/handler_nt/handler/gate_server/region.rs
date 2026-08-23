use super::decoder::{self, DecodedValue};

#[derive(Debug, Default)]
pub struct RegionInfo {
    #[allow(dead_code)]
    pub name: String,
    #[allow(dead_code)]
    pub title: String,
    pub dispatch_url: String,
    #[allow(dead_code)]
    pub env_type: String,
    #[allow(dead_code)]
    pub display_name: String,
    #[allow(dead_code)]
    pub stop_desc: String,
    pub sub_dispatch_url: String,
}

#[derive(Debug)]
pub struct Dispatch {
    pub retcode: u32,
    pub stop_desc: String,
    #[allow(dead_code)]
    pub top_sever_region_name: String,
    pub region_list: Vec<RegionInfo>,
}

fn get_string(fields: &[decoder::Decoded], num: u32) -> String {
    fields
        .iter()
        .find(|f| f.field == num)
        .and_then(|f| {
            if let DecodedValue::Buffer(ref b) = f.value {
                String::from_utf8(b.clone()).ok()
            } else {
                None
            }
        })
        .unwrap_or_default()
}

fn get_varint(fields: &[decoder::Decoded], num: u32) -> u32 {
    fields
        .iter()
        .find(|f| f.field == num)
        .and_then(|f| {
            if let DecodedValue::BigInt(v) = f.value {
                Some(v as u32)
            } else {
                None
            }
        })
        .unwrap_or(0)
}

impl Dispatch {
    pub fn from_wire(result: decoder::DecodingResult) -> Option<Self> {
        let fields = &result.fields;
        Some(Dispatch {
            retcode: get_varint(fields, 1),
            stop_desc: get_string(fields, 5),
            top_sever_region_name: get_string(fields, 3),
            region_list: fields
                .iter()
                .filter(|f| f.field == 4)
                .filter_map(|f| {
                    if let DecodedValue::Nested(ref r) = f.value {
                        Some(RegionInfo::from_wire(&r.fields))
                    } else {
                        None
                    }
                })
                .collect(),
        })
    }
}

impl RegionInfo {
    pub fn from_wire(fields: &[decoder::Decoded]) -> Self {
        RegionInfo {
            name: get_string(fields, 1),
            title: get_string(fields, 2),
            dispatch_url: get_string(fields, 3),
            env_type: get_string(fields, 4),
            display_name: get_string(fields, 5),
            stop_desc: get_string(fields, 6),
            sub_dispatch_url: get_string(fields, 7),
        }
    }
}
