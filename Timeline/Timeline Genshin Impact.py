from timeline_utils import bangkok_datetime, run_timeline


CONFIG = {
    "game_name": "Genshin Impact",
    "start_dates": {
        "Beta": bangkok_datetime(2026, 7, 1, 10, 0),
        "Release": bangkok_datetime(2026, 8, 12, 10, 0),
    },
    "intervals": {
        "Beta": 42,
        "Release": 42,
    },
    "start_version": 7.0,
    "end_version": 8.0,
    "output_file": "data/hk4e.txt",
}


if __name__ == "__main__":
    run_timeline(CONFIG)
