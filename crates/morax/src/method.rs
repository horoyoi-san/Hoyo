use crate::crypt::attributes::MethodAttributes;
use crate::crypt::{invoker as invoker_crypt, method as method_crypt, param as param_crypt};
use crate::error::Result;
use crate::il2cpp_header::{self, GenericArgs, Registry};
use crate::metadata::Metadata;
use crate::pe::read_u16;

#[derive(Clone, Debug)]
pub struct Il2CppMethodDefinition {
    pub name: String,
    pub return_type: String,
    pub parameter_types_dump: Vec<String>,
    pub flags: u16,
    pub va: u64,
    pub rva: u64,
}

#[derive(Clone, Debug)]
pub struct Il2CppMethodSignature {
    pub name: String,
    pub flags: u16,
    pub rva: u64,
    pub va: u64,
    pub return_type_index: u32,
    pub parameter_type_indices: Vec<u32>,
    pub parameter_names: Vec<String>,
}

impl Metadata {
    pub fn method(&self, method_index: usize) -> Result<Il2CppMethodDefinition> {
        let entry = self.method_entry_offset(method_index)?;
        let raw = method_crypt::decrypt(
            &self.global_data,
            entry,
            method_index,
            self.method_attribute_xor,
        )?;

        let name = self.decode_string(raw.name_index)?;
        let return_type = self.type_csharp_name(raw.return_type_index)?;

        let mut parameter_types_dump = Vec::with_capacity(raw.parameter_count);
        if raw.parameter_count != 0 && raw.parameter_start >= 0 {
            for index in 0..raw.parameter_count {
                let parameter = self.parameter((raw.parameter_start as usize) + index)?;
                parameter_types_dump.push(self.type_csharp_name(parameter)?);
            }
        }

        let va = self.method_pointer(method_index)?;
        let rva = va.saturating_sub(self.image_base);

        Ok(Il2CppMethodDefinition {
            name,
            return_type,
            parameter_types_dump,
            flags: raw.flags,
            va,
            rva,
        })
    }

    pub(crate) fn method_sig_indices(&self, method_index: usize) -> Result<Il2CppMethodSignature> {
        let entry = self.method_entry_offset(method_index)?;
        let raw = method_crypt::decrypt(
            &self.global_data,
            entry,
            method_index,
            self.method_attribute_xor,
        )?;
        let mut parameter_type_indices = Vec::with_capacity(raw.parameter_count);
        let mut parameter_names = Vec::with_capacity(raw.parameter_count);
        if raw.parameter_count != 0 && raw.parameter_start >= 0 {
            for index in 0..raw.parameter_count {
                let parameter_index = raw.parameter_start as usize + index;
                parameter_type_indices.push(self.parameter(parameter_index)?);
                parameter_names.push(self.parameter_name(parameter_index)?);
            }
        }
        let va = self.method_pointer(method_index)?;
        Ok(Il2CppMethodSignature {
            name: self.decode_string(raw.name_index)?,
            flags: raw.flags,
            rva: va.saturating_sub(self.image_base),
            va,
            return_type_index: raw.return_type_index,
            parameter_type_indices,
            parameter_names,
        })
    }

    fn parameter_name(&self, parameter_index: usize) -> Result<String> {
        let entry = self.header.payload_offset as usize
            + self.header.parameters_offset as usize
            + parameter_index * param_crypt::ENTRY_SIZE;
        let name_index =
            param_crypt::decrypt_name_index(&self.global_data, entry, parameter_index)?;
        if name_index == u32::MAX {
            return Ok(String::new());
        }
        self.decode_string(name_index)
    }

    pub(crate) fn method_flags_and_name(&self, method_index: usize) -> Result<(u16, String)> {
        let entry = self.method_entry_offset(method_index)?;
        let raw = method_crypt::decrypt(
            &self.global_data,
            entry,
            method_index,
            self.method_attribute_xor,
        )?;
        Ok((raw.flags, self.decode_string(raw.name_index)?))
    }

