from timeline_utils import bangkok_datetime, run_timeline


CONFIG = {
    "game_name": "Honkai Impact 3",
    "start_dates": {
        "Beta": bangkok_datetime(2025, 6, 27, 14, 0),
        "Release": bangkok_datetime(2025, 8, 30, 14, 0),
    },
    "intervals": {
        "Beta": 64,
        "Release": 64,
    },
    "start_version": 8.4,
    "end_version": 15.0,
    "output_file": "data/bh3.txt",
}


if __name__ == "__main__":
    run_timeline(CONFIG)
