use rand::rngs::SmallRng;
use rand::{Rng, SeedableRng};
use rayon::prelude::*;

#[derive(Clone, Copy)]
pub struct PullOdds {
    pub next_1: f64,
    pub next_10: f64,
}

const SIMS: u64 = 100_000;

fn params(max_pity: u32) -> (u32, f64, u32) {
    match max_pity {
        90 => (74, 0.006, 90),
        80 => (64, 0.008, 80),
        _ => (0, 0.0, 0),
    }
}

fn rate(pity: u32, soft_pity: u32, base: f64, hard: u32) -> f64 {
    if pity + 1 >= hard {
        1.0
    } else {
        (base + 0.06 * (pity as f64 - soft_pity as f64 + 1.0).max(0.0)).min(1.0)
    }
}

pub fn pity_odds(start_pity: u32, max_pity: u32) -> PullOdds {
    let (soft_pity, base_rate, hard_pity) = params(max_pity);
    if hard_pity == 0 {
        return PullOdds { next_1: 0.0, next_10: 0.0 };
    }

    let next_1 = rate(start_pity, soft_pity, base_rate, hard_pity);

    let in_10 = (0..SIMS)
        .into_par_iter()
        .map_init(SmallRng::from_os_rng, |rng, _| {
            for pity in start_pity..start_pity + 10 {
                if rate(pity, soft_pity, base_rate, hard_pity) > rng.random::<f64>() {
                    return 1u64;
                }
            }
            0
        })
        .reduce(|| 0u64, |a, b| a + b);

    PullOdds {
        next_1,
        next_10: in_10 as f64 / SIMS as f64,
    }
}
