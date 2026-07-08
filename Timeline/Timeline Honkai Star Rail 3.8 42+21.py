from timeline_utils import bangkok_datetime, run_timeline


CONFIG = {
    "game_name": "Honkai Star Rail",
    "start_dates": {
        "Drip": bangkok_datetime(2025, 4, 6, 11, 0),
        "Beta": bangkok_datetime(2026, 4, 21, 10, 0),
        "Live": bangkok_datetime(2026, 5, 22, 10, 0),
        "Predownload": bangkok_datetime(2026, 6, 1, 13, 0),
        "Release": bangkok_datetime(2026, 6, 3, 10, 0),
    },
    "intervals": {
        "Drip": 42,
        "Beta": 42,
        "Live": 42,
        "Predownload": 42,
        "Release": 42,
    },
    "phase_labels": {
        "Drip": "Drip",
        "Beta": "Beta",
        "Live": "Live",
        "Predownload": "Predownload",
        "Release": "Release",
    },
    "start_version": 4.3,
    "end_version": 8.0,
    "output_file": "data/hkrpg_42+21.txt",
    "bullet": True,
}


if __name__ == "__main__":
    run_timeline(CONFIG)