use crate::script_v2::struct_init::init;
use crate::{
    proto::util::is_correct_getter,
    script_v2::{
        constants,
        models::{StructFieldInfo, StructInfo, StructVTableMethod},
        naming_utils,
        scanner::Scanner,
    },
};
use il2cpp::vm::value::Il2CppValue;
use reflection::{attributes::MethodAttributes, runtime_type::RuntimeType};
use std::{collections::HashSet, fs::File, io::Write as _};

pub struct Writer {
    scanner: Scanner,
}

impl Writer {
    pub fn new(scanner: Scanner) -> Self {
        Self { scanner }
    }

    pub fn save_string_literals(&self) {
        std::fs::write(
            "./DUMP/stringLiterals.json",
            serde_json::to_string_pretty(&self.scanner.type_analyzer.context.string_literals)
                .unwrap(),
        )
        .unwrap();
        println!("[Script Dumper] saved stringLiterals.json");
    }

    pub fn save_script(&self) {
        std::fs::write(
            "./DUMP/script.json",
            serde_json::to_string_pretty(&self.scanner.type_analyzer.context.script_output)
                .unwrap(),
        )
        .unwrap();
        println!("[Script Dumper] saved script.json");
    }

    pub fn save_struct(&mut self) {
        println!(
            "[Script Dumper] dumping il2cpp.h {}",
            self.scanner.type_analyzer.registry.runtime_types.len()
        );

        for runtime_type in self.scanner.type_analyzer.registry.runtime_types.clone() {
            self.struct_dump_type(runtime_type);
        }

        let mut out = File::create("./DUMP/struct.h").unwrap();

        writeln!(&mut out, "{}", constants::STRUCT_HEADER).unwrap();

        init(&self.scanner.type_analyzer.context.struct_info_list);

        self.scanner
            .type_analyzer
            .context
            .struct_info_list
            .iter()
            .map(|si| (format!("{}_o", si.type_name), si.clone()))
            .for_each(|(name, si)| {
                self.scanner
                    .type_analyzer
                    .context
                    .struct_info_with_struct_name
                    .insert(name, si);
            });

        #[allow(clippy::unnecessary_to_owned)]
        for si in self.scanner.type_analyzer.context.struct_info_list.to_vec() {
            write!(&mut out, "{}", self.recursion_struct_info(si)).unwrap();
        }

        for list_info in &self.scanner.type_analyzer.context.struct_array_info_list {
            if self
                .scanner
                .type_analyzer
                .context
                .wrote_cache
                .contains(list_info.1.trim_end_matches('*'))
            {
                continue;
            }

            let mut sb = String::new();
            let name = list_info.1.trim_end_matches('*');

            sb.push_str(&format!("struct {name} {{\n"));
            sb.push_str("\tIl2CppObject obj;\n");
            sb.push_str("\tIl2CppArrayBounds *bounds;\n");
            sb.push_str("\til2cpp_array_size_t max_length;\n");

            let elem_type_str = if let Some(unique_name) =
                self.scanner.type_analyzer.registry.get_by_name(list_info.0)
            {
                format!("{unique_name}_o*")
            } else {
                "void*".to_string()
            };

            sb.push_str(&format!("\t{elem_type_str} m_Items[65535];\n"));
            sb.push_str("};\n");

            write!(&mut out, "{sb}").unwrap();

            self.scanner
                .type_analyzer
                .context
                .wrote_cache
                .insert(name.to_string());
        }

        write!(
            &mut out,
            "{}",
            self.scanner.type_analyzer.context.method_info_header
        )
        .unwrap();

        println!("[Script Dumper] saved il2cpp.h");
    }

    fn is_value_type(rt: RuntimeType) -> bool {
        if let Ok(bt) = rt.get_base_type()
            && !bt.is_null()
            && bt.il_name() == "System.ValueType"
        {
            true
        } else {
            false
        }
    }

