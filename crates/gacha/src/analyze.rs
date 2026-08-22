use std::collections::{HashMap, HashSet};

use rayon::prelude::*;

use crate::fetch::Record;
use crate::types::*;

const STANDARD_5STAR_CHARS: &[u32] = &[
    1003, 1004, 1101, 1104, 1107, 1209, 1211, 1006, 1102, 1205, 1208, 1221, 1302,
];

const STANDARD_5STAR_LIGHTCONES: &[u32] = &[
    23000, 23001, 23002, 23003, 23004, 23005, 23012, 23013,
];

fn parse_id(r: &Record) -> u32 {
    r.item_id.parse().unwrap_or(0)
}

fn rank(r: &Record) -> u32 {
    r.rank_type.parse().unwrap_or(0)
}

fn gacha_type(r: &Record) -> u32 {
    r.gacha_type.parse().unwrap_or(0)
}

fn build_standard_pool(records: &[Record]) -> HashSet<u32> {
    let mut pool: HashSet<u32> = STANDARD_5STAR_CHARS.iter().copied().collect();
    pool.extend(STANDARD_5STAR_LIGHTCONES.iter().copied());
    for r in records {
        let gt = gacha_type(r);
        if (gt == 1 || gt == 2) && rank(r) == 5 {
            pool.insert(parse_id(r));
        }
    }
    pool
}

fn avg(sum: u64, count: usize) -> f64 {
    if count == 0 {
        return 0.0;
    }
    (sum as f64 / count as f64 * 100.0).round() / 100.0
}

pub fn analyze(records: &[Record]) -> Report {
    let uid = records
        .iter()
        .find_map(|r| {
            if r.uid.is_empty() {
                None
            } else {
                Some(r.uid.clone())
            }
        })
        .unwrap_or_default();

    let standard_pool = build_standard_pool(records);
    let mut groups: [Vec<&Record>; 6] = Default::default();

    for r in records {
        if let Some(cat) = Category::from_gacha_type(gacha_type(r)) {
            groups[cat.idx()].push(r);
        }
    }

    let categories: Vec<CategoryReport> = groups
        .par_iter_mut()
        .enumerate()
        .filter(|(_, recs)| !recs.is_empty())
        .map(|(i, recs)| {
            recs.sort_by(|a, b| a.id.cmp(&b.id));
            compute_category(CATEGORY_ORDER[i], recs, &standard_pool)
        })
        .collect();

    let total_pulls = categories.iter().map(|c| c.total).sum();
    let total_five = categories.iter().map(|c| c.five_count).sum();
    let total_four = categories.iter().map(|c| c.four_count).sum();
    let tags = compute_tags(&categories, records);
    let start_time = categories
        .iter()
        .filter_map(|c| c.start_time.as_ref())
        .min()
        .cloned();
    let end_time = categories
        .iter()
        .filter_map(|c| c.end_time.as_ref())
        .max()
        .cloned();

    Report {
        uid,
        total_pulls,
        total_five,
        total_four,
        categories,
        tags,
        start_time,
        end_time,
    }
}

fn compute_category(
    category: Category,
    records: &[&Record],
    standard_pool: &HashSet<u32>,
) -> CategoryReport {
    let len = records.len();
    let start_time = records.first().map(|r| r.time.clone());
    let end_time = records.last().map(|r| r.time.clone());
    let has_up = category.has_up();

    let mut five_stars = Vec::new();
    let mut four_stars = Vec::new();
    let mut three_count = 0usize;
    let mut pity: u32 = 0;
    let mut four_pity: u32 = 0;
    let mut sum_five: u64 = 0;
    let mut sum_four: u64 = 0;
    let mut loss = false;

    for r in records {
        pity += 1;
        four_pity += 1;

        match rank(r) {
            5 => {
                sum_five += pity as u64;
                let id = parse_id(r);
                let up = has_up && !standard_pool.contains(&id);
                five_stars.push(Pull {
                    item_id: r.item_id.clone(),
                    item_name: r.name.clone(),
                    item_type: r.item_type.clone(),
                    rank: 5,
                    pity,
                    time: r.time.clone(),
                    id: r.id.clone(),
                    is_up: if has_up { Some(up) } else { None },
                    guaranteed: up && loss,
                });
                loss = has_up && !up;
                pity = 0;
            }
            4 => {
                sum_four += four_pity as u64;
                four_stars.push(Pull {
                    item_id: r.item_id.clone(),
                    item_name: r.name.clone(),
                    item_type: r.item_type.clone(),
                    rank: 4,
                    pity: four_pity,
                    time: r.time.clone(),
                    id: r.id.clone(),
                    is_up: None,
                    guaranteed: false,
                });
                four_pity = 0;
            }
            3 => three_count += 1,
            _ => {}
        }
    }

    let five_count = five_stars.len();
    let four_count = four_stars.len();
    let up_count = five_stars.iter().filter(|p| p.is_up == Some(true)).count();
    let up_pity: u64 = five_stars
        .iter()
        .filter(|p| p.is_up == Some(true))
        .map(|p| p.pity as u64)
        .sum();

    CategoryReport {
        category,
        total: len,
        five_count,
        four_count,
        three_count,
        current_pity: pity,
        current_four_pity: four_pity,
        avg_five_pity: avg(sum_five, five_count),
        avg_four_pity: avg(sum_four, four_count),
        up_count,
        up_avg_pity: avg(up_pity, up_count),
        five_stars,
        four_stars,
        start_time,
        end_time,
    }
}

fn compute_tags(categories: &[CategoryReport], records: &[Record]) -> Tags {
    let all_five: Vec<&Pull> = categories.iter().flat_map(|c| &c.five_stars).collect();

    let recent = all_five
        .iter()
        .max_by(|a, b| a.id.cmp(&b.id))
        .copied()
        .cloned();
    let luckiest = all_five.iter().min_by_key(|p| p.pity).copied().cloned();
    let unluckiest = all_five.iter().max_by_key(|p| p.pity).copied().cloned();

    let mut by_day: HashMap<&str, usize> = HashMap::new();
    for r in records {
        let day = r.time.split(' ').next().unwrap_or("");
        if !day.is_empty() {
            *by_day.entry(day).or_default() += 1;
        }
    }
    let craziest_day = by_day
        .into_iter()
        .max_by_key(|(_, n)| *n)
        .map(|(d, n)| (d.to_string(), n));

    Tags {
        recent,
        luckiest,
        unluckiest,
        craziest_day,
    }
}
