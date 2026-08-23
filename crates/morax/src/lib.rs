pub mod addr;
pub mod attributes;
pub mod crypt;
pub mod dummydll;
pub mod dump;
pub mod error;
pub mod event;
pub mod field;
pub mod generic;
pub mod header;
pub mod il2cpp_header;
pub mod il2cpp_type;
pub mod image;
pub mod metadata;
pub mod method;
pub mod pe;
pub mod property;
pub mod proto;
pub mod res_compiler;
pub mod script;
pub mod string;
pub mod type_def;

pub use crypt::header::Il2CppGlobalMetadataHeader;
pub use error::{Error, Result};
pub use field::Il2CppFieldDefinition;
pub use image::Il2CppImageDefinition;
pub use metadata::Metadata;
pub use method::Il2CppMethodDefinition;
pub use property::Il2CppPropertyDefinition;
pub use proto::{NativeMetadataEngine, NativeProtoEngine, ProtoDumperConfig, ProtoDumperResult};
pub use res_compiler::{ResCompileResult, ResourceCompiler};
pub use type_def::Il2CppTypeDefinition;

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_dump_metadata() {
        let res = NativeMetadataEngine::dump_metadata(None, None, &PathBuf::from("../../DUMP")).unwrap();
        println!("Metadata result: {:?}", res);
    }

    #[test]
    fn test_dump_proto() {
        let config = NativeProtoEngine::resolve_config(
            None,
            Some("../../DUMP/Morax_Static/methods.json"),
            Some("../../DUMP/Morax_Static/dump.cs"),
            None,
            Some("../../DUMP"),
        );
        let res = NativeProtoEngine::dump_proto(&config).unwrap();
        println!("Proto result: {:?}", res);
    }

    #[test]
    fn test_resource_compiler() {
        let res_dir = PathBuf::from("./Resources");
        let out_file = PathBuf::from("../../DUMP/Morax_Static/test_res.json");
        if res_dir.is_dir() {
            let res = ResourceCompiler::compile_from_directory(&res_dir, &out_file).unwrap();
            println!("Res compile result: {:?}", res);
        }
    }
}

