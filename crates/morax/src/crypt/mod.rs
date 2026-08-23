// void *MetadataCache::Register()
// {
//   qword_8E5B0F8 = (__int64)&off_3FD82F0;        // Il2CppCodeRegistration
//   qword_8E5B100 = (__int64)&unk_43FBFC8;        // Il2CppMetadataRegistration
//   qword_8E5B108 = (__int64)&off_43FC070;        // metadataUsages
//   qword_8E5B110 = (__int64)&unk_3FD8390;        // Il2CppCodeGenOptions
//   qword_8E5B118 = (__int64)&unk_438AD90;        // Il2CppGlobalMetadataHeader
//   dword_8E5ACC0 = 4895;
//   qword_8E5ACC8 = (__int64)&qword_8720460;
//   qword_8E5ACD0 = (__int64)&unk_438AFA0;
//   return &unk_438AFA0;
// }

// off_3FD82F0     dq offset off_438FC20 // invokerPointers
//                 dq offset off_4959920 // reversePInvokeWrappers
//                 dq offset off_3FD8640 // genericMethodPointers

pub mod attributes;
pub mod default_value;
pub mod event;
pub mod field;
pub mod generic;
pub mod generic_table;
pub mod header;
pub mod il2cpp_type;
pub mod image;
pub mod invoker;
pub mod method;
pub mod param;
pub mod property;
pub mod script;
pub mod string;
pub mod token;
pub mod type_def;
