use iced_x86::{Decoder, DecoderOptions, Instruction, Mnemonic, OpKind, Register};
use il2cpp::{
    CLASS_TABLE,
    vm::{
        class::Il2CppClass, method::Il2CppMethod, string::Il2CppString,
        r#type::Il2CppTypeNameFormat, value::Il2CppValue,
    },
};
use reflection::{method_info::MethodInfo, runtime_type::RuntimeType};
use std::{borrow::Cow, collections::HashMap, sync::LazyLock};
use utils::{game_assembly_slice, scan_ga_section};

use crate::script_v2::{
    models::{
        ScriptMetadata, ScriptMetadataMethod, ScriptMethod, ScriptMethodInvoker, ScriptString,
        StringLiteralOutput, StructRGCTXInfo,
    },
    naming_utils,
    type_analyzer::{TypeAnalyzer, get_runtime_struct_name},
};

#[derive(Default)]
pub struct Scanner {
    pub type_analyzer: TypeAnalyzer,
}

impl Scanner {
    pub fn init(&mut self) {
        log::debug!("[Script Dumper] registering types...");
        for &class in CLASS_TABLE.get().unwrap().values() {
            self.type_analyzer
                .registry
                .register_struct_name(RuntimeType::from_class(class).unwrap());
        }

        let (
            metadata_init_rva,
            table_rva,
            offsets,
            generic_table_va,
            generic_method_get_method_va,
            get_method_info_from_method_def_index_va,
        ) = if let Some(RuntimeAddressInfo {
                metadata_init_rva,
                table_va,
                offsets,
                generic_table_va,
                generic_method_get_method_va,
                get_method_info_from_method_def_index_va,
            }) = scan_address() {
            let table_rva = table_va - *il2cpp::GA_BASE;
            log::debug!(
                "[Script Dumper] Metadata Init: 0x{metadata_init_rva:X} | Table Base: 0x{table_rva:X} | Offsets: {}",
                offsets
                    .iter()
                    .map(|(case, offset)| match *case {
                        1 => {
                            format!("TypeInfo {offset}")
                        }
                        3 | 6 => {
                            format!("MethodInfo {offset}")
                        }
                        5 => {
                            format!("StringLiteral {offset}")
                        }
                        other => format!("case {other} => {offset}"),
                    })
                    .collect::<Vec<_>>()
                    .join(" | ")
            );
            (
                metadata_init_rva,
                table_rva,
                offsets,
                generic_table_va,
                generic_method_get_method_va,
                get_method_info_from_method_def_index_va,
            )
        } else {
            log::debug!("[Script Dumper] Failed to scan address");

            return;
        };

        // initialize all the metadata by calling it
        unsafe {
            let func: extern "C" fn(u32) =
                std::mem::transmute(*il2cpp::GA_BASE + metadata_init_rva);

            for i in 0..999_999 {
                if microseh::try_seh(|| {
                    func(i as u32);
                })
                .is_err()
                {
                    break;
                }
            }
        }

        // string literals
        unsafe {
            log::debug!("[Script Dumper] dumping string literals...");
            for index in 0..999_999 {
                let table = *((*((*il2cpp::GA_BASE + table_rva) as *const usize)
                    + offsets.get(&5).unwrap()) as *const usize);
                let pointer = table + 8 * index;
                let table_pointer = pointer - *il2cpp::GA_BASE;
                let string = *((pointer) as *const Il2CppString);
                if string.0 == 0 {
                    log::debug!("[Script Dumper] dumped {index} string literals");
                    break;
                }

                let _ = microseh::try_seh(|| {
                    let s = string.as_str();

                    self.type_analyzer
                        .context
                        .string_literals
                        .push(StringLiteralOutput {
                            value: s.to_string(),
                            address: format!("0x{table_pointer:X}"),
                        });

                    self.type_analyzer
                        .context
                        .script_output
                        .script_string
                        .push(ScriptString {
                            address: table_pointer,
                            value: s.to_string(),
                        });
                });
            }
        }

        // type infos
        unsafe {
            log::debug!("[Script Dumper] dumping type infos...");
            for index in 0..999_999 {
                let table = *((*((*il2cpp::GA_BASE + table_rva) as *const usize)
                    + offsets.get(&1).unwrap()) as *const usize);
                let pointer = table + 8 * index;
                let table_pointer = pointer - *il2cpp::GA_BASE;
                let class = *((pointer) as *const Il2CppClass);
                if class.0 == 0 {
                    log::debug!("[Script Dumper] dumped {index} type infos");
                    break;
                }

                let _ = microseh::try_seh(|| {
                    let name = class.byval_arg().get_name(Il2CppTypeNameFormat::IL);
                    let fixed_name = naming_utils::fix_name(name.to_string());

                    let signature = if name.contains("[]") {
                        String::from("Il2CppClass*")
                    } else {
                        format!("{fixed_name}_c*")
                    };

                    self.type_analyzer
                        .context
                        .script_output
                        .script_metadata
                        .push(ScriptMetadata {
                            address: table_pointer,
                            name: format!("{fixed_name}_TypeInfo"),
                            signature,
                        });

                    false
                });
            }
        }

        // method usages
        unsafe {
            log::debug!("[Script Dumper] dumping method usages...");
            for index in 0..999_999 {
                let table = *((*((*il2cpp::GA_BASE + table_rva) as *const usize)
                    + offsets.get(&3).unwrap()) as *const usize);
                let pointer = table + 8 * index;
                let table_pointer = pointer - *il2cpp::GA_BASE;
                let method = *((pointer) as *const Il2CppMethod);
                if method.0 == 0 {
                    log::debug!("[Script Dumper] dumped {index} method usages");
                    break;
                }

                let _ = microseh::try_seh(|| {
                    let class = method.class();
                    if class.0 != 0 {
                        self.add_method_info(method, class, Some(table_pointer));
                    }
                });

                if index % 2000 == 0 && index > 0 {
                    std::thread::yield_now();
                }
            }
        }

        // method defs
        unsafe {
            if let Some(get_method) = get_method_info_from_method_def_index_va {
                log::debug!(
                    "[Script Dumper] dumping methods from method def index (rva: 0x{:X})...",
                    get_method - *il2cpp::GA_BASE
                );

                let get_method =
                    std::mem::transmute::<usize, extern "C" fn(i32) -> Il2CppMethod>(get_method);

                for index in 0..i32::MAX {
                    let Ok(method) = microseh::try_seh(|| get_method(index)) else {
                        log::debug!("[Script Dumper] dumped {index} method from def index");
                        break;
                    };

                    if method.0 == 0 {
                        log::debug!("[Script Dumper] dumped {index} method from def index");
                        break;
                    }

                    let _ = microseh::try_seh(|| {
                        let class = method.class();
                        if class.0 != 0 {
                            self.add_method_info(method, class, None);
                        }
                    });

                    if index % 2000 == 0 && index > 0 {
                        std::thread::yield_now();
                    }
                }
            }
        }

        // generic methods
        unsafe {
            if let (Some(generic_table_va), Some(generic_method_get_method_va)) =
                (generic_table_va, generic_method_get_method_va)
            {
                log::debug!(
                    "[Script Dumper] dumping generic inst (table: 0x{:X} | get_method: 0x{:X})...",
                    generic_table_va - *il2cpp::GA_BASE,
                    generic_method_get_method_va - *il2cpp::GA_BASE
                );

                let get_method = std::mem::transmute::<
                    usize,
                    extern "C" fn(usize, bool) -> Il2CppMethod,
                >(generic_method_get_method_va);

                for index in 0..999_999 {
                    let qword = *(generic_table_va as *const usize);
                    if qword == 0 {
                        break;
                    }
                    let pointer = qword + 8 * index;
                    let Ok(g_method) = microseh::try_seh(|| *(pointer as *const usize)) else {
                        log::debug!("[Script Dumper] read error at generic inst index {index}");
                        break;
                    };
                    if g_method == 0 {
                        log::debug!("[Script Dumper] dumped {index} generic inst");
                        break;
                    }

                    let method = match microseh::try_seh(|| get_method(g_method, false)) {
                        Ok(m) if m.0 != 0 => m,
                        _ => continue,
                    };

                    let _ = microseh::try_seh(|| {
                        let class = method.class();
                        if class.0 != 0 {
                            self.add_method_info(method, class, None);
                        }
                    });

                    if index % 2000 == 0 && index > 0 {
                        std::thread::yield_now();
                    }
                }
            }
        }

        self.sort_and_clean();
    }

