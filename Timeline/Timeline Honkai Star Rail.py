from timeline_utils import bangkok_datetime, run_timeline


CONFIG = {
    "game_name": "Honkai Star Rail",
    "start_dates": {
        "Beta": bangkok_datetime(2026, 4, 21, 10, 0),
        "Release": bangkok_datetime(2026, 6, 3, 10, 0),
    },
    "intervals": {
        "Beta": 42,
        "Release": 42,
    },
    "start_version": 4.3,
    "end_version": 8.0,
    "output_file": "data/hkrpg.txt",
}


if __name__ == "__main__":
    run_timeline(CONFIG)