    pub(crate) fn method_signature(
        &self,
        method_index: usize,
        declaring_type_index: usize,
        registry: &Registry,
    ) -> Result<(String, String)> {
        let entry = self.method_entry_offset(method_index)?;
        let raw = method_crypt::decrypt(
            &self.global_data,
            entry,
            method_index,
            self.method_attribute_xor,
        )?;
        let mut scratch = Vec::new();
        let return_type = self.field_c_type(
            raw.return_type_index,
            registry,
            &mut scratch,
            GenericArgs::NONE,
        )?;
        let type_struct =
            il2cpp_header::fix_name(registry.name(declaring_type_index).unwrap_or(""));
        let name = il2cpp_header::fix_name(&self.decode_string(raw.name_index)?);
        let is_static = raw.flags & MethodAttributes::Static.bits() as u16 != 0;

        let mut signature = format!("{return_type} {type_struct}__{name} (");
        let mut codes = String::new();
        codes.push(self.type_signature_code(raw.return_type_index)?);

        let mut first = true;
        if !is_static {
            signature.push_str(&format!("{type_struct}_o* __this"));
            codes.push('i');
            first = false;
        }
        if raw.parameter_count != 0 && raw.parameter_start >= 0 {
            for index in 0..raw.parameter_count {
                if !first {
                    signature.push_str(", ");
                }
                first = false;
                let parameter = self.parameter(raw.parameter_start as usize + index)?;
                let parameter_type =
                    self.field_c_type(parameter, registry, &mut scratch, GenericArgs::NONE)?;
                signature.push_str(&format!("{parameter_type} p{index}"));
                codes.push(self.type_signature_code(parameter)?);
            }
        }
        if !first {
            signature.push_str(", ");
        }
        signature.push_str("const MethodInfo* method);");
        Ok((signature, format!("{codes}i")))
    }

    fn type_signature_code(&self, type_index: u32) -> Result<char> {
        Ok(match self.il2cpp_type(type_index)?.kind {
            0x01 => 'v',
            0x0A | 0x0B => 'j',
            0x0C => 'f',
            0x0D => 'd',
            _ => 'i',
        })
    }

    fn method_entry_offset(&self, method_index: usize) -> Result<usize> {
        let offset = self.header.payload_offset as usize
            + self.header.methods_offset as usize
            + method_index * method_crypt::ENTRY_SIZE;
        Ok(offset)
    }

    fn parameter(&self, parameter_index: usize) -> Result<u32> {
        let entry = self.header.payload_offset as usize
            + self.header.parameters_offset as usize
            + parameter_index * param_crypt::ENTRY_SIZE;
        Ok(param_crypt::decrypt_type_index(
            &self.global_data,
            entry,
            parameter_index,
        )?)
    }

    fn method_pointer(&self, method_index: usize) -> Result<u64> {
        let rva = self.method_pointers_rva + method_index as u32 * 8;
        self.pe.rd64(rva)
    }

    pub(crate) fn method_invoker_rva(&self, method_index: usize) -> Result<Option<u64>> {
        let entry = self.header.payload_offset as usize
            + self.header.invoker_indices_offset as usize
            + method_index * 2;
        let invoker_index = read_u16(&self.global_data, entry)?;
        if invoker_index == invoker_crypt::INVOKER_INDEX_NONE
            || u32::from(invoker_index) >= self.invoker_count
        {
            return Ok(None);
        }
        let va = self
            .pe
            .rd64(self.invoker_pointers_rva + u32::from(invoker_index) * 8)?;
        Ok((va > self.image_base).then(|| va - self.image_base))
    }

    pub(crate) fn invoker_name(&self, method_index: usize) -> Result<String> {
        let entry = self.method_entry_offset(method_index)?;
        let raw = method_crypt::decrypt(
            &self.global_data,
            entry,
            method_index,
            self.method_attribute_xor,
        )?;
        let is_static = raw.flags & MethodAttributes::Static.bits() as u16 != 0;
        let ret = self.invoker_type_token(raw.return_type_index)?;
        let mut params = Vec::with_capacity(raw.parameter_count);
        if raw.parameter_count != 0 && raw.parameter_start >= 0 {
            for index in 0..raw.parameter_count {
                let parameter = self.parameter(raw.parameter_start as usize + index)?;
                params.push(self.invoker_type_token(parameter)?);
            }
        }
        let instance = if is_static { "False" } else { "True" };
        Ok(format!(
            "RuntimeInvoker_{instance}{ret}_{}",
            params.join("_")
        ))
    }

    fn invoker_type_token(&self, type_index: u32) -> Result<String> {
        let full = self.type_name(type_index, false)?;
        let base = full.split('<').next().unwrap_or(&full);
        let short = base.rsplit(['.', '/', '+']).next().unwrap_or(base);
        Ok(il2cpp_header::fix_name(short))
    }
}