    fn add_method_info(
        &mut self,
        method: Il2CppMethod,
        class: Il2CppClass,
        qword_rva: Option<usize>,
    ) {
        if !self
            .type_analyzer
            .context
            .processed_method_infos
            .insert(method.0)
        {
            return;
        }

        if method.va() == 0 {
            return;
        }

        let il2cpp_type = class.byval_arg();
        let reflection_method = if let Ok(m) =
            MethodInfo::from_handle_internal_type_native(method, il2cpp_type, true)
            && !m.is_null()
        {
            m
        } else {
            return;
        };

        let declaring_type = if let Ok(dt) = reflection_method.get_declaring_type()
            && !dt.is_null()
        {
            dt
        } else {
            return;
        };

        let method_key = method.0;
        let (method_name, reflection_type_name_2) = self
            .type_analyzer
            .context
            .method_name_cache
            .entry(method_key)
            .or_insert_with(|| {
                let mut method_name_1 = reflection_method
                    .get_name().map_or_else(|_| String::from("unknown_method"), |v| v.as_str().to_string());

                let reflection_type_name =
                    get_runtime_struct_name(declaring_type, true, false, true);

                if reflection_method
                    .get_is_generic_method()
                    .map(|v| v.unbox())
                    .unwrap_or_default()
                {
                    let generic_args = reflection_method
                        .get_generic_arguments()
                        .into_iter()
                        .map(|g| get_runtime_struct_name(g, true, false, true))
                        .collect::<Vec<_>>();

                    method_name_1 = format!("{method_name_1}<{}>", generic_args.join(", "));
                }

                (method_name_1, reflection_type_name)
            })
            .clone();

        if let Some(qword_rva) = qword_rva {
            self.type_analyzer
                .context
                .script_output
                .script_metadata_method
                .push(ScriptMetadataMethod {
                    address: qword_rva,
                    name: format!("Method${reflection_type_name_2}.{method_name}()"),
                    method_address: method.rva(),
                });
        }

        if method.rva() == 0 {
            return;
        }

        let mut script_method = ScriptMethod {
            method_info: reflection_method,
            address: method.rva(),
            name: format!("{reflection_type_name_2}$${method_name}"),
            signature: String::new(),
            type_signature: String::new(),
        };

        let is_static = reflection_method.is_static();
        let return_type = reflection_method.get_return_type().unwrap();
        let parsed_return_type = self.type_analyzer.parse_type(return_type);
        let parameters = reflection_method.get_parameters();
        let parameter_len = parameters.len();

        let mut type_signatures = Vec::with_capacity(2 + parameter_len);
        let mut signature = String::with_capacity(128);

        type_signatures.push(return_type);
        signature.push_str(&format!(
            "{parsed_return_type} {}__{} (",
            naming_utils::fix_name(reflection_type_name_2.to_string()),
            naming_utils::fix_name(method_name.to_string())
        ));

        if !is_static {
            let parsed_declaring_type = self.type_analyzer.parse_type(declaring_type);
            signature.push_str(&format!("{parsed_declaring_type} __this"));
            type_signatures.push(declaring_type);
        }

        if !parameters.is_empty() {
            if !is_static {
                signature.push_str(", ");
            }

            for (i, &parameter) in parameters.iter().enumerate() {
                let parameter_type = parameter.get_parameter_type().unwrap();
                let parsed_parameter_type = self.type_analyzer.parse_type(parameter_type);

                let mut parameter_name = parameter.get_name().unwrap().as_str();

                if parameter_name.is_empty() {
                    parameter_name += Cow::Owned(i.to_string());
                }

                signature.push_str(&format!(
                    "{parsed_parameter_type} {}",
                    naming_utils::fix_name(parameter_name.to_string())
                ));

                if i < parameter_len - 1 {
                    signature.push_str(", ");
                }

                type_signatures.push(parameter_type);
            }
        }

        if !is_static || parameter_len > 0 {
            signature.push_str(", ");
        }

        let is_generic_type = declaring_type.get_isgenerictype().unwrap().unbox();
        let is_generic_method = reflection_method.get_is_generic_method().unwrap().unbox();
        let is_generic = !is_generic_type && is_generic_method;

        if is_generic {
            signature.push_str(&format!(
                "const MethodInfo_{:X}* method);",
                script_method.address
            ));
        } else {
            signature.push_str("const MethodInfo* method);");
        }

        script_method.signature = signature;
        script_method.type_signature = format!(
            "{}i",
            self.type_analyzer
                .get_method_types_signature(type_signatures)
        );

        if is_generic_type {
            let method_key_generic = (
                declaring_type.get_generic_type_definition().unwrap().0,
                reflection_method.get_metadata_token(),
            );
            self.type_analyzer
                .context
                .method_cache
                .entry(method_key_generic)
                .or_default()
                .insert(script_method.clone());
        } else if is_generic_method {
            let method_key_generic = (
                reflection_method
                    .get_generic_method_definition_impl()
                    .unwrap()
                    .0,
                reflection_method.get_metadata_token(),
            );

            self.type_analyzer
                .context
                .method_cache
                .entry(method_key_generic)
                .or_default()
                .insert(script_method.clone());

            let method_info_name = format!("MethodInfo_{:X}", script_method.address);
            if !self
                .type_analyzer
                .context
                .rgctx_added_list
                .contains(&method_info_name)
            {
                let element_type_name = RuntimeType::from_il2cpp_type(il2cpp_type)
                    .unwrap()
                    .format_type_name_with_namespace(false, false);

                if let Some(struct_type_name) = self
                    .type_analyzer
                    .registry
                    .get_by_name(&element_type_name)
                    .map(std::string::ToString::to_string)
                {
                    let rgctxs = self.generate_rgctx(reflection_method, declaring_type);
                    self.generate_method_info(&method_info_name, struct_type_name, rgctxs);
                    self.type_analyzer
                        .context
                        .rgctx_added_list
                        .push(method_info_name);
                }
            }
        }

        self.type_analyzer
            .context
            .script_output
            .script_method
            .push(script_method);

        self.type_analyzer
            .context
            .script_output
            .addresses
            .push(method.rva());

        // process method invoker
        unsafe {
            let invoker_method_va = *((method.0 + *INVOKER_METHOD_OFFSET) as *const usize);
            if invoker_method_va == 0 || invoker_method_va < *il2cpp::GA_BASE {
                return;
            }

            let invoker_method_rva = invoker_method_va - *il2cpp::GA_BASE;

            if self
                .type_analyzer
                .context
                .script_method_invokers
                .contains_key(&invoker_method_rva)
            {
                return;
            }

            let invoker_name = format!(
                "RuntimeInvoker_{is_instance}{ret_type}_{parameters}",
                is_instance = if is_static { "False" } else { "True" },
                ret_type = naming_utils::fix_name(
                    return_type
                        .format_type_name_with_namespace(false, false)
                        .to_string()
                ),
                parameters = parameters
                    .iter()
                    .map(|p| naming_utils::fix_name(
                        p.get_parameter_type()
                            .unwrap()
                            .format_type_name_with_namespace(false, false)
                            .to_string()
                    ))
                    .collect::<Vec<_>>()
                    .join("_")
            );

            // remove asterisk in middle with "_"
            let invoker_name = invoker_name.replace('*', "_");

            let invoker_sig = format!(
                "void* {invoker_name}(Il2CppMethodPointer pointer, const MethodInfo* methodMetadata, void* obj, void** args);"
            );

            self.type_analyzer.context.script_method_invokers.insert(
                invoker_method_rva,
                ScriptMethodInvoker {
                    address: invoker_method_rva,
                    name: invoker_name,
                    signature: invoker_sig,
                },
            );
        }
    }