    fn struct_dump_type(&mut self, type_def: RuntimeType) {
        let mut struct_info = StructInfo {
            type_name: self
                .scanner
                .type_analyzer
                .registry
                .get_by_rt(type_def)
                .unwrap()
                .to_string(),
            runtime_type: type_def,
            // TODO:
            is_value_type: Self::is_value_type(type_def),
            parent: None,
            fields: Vec::new(),
            static_fields: Vec::new(),
            v_table_methods: Vec::new(),
        };

        self.add_fields(type_def, &mut struct_info);
        self.add_parents(type_def, &mut struct_info);
        self.add_v_table_method(type_def, &mut struct_info);
        self.scanner
            .type_analyzer
            .context
            .struct_info_list
            .push(struct_info);
    }

    fn add_fields(&mut self, type_def: RuntimeType, struct_info: &mut StructInfo) {
        let mut cache = HashSet::<String>::new();
        for (i, field) in type_def.get_fields_il2cpp().into_iter().enumerate() {
            if field.get_isliteral().unwrap().unbox() {
                continue;
            }

            let field_type = field.get_field_type().unwrap();

            let mut field_name = field.get_name().unwrap().as_str().to_string();
            if let Some(prop) = type_def
                .get_properties(62)
                .into_iter()
                .find(|p| {
                    p.get_get_method(true).ok().is_some_and(|m| {
                        !m.is_null()
                            && is_correct_getter(field.get_offset(), m.get_il2cpp_method().rva())
                    })
                })
                .map(|p| p.get_name().unwrap().as_str().to_string())
            {
                field_name = prop;
            }
            field_name = naming_utils::fix_name(field_name);

            if !cache.insert(field_name.to_string()) {
                field_name = format!("_{i}_{field_name}");
            }

            // apply reservations
            for kw in constants::RESERVED_CPP_KEYWORDS {
                self.scanner
                    .type_analyzer
                    .context
                    .field_name_reserver
                    .reserve_name(&mut field_name, kw);
            }

            for kw in [
                "_int8",
                "_int16",
                "_int32",
                "_int64",
                "DEFAULT_CHARSET",
                "FILETIME",
                "NULL",
                "SYSTEMTIME",
                "stderr",
                "stdin",
                "stdout",
                "Mask",
                "Region",
                "Pointer",
                "GC",
                "Time",
                "_extension",
            ] {
                self.scanner
                    .type_analyzer
                    .context
                    .field_name_reserver
                    .reserve_name(&mut field_name, kw);
            }

            if microseh::try_seh(|| {
                let struct_field_info = StructFieldInfo {
                    field_name: field_name.clone(),
                    field_type_name: self.scanner.type_analyzer.parse_type(field_type),
                    offset: field.get_offset(),
                    // TODO:
                    is_value_type: field_type.get_isvaluetype().unwrap().unbox(),
                    is_custom_type: self.scanner.type_analyzer.is_custom_type(field_type, false),
                };

                if field.get_isstatic().unwrap().unbox() {
                    struct_info.static_fields.push(struct_field_info);
                } else {
                    struct_info.fields.push(struct_field_info);
                }
            })
            .is_err()
            {
                println!("failed on {field_name} {}", field_type.il_name());
            }
        }
    }

    fn add_parents(&mut self, type_def: RuntimeType, struct_info: &mut StructInfo) {
        if !type_def.get_isvaluetype().unwrap().unbox() && !type_def.get_isenum().unwrap().unbox() {
            let parent = type_def.get_base_type().unwrap();
            if parent.is_null() {
                return;
            }

            if ["System.Object", "System.Enum", "System.Void"].contains(&parent.il_name().as_ref())
            {
                return;
            }

            let parent_name = self.scanner.type_analyzer.parse_type(parent);
            let parent_name = parent_name.strip_suffix("_o*").unwrap_or(&parent_name);
            struct_info.parent = Some(parent_name.to_string());
        }
    }

    fn add_v_table_method(&mut self, type_def: RuntimeType, struct_info: &mut StructInfo) {
        for method in type_def.get_methods_il2cpp() {
            let attr = method.get_attributes().unwrap().unbox();
            if (attr.bits() & MethodAttributes::Virtual.bits()) == 0 {
                continue;
            }

            let method_name =
                naming_utils::fix_name(method.get_name().unwrap().as_str().to_string());

            struct_info
                .v_table_methods
                .push(StructVTableMethod { method_name });
        }
    }

