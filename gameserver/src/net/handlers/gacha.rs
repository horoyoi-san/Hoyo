pub use super::*;

pub async fn on_get_gacha_info_cs_req(
    _session: &mut PlayerSession,
    _req: &GetGachaInfoCsReq,
    res: &mut GetGachaInfoScRsp,
) {
    res.gacha_info_list = vec![GachaInfo {
        end_time: 1924992000,
        begin_time: 0,
        gacha_ceiling: Some(GachaCeiling::default()),
        prize_item_list: vec![8001,],
        item_detail_list: vec![
        8001,
        ],
        gacha_id: 1001,
        ..Default::default()
    }];
}

pub async fn on_do_gacha_cs_req(
    _session: &mut PlayerSession,
    req: &DoGachaCsReq,
    res: &mut DoGachaScRsp,
) {
    res.gacha_id = req.gacha_id;
    res.gacha_num = req.gacha_num;

    let item_ids = [
        
        8001, 8002, 8003, 8004, 8005, 8006, 8007, 8008, 8009, 8010,
        //Avatars
        //The Preservation
        1104, 1001, 1208, 1304, 1414,
        //The Erudition
        1201, 1103, 1013, 1003, 1204, 1302, 1314, 1317, 1401, 1405, 1501, 1508,
        //The Abundance
        1211, 1105, 1203, 1110, 1217, 1301, 1222,
        //The Hunt
        1209, 1206, 1102, 1002, 1112, 1305, 1315, 1224, 1223, 1220, 1015, 1504,
        //The Harmony
        1202, 1101, 1009, 1207, 1215, 1303, 1306, 8006, 8005, 1309, 1313, 1403, 1412,
        //The Nihility
        1108, 1106, 1004, 1006, 1111, 1005, 1210, 1307, 1308, 1218, 1225, 1406, 1410, 1321, 1507,
        //The Destruction
        1109, 1107, 1008, 1205, 1213, 1212, 1214, 1321, 1310, 1221, 1404, 1408, 1014, 1509,
        //The Remembrance
        1402, 1407, 1409, 1413, 1415, 1512,
        //The Elation
        1502, 1501, 1506, 1505, 1513, 1503,

        //LC
        //The Preservation
        20003, 20010, 20017, 21002, 21009, 21016, 21023, 21030, 21039, 21043, 21053, 23005, 23011, 23023, 23051, 24002,
        //The Erudition
        20006, 20013, 20020, 21006, 21013, 21020, 21027, 21034, 21040, 21045, 21060, 22004, 23000, 23010, 23018, 23028, 23033, 23037, 23041, 23060, 23061, 24004,
        //The Abundance
        20001, 20008, 20015, 21000, 21007, 21014, 21021, 21028, 21035, 21048, 21055, 22001, 23008, 23013, 23017, 23032,
        //The Hunt
        20000, 20007, 20014, 21003, 21010, 21017, 21024, 21031, 21037, 21047, 21062, 22008, 23001, 23012, 23016, 23020, 23027, 23031, 23046, 23056, 24001,
        //The Harmony
        20005, 20012, 20019, 21004, 21011, 21018, 21025, 21032, 21036, 21046, 21056, 22002, 22005, 23003, 23019, 23021, 23026, 23034, 23038, 23048,
        //The Nihility
        20004, 20011, 20018, 21001, 21008, 21015, 21022, 21029, 21041, 21044, 21061, 22000, 23004, 23006, 23007, 23022, 23024, 23029, 23035, 23043, 23047, 23050, 23059, 24003,
        //The Destruction
        20002, 20009, 20016, 21005, 21012, 21019, 21026, 21033, 21038, 21042, 21058, 22003, 23002, 23009, 23014, 23015, 23025, 23030, 23039, 23044, 23045, 23062, 24000,
        //The Remembrance
        20021, 20022, 21050, 21051, 21052, 21054, 21057, 22006, 23036, 23040, 23042, 23049, 23052, 23063, 24005,
        //The Elation
        20023, 20024, 21064, 21065, 21066, 22007, 23053, 23054, 23057, 23058, 23064, 24006, 23055,
    ];

    res.gacha_item_list = (0..req.gacha_num)
        .map(|_| {
            let random_index = rand::random_range(0..item_ids.len());

            GachaItem {
                is_new: false,
                gacha_item: Some(Item {
                    item_id: item_ids[random_index],
                    ..Default::default()
                }),
                token_item: Some(ItemList {
                    item_list: vec![Item {
                        item_id: 251,
                        num: 100,
                        ..Default::default()
                    }],
                }),
                transfer_item_list: Some(ItemList {
                    item_list: vec![],
                }),
            }
        })
        .collect();
}