    fn generate_rgctx(&mut self, refl_meth: MethodInfo, decl: RuntimeType) -> Vec<StructRGCTXInfo> {
        let mut out = Vec::new();

        macro_rules! add_type {
            ($t:path) => {{
                let rn = $t.format_type_name_with_namespace(false, false);
                if let Some(nm) = self.type_analyzer.registry.get_by_name(&rn) {
                    if $t.get_isvaluetype().unwrap().unbox() && !$t.get_isenum().unwrap().unbox() {
                        out.push(StructRGCTXInfo {
                            r#type: 1,
                            type_name: nm.to_string(),
                            class_name: String::with_capacity(0),
                            method_name: String::with_capacity(0),
                        })
                    } else {
                        out.push(StructRGCTXInfo {
                            r#type: 2,
                            type_name: String::with_capacity(0),
                            class_name: nm.to_string(),
                            method_name: String::with_capacity(0),
                        })
                    };
                }
            }};
        }

        if decl.get_isgenerictype().unwrap().unbox()
            && !decl.get_is_generic_type_definition().unwrap().unbox()
        {
            for g_arg in decl.get_generic_arguments() {
                if g_arg.get_is_generic_parameter().unwrap().unbox() {
                    continue;
                }

                add_type!(g_arg);
            }
        }

        if refl_meth.get_is_generic_method().unwrap().unbox() {
            for g_meth in refl_meth.get_generic_arguments() {
                if g_meth.get_is_generic_parameter().unwrap().unbox() {
                    continue;
                }

                add_type!(g_meth);
            }
        }

        out
    }

