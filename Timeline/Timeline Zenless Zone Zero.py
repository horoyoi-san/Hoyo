from timeline_utils import bangkok_datetime, run_timeline


CONFIG = {
    "game_name": "Zenless Zone Zero",
    "start_dates": {
        "Beta": bangkok_datetime(2025, 10, 13, 10, 0),
        "Release": bangkok_datetime(2025, 11, 26, 10, 0),
    },
    "intervals": {
        "Beta": 42,
        "Release": 42,
    },
    "start_version": 2.4,
    "end_version": 8.0,
    "output_file": "data/nap.txt",
}


if __name__ == "__main__":
    run_timeline(CONFIG)
