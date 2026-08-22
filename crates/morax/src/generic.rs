use crate::crypt::generic as generic_crypt;
use crate::error::Result;
use crate::metadata::Metadata;
use crate::pe::{read_i32, read_u32};
use crate::type_def::strip_generic_arity;

impl Metadata {
    pub(crate) fn type_generic_parameter_names(
        &self,
        type_index: usize,
    ) -> Result<Option<Vec<String>>> {
        let Some(generic_container_index) = self.type_def(type_index)?.generic_container_index
        else {
            return Ok(None);
        };
        if let Some(names) = self.generic_container_cache.get(&generic_container_index) {
            return Ok(names.clone());
        }

        let entry = self.header.payload_offset as usize
            + self.header.generic_containers_offset as usize
            + generic_container_index as usize * generic_crypt::CONTAINER_ENTRY_SIZE;
        if entry + generic_crypt::CONTAINER_ENTRY_SIZE > self.global_data.len() {
            self.generic_container_cache
                .insert(generic_container_index, None);
            return Ok(None);
        }

        let (parameter_count, parameter_start) =
            generic_crypt::decrypt_container(&self.global_data, entry, generic_container_index)?;
        if parameter_count == 0 || parameter_count > 64 {
            self.generic_container_cache
                .insert(generic_container_index, None);
            return Ok(None);
        }

        let mut names = Vec::with_capacity(parameter_count as usize);
        for i in 0..parameter_count {
            let pi = parameter_start + i;
            names.push(
                self.generic_parameter_name(pi)?
                    .unwrap_or_else(|| format!("T{i}")),
            );
        }
        self.generic_container_cache
            .insert(generic_container_index, Some(names.clone()));
        Ok(Some(names))
    }

    pub(crate) fn generic_parameter_name(&self, index: u32) -> Result<Option<String>> {
        let Some(param) = self.generic_parameter(index)? else {
            return Ok(None);
        };
        let name = self.decode_string(param.name_index)?;
        Ok((!name.is_empty()).then_some(name))
    }

    fn generic_parameter_entry(&self, index: u32) -> Option<usize> {
        let entry = self.header.payload_offset as usize
            + self.header.generic_parameters_offset as usize
            + index as usize * generic_crypt::PARAMETER_ENTRY_SIZE;
        (entry + generic_crypt::PARAMETER_ENTRY_SIZE <= self.global_data.len()).then_some(entry)
    }

    /// Decode the full `Il2CppGenericParameter` entry once; `None` if out of range.
    fn generic_parameter(&self, index: u32) -> Result<Option<generic_crypt::GenericParameter>> {
        let Some(entry) = self.generic_parameter_entry(index) else {
            return Ok(None);
        };
        Ok(Some(generic_crypt::decrypt_parameter(
            &self.global_data,
            entry,
            index,
        )?))
    }

    pub(crate) fn generic_parameter_num(&self, index: u32) -> Result<u16> {
        Ok(self.generic_parameter(index)?.map_or(0, |p| p.num))
    }

    pub(crate) fn generic_parameter_owner(&self, index: u32) -> Result<Option<u32>> {
        Ok(self
            .generic_parameter(index)?
            .map(|p| u32::from(p.owner_index)))
    }

    pub(crate) fn generic_container(&self, container_index: u32) -> Result<Option<(u32, u32)>> {
        let entry = self.header.payload_offset as usize
            + self.header.generic_containers_offset as usize
            + container_index as usize * generic_crypt::CONTAINER_ENTRY_SIZE;
        if entry + generic_crypt::CONTAINER_ENTRY_SIZE > self.global_data.len() {
            return Ok(None);
        }
        let (count, start) =
            generic_crypt::decrypt_container(&self.global_data, entry, container_index)?;
        if count == 0 || count > 64 {
            return Ok(None);
        }
        Ok(Some((count, start)))
    }

    pub(crate) fn generic_inst_name(&self, class_index: u32, json: bool) -> Result<Option<String>> {
        let off = self.header.generic_classes_offset as usize
            + class_index as usize * generic_crypt::CLASS_ENTRY_SIZE;
        if off + generic_crypt::CLASS_ENTRY_SIZE > self.startup_data.len() {
            return Ok(None);
        }

        let type_def_index = read_u32(&self.startup_data, off)? as usize;
        let class_inst_index = read_i32(&self.startup_data, off + 4)?;
        if class_inst_index < 0 {
            return Ok(None);
        }

        let args = self.generic_inst_args(class_inst_index as u32, json)?;
        let base = strip_generic_arity(&self.type_def_full_name(type_def_index)?);
        Ok(Some(format!("{base}<{}>", args.join(","))))
    }