    fn recursion_struct_info(&mut self, info: StructInfo) -> String {
        if !self
            .scanner
            .type_analyzer
            .context
            .struct_cache
            .insert(info.clone())
        {
            return String::new();
        }

        let mut sb = String::new();
        let mut pre = String::new();

        if let Some(parent) = &info.parent
            && parent != "void*"
        {
            let parent_struct_name = format!("{parent}_o");
            if let Some(ps) = self
                .scanner
                .type_analyzer
                .context
                .struct_info_with_struct_name
                .get(&parent_struct_name)
                .cloned()
            {
                pre.push_str(&self.recursion_struct_info(ps));
            }
            sb.push_str(&format!(
                "struct {}_Fields : {}_Fields {{\n",
                info.type_name, parent
            ));
        } else if !info.is_value_type {
            sb.push_str(&format!(
                "struct __attribute__((aligned(8))) {}_Fields {{\n",
                info.type_name
            ));
        } else {
            sb.push_str(&format!("struct {}_Fields {{\n", info.type_name));
        }

        for field in &info.fields {
            let field_type_name = field.field_type_name.replace("**", "*");

            if field.is_value_type
                && let Some(field_info) = self
                    .scanner
                    .type_analyzer
                    .context
                    .struct_info_with_struct_name
                    .get(&field_type_name)
                    .cloned()
            {
                pre.push_str(&self.recursion_struct_info(field_info));
            }

            if field_type_name.ends_with("_o*") || field_type_name.ends_with("_array*") {
                sb.push_str(&format!(
                    "\tstruct {} {};\n",
                    field_type_name, field.field_name
                ));
            } else {
                sb.push_str(&format!("\t{} {};\n", field_type_name, field.field_name));
            }
        }

        sb.push_str("};\n");

        if !info.v_table_methods.is_empty() {
            sb.push_str(&format!("struct {}_VTable {{\n", info.type_name));
            for (i, method) in info.v_table_methods.iter().enumerate() {
                sb.push_str(&format!(
                    "\tVirtualInvokeData _{}_{};\n",
                    i, method.method_name
                ));
            }
            sb.push_str("};\n");
        }

        sb.push_str(&format!("struct {}_c {{\n", info.type_name));
        sb.push_str("\tIl2CppClass_1 _1;\n");

        if !info.static_fields.is_empty() {
            sb.push_str(&format!(
                "\tstruct {}_StaticFields* static_fields;\n",
                info.type_name
            ));
        } else {
            sb.push_str("\tvoid* static_fields;\n");
        }

        sb.push_str("\tIl2CppRGCTXData* rgctx_data;\n");
        sb.push_str("\tIl2CppClass_2 _2;\n");

        if !info.v_table_methods.is_empty() {
            sb.push_str(&format!("\t{}_VTable vtable;\n", info.type_name));
        } else {
            sb.push_str("\tVirtualInvokeData vtable[32];\n");
        }

        sb.push_str("};\n");

        sb.push_str(&format!("struct {}_o {{\n", info.type_name));

        if !info.is_value_type {
            sb.push_str(&format!("\t{}_c *klass;\n", info.type_name));
            sb.push_str("\tvoid* monitor;\n");
        }

        sb.push_str(&format!("\t{}_Fields fields;\n", info.type_name));
        sb.push_str("};\n");

        if !info.static_fields.is_empty() {
            sb.push_str(&format!("struct {}_StaticFields {{\n", info.type_name));
            for field in &info.static_fields {
                let field_type_name = field.field_type_name.replace("**", "*");

                if field.is_value_type
                    && let Some(field_info) = self
                        .scanner
                        .type_analyzer
                        .context
                        .struct_info_with_struct_name
                        .get(&field_type_name)
                        .cloned()
                {
                    pre.push_str(&self.recursion_struct_info(field_info));
                }

                if field_type_name.ends_with("_o*") || field_type_name.ends_with("_array*") {
                    sb.push_str(&format!(
                        "\tstruct {} {};\n",
                        field_type_name, field.field_name
                    ));
                } else {
                    sb.push_str(&format!("\t{} {};\n", field_type_name, field.field_name));
                }
            }
            sb.push_str("};\n");
        }

        format!("{pre}{sb}")
    }
}