    fn generate_method_info(
        &mut self,
        method_info_name: &str,
        struct_type_name: String,
        rgctxs: Vec<StructRGCTXInfo>,
    ) {
        if !rgctxs.is_empty() {
            self.type_analyzer
                .context
                .method_info_header
                .push_str(&format!("struct {method_info_name}_RGCTXs {{\n"));

            for (i, rgctx) in rgctxs.iter().enumerate() {
                match rgctx.r#type {
                    // IL2CPP_RGCTX_DATA_TYPE
                    1 => {
                        self.type_analyzer
                            .context
                            .method_info_header
                            .push_str(&format!("\tIl2CppType* _{i}_{};\n", rgctx.type_name));
                    }

                    // IL2CPP_RGCTX_DATA_CLASS
                    2 => {
                        self.type_analyzer
                            .context
                            .method_info_header
                            .push_str(&format!("\tIl2CppClass* _{i}_{};\n", rgctx.class_name));
                    }

                    // IL2CPP_RGCTX_DATA_METHOD
                    3 => {
                        self.type_analyzer
                            .context
                            .method_info_header
                            .push_str(&format!("\tMethodInfo* _{i}_{};\n", rgctx.method_name));
                    }

                    _ => {}
                }
            }

            self.type_analyzer
                .context
                .method_info_header
                .push_str("};\n");
        }

