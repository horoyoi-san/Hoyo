use morax::ResourceCompiler;
use std::{env, fs, path::PathBuf, process};

fn main() {
    let args: Vec<String> = env::args().collect();
    let input = args
        .get(1)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("Resources"));
    let output = args
        .get(2)
        .map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from("res.json"));

    if !input.is_dir() {
        eprintln!(
            "Error: Resources directory not found: {}",
            input.display()
        );
        process::exit(1);
    }

    match ResourceCompiler::compile_from_directory(&input, &output) {
        Ok(res) => {
            println!("{}", res.message);
            println!(
                "  entrances: {}, avatars: {}, scene groups: {}, time: {}s",
                res.total_entrances, res.total_avatars, res.total_groups, res.time_seconds
            );

            if let Ok(content) = fs::read(&output) {
                let _ = fs::create_dir_all("bin");
                let _ = fs::write("bin/res.json", &content);
                println!("  synced: ./bin/res.json");
            }
        }
        Err(e) => {
            eprintln!("Resource Compiler Error: {e}");
            process::exit(1);
        }
    }
}
