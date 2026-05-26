from timeline_utils import bangkok_datetime, run_timeline


CONFIG = {
    "game_name": "Honkai Star Rail",
    "start_dates": {
        "Drip": bangkok_datetime(2025, 12, 30, 11, 0),
        "Beta": bangkok_datetime(2026, 1, 6, 10, 0),
        "Release": bangkok_datetime(2026, 2, 18, 10, 0),
    },
    "intervals": {
        "Drip": 42,
        "Beta": 42,
        "Release": 42,
    },
    "phase_labels": {
        "Drip": "Drip",
        "Beta": "Beta",
        "Release": "Release",
    },
    "start_version": 4.0,
    "end_version": 15.0,
    "output_file": "data/hkrpg_42+21.txt",
    "bullet": True,
}


if __name__ == "__main__":
    run_timeline(CONFIG)