        self.type_analyzer
            .context
            .method_info_header
            .push_str(&format!("struct {method_info_name} {{\n"));
        self.type_analyzer
            .context
            .method_info_header
            .push_str("\tIl2CppMethodPointer methodPointer;\n");
        self.type_analyzer
            .context
            .method_info_header
            .push_str("\tvoid* invoker_method;\n");
        self.type_analyzer
            .context
            .method_info_header
            .push_str("\tconst char* name;\n");
        self.type_analyzer
            .context
            .method_info_header
            .push_str(&format!("\t{struct_type_name}_c *klass;\n"));
        self.type_analyzer
            .context
            .method_info_header
            .push_str("\tconst Il2CppType *return_type;\n");
        self.type_analyzer
            .context
            .method_info_header
            .push_str("\tconst void* parameters;\n");
        if !rgctxs.is_empty() {
            self.type_analyzer
                .context
                .method_info_header
                .push_str(&format!("\tconst {method_info_name}_RGCTXs* rgctx_data;\n"));
        } else {
            self.type_analyzer
                .context
                .method_info_header
                .push_str("\tconst Il2CppRGCTXData* rgctx_data;\n");
        }
        self.type_analyzer.context
            .method_info_header
            .push_str("\tunion\n\t{\n\t\tconst void* genericMethod;\n\t\tconst void* genericContainer;\n\t};\n");
        self.type_analyzer.context
            .method_info_header
            .push_str("\tuint32_t token;\n\tuint16_t flags;\n\tuint16_t iflags;\n\tuint16_t slot;\n\tuint8_t parameters_count;\n\tuint8_t bitflags;\n};\n");
    }

    fn sort_and_clean(&mut self) {
        self.type_analyzer.context.script_output.addresses.sort();
        self.type_analyzer.context.script_output.addresses.dedup();

        self.type_analyzer
            .context
            .script_output
            .script_metadata_method
            .sort_by_key(|a| a.address);
        // self.type_analyzer
        //     .context
        //     .script_output
        //     .script_metadata_method
        //     .dedup();

        self.type_analyzer
            .context
            .script_output
            .script_method
            .sort_by_key(|a| a.address);
        // self.type_analyzer
        //     .context
        //     .script_output
        //     .script_method
        //     .dedup_by(|a, b| a.method_info.0 == b.method_info.0);

        self.type_analyzer
            .context
            .script_output
            .script_metadata
            .sort_by_key(|a| a.address);
        // self.type_analyzer
        //     .context
        //     .script_output
        //     .script_metadata
        //     .dedup();

        self.type_analyzer
            .context
            .script_output
            .script_string
            .sort_by_key(|a| a.address);
        // self.type_analyzer
        //     .context
        //     .script_output
        //     .script_string
        //     .dedup();

        let mut invokers: Vec<_> = self
            .type_analyzer
            .context
            .script_method_invokers
            .values()
            .cloned()
            .collect();
        invokers.sort_by_key(|a| a.address);
        self.type_analyzer.context.script_output.method_invokers = invokers;
    }
}

