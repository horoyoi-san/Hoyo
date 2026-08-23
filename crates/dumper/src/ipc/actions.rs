use std::path::Path;

use hsr_ipc::{DumperAction, ProtoDumpMode};

use crate::{csharp, parser_data, proto, res, runtime, script, script_v2};

pub fn run(action: DumperAction) -> anyhow::Result<()> {
    ensure_dump_folder()?;
    runtime::init_default();
    runtime::attach_current_thread_to_il2cpp();

    match action {
        DumperAction::Proto { mode } => dump_proto(mode)?,
        DumperAction::CSharp => csharp::dump(false)?,
        DumperAction::ParserData => parser_data::dump(),
        DumperAction::Script => script::dump(),
        DumperAction::ScriptV2 => script_v2::dump(),
        DumperAction::Resources => res::dump(),
    }

    Ok(())
}

pub fn ensure_dump_folder() -> std::io::Result<()> {
    let folder = Path::new("./DUMP/IL2CPP_Dumper");
    if !folder.is_dir() {
        std::fs::create_dir_all(folder)?;
    }
    Ok(())
}

fn dump_proto(mode: ProtoDumpMode) -> anyhow::Result<()> {
    ensure_dump_folder()?;
    proto::dump(
        &mut std::fs::File::create("./DUMP/IL2CPP_Dumper/StarRail.proto")?,
        &mut std::fs::File::create("./DUMP/IL2CPP_Dumper/packetIds.json")?,
        map_proto_mode(mode),
        false,
    )?;
    Ok(())
}

fn map_proto_mode(mode: ProtoDumpMode) -> proto::ProtoDumpMode {
    match mode {
        ProtoDumpMode::ClassFieldNumber => proto::ProtoDumpMode::ClassFieldNumber,
        ProtoDumpMode::MergeFrom => proto::ProtoDumpMode::MergeFrom,
        ProtoDumpMode::WriteTo => proto::ProtoDumpMode::WriteTo,
        ProtoDumpMode::Asm => proto::ProtoDumpMode::Asm,
    }
}
