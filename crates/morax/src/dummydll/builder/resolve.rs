use crate::error::Result;

use super::super::heaps::compress_u32;
use super::super::tables::{self, Coded, Col};
use super::*;

fn write_typedeforref(table: u8, rid: u32, out: &mut Vec<u8>) {
    let tag = match table {
        tables::TYPE_DEF => 0,
        tables::TYPE_REF => 1,
        _ => 2,
    };
    compress_u32((rid << 2) | tag, out);
}

impl AsmBuilder<'_> {
    fn type_def_or_ref(&mut self, type_def_index: usize) -> Result<(u8, u32)> {
        if let Some(&rid) = self.local_rid.get(&type_def_index) {
            return Ok((tables::TYPE_DEF, rid));
        }
        Ok((tables::TYPE_REF, self.type_ref_for(type_def_index)?))
    }

    fn type_ref_for(&mut self, type_def_index: usize) -> Result<u32> {
        if let Some(&rid) = self.type_ref.get(&type_def_index) {
            return Ok(rid);
        }
        let type_def = self.ctx.metadata.type_def(type_def_index)?.clone();
        let scope = if let Some(declaring) = type_def.declaring_type_index {
            let enclosing = self.type_ref_for(declaring)?;
            Col::coded(Coded::ResolutionScope, tables::TYPE_REF, enclosing)
        } else {
            let image = self.ctx.type_to_image[type_def_index];
            let asm_ref = self.assembly_ref_for(image)?;
            Col::coded(Coded::ResolutionScope, tables::ASSEMBLY_REF, asm_ref)
        };
        let namespace = if type_def.declaring_type_index.is_some() {
            String::new()
        } else {
            type_def.namespace.clone()
        };
        let name = self.string(&type_def.name);
        let namespace = self.string(&namespace);
        let rid = self
            .tables
            .add(tables::TYPE_REF, vec![scope, name, namespace]);
        self.type_ref.insert(type_def_index, rid);
        Ok(rid)
    }

    fn assembly_ref_for(&mut self, image: usize) -> Result<u32> {
        if let Some(&rid) = self.assembly_ref.get(&image) {
            return Ok(rid);
        }
        let name = self.string(&self.ctx.assembly_names[image].clone());
        let rid = self.tables.add(
            tables::ASSEMBLY_REF,
            vec![
                Col::u16(4),
                Col::u16(0),
                Col::u16(0),
                Col::u16(0),
                Col::u32(0),
                Col::Heap(0),
                name,
                Col::Heap(0),
                Col::Heap(0),
            ],
        );
        self.assembly_ref.insert(image, rid);
        Ok(rid)
    }

    pub(super) fn type_ref_for_il2cpp(&mut self, type_index: u32) -> Result<Option<(u8, u32)>> {
        let entry = self.ctx.metadata.il2cpp_type(type_index)?;
        Ok(match entry.kind {
            ET_VALUETYPE | ET_CLASS => Some(self.type_def_or_ref(entry.data as usize)?),
            ET_GENERICINST | ET_ARRAY | ET_SZARRAY => {
                Some((tables::TYPE_SPEC, self.type_spec_for(type_index)?))
            }
            _ => None,
        })
    }

    fn type_spec_for(&mut self, type_index: u32) -> Result<u32> {
        let mut sig = Vec::new();
        self.encode_type(type_index, &mut sig)?;
        if let Some(&rid) = self.type_spec.get(&sig) {
            return Ok(rid);
        }
        let blob = self.blob(&sig);
        let rid = self.tables.add(tables::TYPE_SPEC, vec![blob]);
        self.type_spec.insert(sig, rid);
        Ok(rid)
    }

    pub(super) fn encode_type(&mut self, type_index: u32, out: &mut Vec<u8>) -> Result<()> {
        let entry = self.ctx.metadata.il2cpp_type(type_index)?;
        if entry.bits & 0x40 != 0 {
            out.push(0x10);
        }
        match entry.kind {
            0x01..=0x0E => out.push(entry.kind),
            ET_PTR | 0x10 => {
                out.push(ET_PTR);
                if entry.data == 0 {
                    out.push(ET_VOID);
                } else {
                    self.encode_type(entry.data, out)?;
                }
            }
            ET_VALUETYPE | ET_CLASS => {
                out.push(entry.kind);
                let (table, rid) = self.type_def_or_ref(entry.data as usize)?;
                write_typedeforref(table, rid, out);
            }
            ET_VAR | ET_MVAR => {
                out.push(entry.kind);
                let num = self.ctx.metadata.generic_parameter_num(entry.data)?;
                compress_u32(u32::from(num), out);
            }
            ET_ARRAY => {
                out.push(ET_ARRAY);
                let rva = self.ctx.metadata.array_types_rva + entry.data * 32;
                let element_va = self.ctx.metadata.pe.rd64(rva)?;
                let rank = self.ctx.metadata.pe.rd8(rva + 8)?;
                let element = self.ctx.metadata.type_ptr_index(element_va)?;
                self.encode_type(element, out)?;
                compress_u32(u32::from(rank), out);
                compress_u32(0, out);
                compress_u32(0, out);
            }
            ET_GENERICINST => {
                out.push(ET_GENERICINST);
                match self.ctx.metadata.generic_class_entry(entry.data)? {
                    Some((type_def_index, class_inst_index)) => {
                        let is_value = self.ctx.metadata.type_def(type_def_index)?.is_value_type;
                        out.push(if is_value { ET_VALUETYPE } else { ET_CLASS });
                        let (table, rid) = self.type_def_or_ref(type_def_index)?;
                        write_typedeforref(table, rid, out);
                        let args = if class_inst_index >= 0 {
                            self.ctx
                                .metadata
                                .generic_inst_arg_indices(class_inst_index as u32)?
                        } else {
                            Vec::new()
                        };
                        compress_u32(args.len() as u32, out);
                        for arg in args {
                            self.encode_type(arg, out)?;
                        }
                    }
                    None => out.push(ET_OBJECT),
                }
            }
            0x16 => out.push(0x16),
            ET_I => out.push(ET_I),
            ET_U => out.push(ET_U),
            ET_OBJECT => out.push(ET_OBJECT),
            ET_SZARRAY => {
                out.push(ET_SZARRAY);
                self.encode_type(entry.data, out)?;
            }
            _ => out.push(ET_OBJECT),
        }
        Ok(())
    }
}