struct RuntimeAddressInfo {
    metadata_init_rva: usize,
    table_va: usize,
    offsets: HashMap<usize, usize>,
    generic_table_va: Option<usize>,
    generic_method_get_method_va: Option<usize>,
    get_method_info_from_method_def_index_va: Option<usize>,
}

static INVOKER_METHOD_OFFSET: LazyLock<usize> = LazyLock::new(|| {
    const FALLBACK: usize = 0x18;
    if let Some(offset) = scan_invoker_method_offset() {
        log::debug!("[Script Dumper] derived MethodInfo.invoker_method offset = 0x{offset:X}");
        offset
    } else {
        log::debug!(
            "[Script Dumper] invoker offset scan failed, using fallback 0x{FALLBACK:X}"
        );
        FALLBACK
    }
});

fn scan_invoker_method_offset() -> Option<usize> {
    let invoke_va =
        unsafe { *((*il2cpp::UP_BASE + *il2cpp::API_BASE_PTR + 8 * 140) as *const usize) };
    let ga_base = *il2cpp::GA_BASE;
    let slice = game_assembly_slice();

    let mut targets = Vec::new();
    for instruction in decode_linear(invoke_va, ga_base, slice, 64) {
        if instruction.mnemonic() == Mnemonic::Call
            && instruction.op0_kind() == OpKind::NearBranch64
        {
            targets.push(instruction.near_branch_target() as usize);
        }
    }

    targets
        .into_iter()
        .find_map(|target| invoker_offset_in_dispatcher(target, ga_base, slice))
}

fn invoker_offset_in_dispatcher(va: usize, ga_base: usize, slice: &[u8]) -> Option<usize> {
    let mut from_method_info: HashMap<Register, u64> = HashMap::new();
    for instruction in decode_linear(va, ga_base, slice, 96) {
        match instruction.mnemonic() {
            Mnemonic::Mov if instruction.op0_kind() == OpKind::Register => {
                if instruction.op1_kind() == OpKind::Memory
                    && instruction.memory_base() == Register::RCX
                    && instruction.memory_index() == Register::None
                {
                    from_method_info.insert(
                        instruction.op0_register(),
                        instruction.memory_displacement64(),
                    );
                } else {
                    from_method_info.remove(&instruction.op0_register());
                }
            }
            Mnemonic::Call if instruction.op0_kind() == OpKind::Register => {
                if let Some(&disp) = from_method_info.get(&instruction.op0_register()) {
                    return Some(disp as usize);
                }
            }
            _ => {}
        }
    }
    None
}

