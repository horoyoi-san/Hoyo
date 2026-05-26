from timeline_utils import bangkok_datetime, run_timeline


CONFIG = {
    "game_name": "Honkai Nexus Anima",
    "start_dates": {
        "Beta": bangkok_datetime(2025, 7, 1, 10, 0),
        "Release": bangkok_datetime(2025, 8, 13, 10, 0),
    },
    "intervals": {
        "Beta": 42,
        "Release": 42,
    },
    "start_version": 1.0,
    "end_version": 8.0,
    "output_file": "data/abc.txt",
}


if __name__ == "__main__":
    run_timeline(CONFIG)