    pub(crate) fn generic_inst_args(&self, inst_index: u32, json: bool) -> Result<Vec<String>> {
        let rva = self.generic_insts_rva + inst_index * generic_crypt::INST_ENTRY_SIZE as u32;
        let arg_count = self.pe.rd32(rva)? as usize;
        let arg_table_rva = self.pe.pointer(rva + 8)?;

        let mut args = Vec::with_capacity(arg_count);
        for i in 0..arg_count {
            let arg_va = self.pe.rd64(arg_table_rva + i as u32 * 8)?;
            args.push(self.type_name(self.type_ptr_index(arg_va)?, json)?);
        }
        Ok(args)
    }

    pub(crate) fn generic_inst_arg_indices(&self, inst_index: u32) -> Result<Vec<u32>> {
        let rva = self.generic_insts_rva + inst_index * generic_crypt::INST_ENTRY_SIZE as u32;
        let arg_count = self.pe.rd32(rva)? as usize;
        let arg_table_rva = self.pe.pointer(rva + 8)?;

        let mut indices = Vec::with_capacity(arg_count);
        for i in 0..arg_count {
            let arg_va = self.pe.rd64(arg_table_rva + i as u32 * 8)?;
            indices.push(self.type_ptr_index(arg_va)?);
        }
        Ok(indices)
    }

    pub(crate) fn type_generic_param_start(&self, type_def_index: usize) -> Result<u32> {
        let Some(container_index) = self.type_def(type_def_index)?.generic_container_index else {
            return Ok(0);
        };
        let entry = self.header.payload_offset as usize
            + self.header.generic_containers_offset as usize
            + container_index as usize * generic_crypt::CONTAINER_ENTRY_SIZE;
        if entry + generic_crypt::CONTAINER_ENTRY_SIZE > self.global_data.len() {
            return Ok(0);
        }
        let (_count, parameter_start) =
            generic_crypt::decrypt_container(&self.global_data, entry, container_index)?;
        Ok(parameter_start)
    }

    pub(crate) fn generic_class_entry(&self, class_index: u32) -> Result<Option<(usize, i32)>> {
        let off = self.header.generic_classes_offset as usize
            + class_index as usize * generic_crypt::CLASS_ENTRY_SIZE;
        if off + generic_crypt::CLASS_ENTRY_SIZE > self.startup_data.len() {
            return Ok(None);
        }
        let type_def_index = read_u32(&self.startup_data, off)? as usize;
        let class_inst_index = read_i32(&self.startup_data, off + 4)?;
        Ok(Some((type_def_index, class_inst_index)))
    }

    pub(crate) fn generic_inst_declaration_name(&self, class_index: u32) -> Result<Option<String>> {
        let off = self.header.generic_classes_offset as usize
            + class_index as usize * generic_crypt::CLASS_ENTRY_SIZE;
        if off + generic_crypt::CLASS_ENTRY_SIZE > self.startup_data.len() {
            return Ok(None);
        }
        let type_def_index = read_u32(&self.startup_data, off)? as usize;
        let class_inst_index = read_i32(&self.startup_data, off + 4)?;
        let base = strip_generic_arity(&self.type_def_short_name(type_def_index)?);
        if class_inst_index < 0 {
            return Ok(Some(base));
        }
        let args = self.generic_inst_declaration_args(class_inst_index as u32)?;
        Ok(Some(format!("{base}<{}>", args.join(", "))))
    }

    fn generic_inst_declaration_args(&self, inst_index: u32) -> Result<Vec<String>> {
        let rva = self.generic_insts_rva + inst_index * generic_crypt::INST_ENTRY_SIZE as u32;
        let arg_count = self.pe.rd32(rva)? as usize;
        let arg_table_rva = self.pe.pointer(rva + 8)?;
        let mut args = Vec::with_capacity(arg_count);
        for i in 0..arg_count {
            let arg_va = self.pe.rd64(arg_table_rva + i as u32 * 8)?;
            args.push(self.type_csharp_name(self.type_ptr_index(arg_va)?)?);
        }
        Ok(args)
    }
}