fn decode_linear(va: usize, ga_base: usize, slice: &[u8], max: usize) -> Vec<Instruction> {
    if va <= ga_base || va - ga_base >= slice.len() {
        return Vec::new();
    }
    let mut decoder = Decoder::with_ip(64, &slice[va - ga_base..], va as u64, DecoderOptions::NONE);
    let mut instructions = Vec::new();
    let mut instruction = Instruction::default();
    while decoder.can_decode() && instructions.len() < max {
        decoder.decode_out(&mut instruction);
        instructions.push(instruction);
    }
    instructions
}

fn scan_address() -> Option<RuntimeAddressInfo> {
    let Some(metadata_init_rva) = scan_ga_section("E8 ? ? ? ? 49 89 E8 C6 05") else {
        log::debug!("[Script Dumper] Failed to find metadata_init_rva");
        return None;
    };

    let slice = game_assembly_slice();
    let mut decoder = Decoder::with_ip(
        64,
        &slice[metadata_init_rva..],
        (*il2cpp::GA_BASE + metadata_init_rva) as u64,
        DecoderOptions::NONE,
    );

    let mut instruction = Instruction::default();

    let mut jump_table_base = None;
    let mut jump_table_offset = None;
    let mut max_case = None;

    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);

        // Find the lea instruction that loads the jump table base
        if instruction.mnemonic() == Mnemonic::Lea && instruction.op0_register() == Register::RDI {
            // This is: lea     rdi, jpt_1838E8730
            jump_table_base = Some(instruction.near_branch64());
        }

        // Find the max case comparison
        if instruction.mnemonic() == Mnemonic::Cmp && instruction.op0_register() == Register::EBX {
            // This is: cmp     ebx, 7
            max_case = Some(instruction.immediate32());
        }

        // Find the jump table access
        if jump_table_offset.is_none()
            && instruction.mnemonic() == Mnemonic::Movsxd
            && instruction.op0_register() == Register::RBX
            && instruction.op1_kind() == OpKind::Memory
        {
            // This is: movsxd  rbx, ds:(jpt_1838E8730 - 1838E8B94h)[rdi+rbx*4]
            jump_table_offset = Some(instruction.memory_displacement32());
        }

        // Stop when we reach the switch jump
        if instruction.mnemonic() == Mnemonic::Jmp && instruction.op0_kind() == OpKind::Register {
            break;
        }
    }

    let mut case_values = HashMap::new();

    // Now parse the jump table if we found all components
    if let (Some(base), Some(offset), Some(max)) = (jump_table_base, jump_table_offset, max_case) {
        // Calculate the actual jump table address
        // In the assembly: jpt_181488F6F - 181489260h
        // So the full address is base + offset
        let jump_table_addr = base.wrapping_add(offset as u64);

        // Read each case from the jump table
        for case_idx in 0..=max {
            // Calculate the original case value (after dec edx)
            let original_case = match case_idx {
                0 => 0,
                1 => 1,
                2 => 2,
                3 => 3,
                4 => 4,
                5 => 5,
                6 => 6,
                _ => continue,
            };

            // Skip the default case (case 2)
            if case_idx == 2 {
                continue;
            }

            // Read the 32-bit offset from the jump table
            let table_offset = (case_idx * 4) as u64;
            let offset_addr = jump_table_addr + table_offset;

            // Safety: Ensure we're reading within bounds
            if offset_addr + 4 <= (*il2cpp::GA_BASE + slice.len()) as u64 {
                let slice_offset = offset_addr as usize - *il2cpp::GA_BASE;
                let offset = i32::from_le_bytes([
                    slice[slice_offset],
                    slice[slice_offset + 1],
                    slice[slice_offset + 2],
                    slice[slice_offset + 3],
                ]);

                // Calculate target address
                let target_addr = base.wrapping_add(offset as u64);

                case_values.insert(original_case, target_addr);

                // Handle case 3 and 6 sharing the same code block
                if original_case == 3 {
                    case_values.insert(6, target_addr);
                }
            }
        }
    }

    fn get_table_and_offset(addr: u64) -> Option<(usize, usize)> {
        let rva = addr as usize - *il2cpp::GA_BASE;
        let slice = game_assembly_slice();
        let mut decoder = Decoder::with_ip(64, &slice[rva..], addr, DecoderOptions::NONE);

        let mut instruction = Instruction::default();

        let mut table = None;
        let mut offset = None;

        while decoder.can_decode() {
            decoder.decode_out(&mut instruction);

            if table.is_none()
                && instruction.mnemonic() == Mnemonic::Mov
                && instruction.op1_kind() == OpKind::Memory
            {
                table = Some(instruction.memory_displacement64() as usize);
                continue;
            }

            if table.is_some() && instruction.mnemonic() == Mnemonic::Mov {
                offset = Some(instruction.memory_displacement64() as usize);
                break;
            }
        }

        if let (Some(table), Some(offset)) = (table, offset) {
            return Some((table, offset));
        }

        None
    }

    let mut table_va = None;
    let mut offsets = HashMap::with_capacity(3);

    for (&value, &addr) in &case_values {
        if let Some((table, offset)) = get_table_and_offset(addr) {
            if let Some(table_va) = table_va
                && table_va != table
            {
                continue;
            }
            table_va = Some(table);
            offsets.insert(value, offset);
        }
    }

    // try to find il2cpp::metadata::GenericMethod::GetMethod
    let mut get_method_info_from_def_index_va = None;
    let mut s_generic_table_va = None;
    let mut generic_method_get_method_va = None;

    if let Some(&addr) = case_values.get(&6) {
        let rva = addr as usize - *il2cpp::GA_BASE;
        let slice = game_assembly_slice();
        let mut decoder = Decoder::with_ip(64, &slice[rva..], addr, DecoderOptions::NONE);

        let mut instruction = Instruction::default();
        let mut jmp_cnt = 0;

        while decoder.can_decode() {
            decoder.decode_out(&mut instruction);

            if instruction.mnemonic() == Mnemonic::Call && jmp_cnt == 0 {
                let call_addr = instruction.near_branch_target();
                let rva = call_addr as usize - *il2cpp::GA_BASE;
                decoder = Decoder::with_ip(64, &slice[rva..], call_addr, DecoderOptions::NONE);
                jmp_cnt += 1;
                continue;
            }

            // cmp     REG, 0C0000000h
            if instruction.mnemonic() == Mnemonic::Cmp && instruction.immediate32() == 0x0C0000000 {
                decoder.decode_out(&mut instruction); // should be jne LOC
                if instruction.mnemonic() != Mnemonic::Jne {
                    log::debug!("[Script Dumper] expected jne");
                    break;
                }
                get_method_info_from_def_index_va =
                    disasm_until_jmp_to_get_its_called_va(instruction.near_branch64());

                decoder.decode_out(&mut instruction); // should be mov  REG, cs:s_GenericTable
                if instruction.mnemonic() != Mnemonic::Mov {
                    log::debug!("[Script Dumper] expected mov");
                    break;
                }
                s_generic_table_va = Some(instruction.memory_displacement64() as usize);
            }

            if get_method_info_from_def_index_va.is_some()
                && s_generic_table_va.is_some()
                && instruction.mnemonic() == Mnemonic::Jne
            {
                generic_method_get_method_va =
                    disasm_until_jmp_to_get_its_called_va(instruction.near_branch64());

                break;
            }
        }
    }

    if let Some(table_va) = table_va
        && offsets.len() == 6
    {
        return Some(RuntimeAddressInfo {
            metadata_init_rva,
            table_va,
            offsets,
            generic_table_va: s_generic_table_va,
            generic_method_get_method_va,
            get_method_info_from_method_def_index_va: get_method_info_from_def_index_va,
        });
    }

    None
}

fn disasm_until_jmp_to_get_its_called_va(addr: u64) -> Option<usize> {
    let rva = addr as usize - *il2cpp::GA_BASE;
    let slice = game_assembly_slice();
    let mut decoder = Decoder::with_ip(64, &slice[rva..], addr, DecoderOptions::NONE);

    let mut instruction = Instruction::default();

    while decoder.can_decode() {
        decoder.decode_out(&mut instruction);

        if instruction.mnemonic() == Mnemonic::Call {
            return Some(instruction.near_branch_target() as usize);
        }

        if instruction.mnemonic() == Mnemonic::Jmp && !instruction.is_jmp_short() {
            return Some(instruction.near_branch_target() as usize);
        }
    }

    None
}
