use super::Context;
use super::heaps::{BlobHeap, GuidHeap, StringHeap, deterministic_mvid};
use super::pe;
use super::tables::{self, Coded, Col, Tables};
use crate::error::Result;
use std::collections::HashMap;

mod attributes;
mod fields;
mod members;
mod methods;
mod resolve;

pub(super) use attributes::build_attribute_assembly;

pub(super) const ET_VOID: u8 = 0x01;
pub(super) const ET_STRING: u8 = 0x0E;
pub(super) const ET_PTR: u8 = 0x0F;
pub(super) const ET_VALUETYPE: u8 = 0x11;
pub(super) const ET_CLASS: u8 = 0x12;
pub(super) const ET_VAR: u8 = 0x13;
pub(super) const ET_ARRAY: u8 = 0x14;
pub(super) const ET_GENERICINST: u8 = 0x15;
pub(super) const ET_I: u8 = 0x18;
pub(super) const ET_U: u8 = 0x19;
pub(super) const ET_OBJECT: u8 = 0x1C;
pub(super) const ET_SZARRAY: u8 = 0x1D;
pub(super) const ET_MVAR: u8 = 0x1E;
pub(super) const SIG_GENERIC: u8 = 0x10;
pub(super) const SIG_FIELD: u8 = 0x06;
pub(super) const SIG_HASTHIS: u8 = 0x20;

pub(super) struct AsmBuilder<'a> {
    ctx: &'a Context<'a>,
    tables: Tables,
    strings: StringHeap,
    blobs: BlobHeap,
    guids: GuidHeap,
    local_rid: HashMap<usize, u32>,
    assembly_ref: HashMap<usize, u32>,
    type_ref: HashMap<usize, u32>,
    type_spec: HashMap<Vec<u8>, u32>,
    attr_asm_ref: Option<u32>,
    attr_ctor: HashMap<&'static str, u32>,
}

impl<'a> AsmBuilder<'a> {
    pub(super) fn build_image(ctx: &'a Context<'a>, image_index: usize) -> Result<Vec<u8>> {
        let image = &ctx.metadata.images()[image_index];
        let simple = &ctx.assembly_names[image_index];

        let mut builder = AsmBuilder {
            ctx,
            tables: Tables::new(),
            strings: StringHeap::new(),
            blobs: BlobHeap::new(),
            guids: GuidHeap::new(),
            local_rid: HashMap::new(),
            assembly_ref: HashMap::new(),
            type_ref: HashMap::new(),
            type_spec: HashMap::new(),
            attr_asm_ref: None,
            attr_ctor: HashMap::new(),
        };

        for (offset, type_index) in
            (image.type_start..image.type_start + image.type_count).enumerate()
        {
            builder.local_rid.insert(type_index, 2 + offset as u32);
        }

        builder.emit_module(simple);
        builder.emit_assembly(simple);
        builder.emit_module_type();

        for type_index in image.type_start..image.type_start + image.type_count {
            builder.emit_type(type_index)?;
        }

        Ok(builder.finish())
    }

    fn finish(self) -> Vec<u8> {
        let metadata = pe::build_metadata(
            &self.tables.serialize(),
            &self.strings.into_bytes(),
            &[0u8],
            &self.guids.into_bytes(),
            &self.blobs.into_bytes(),
        );
        pe::build_pe(&metadata)
    }

    pub(super) fn string(&mut self, value: &str) -> Col {
        Col::Heap(self.strings.add(value))
    }

    pub(super) fn blob(&mut self, value: &[u8]) -> Col {
        Col::Heap(self.blobs.add(value))
    }

    fn emit_module(&mut self, simple: &str) {
        let name = self.string(&format!("{simple}.dll"));
        let mvid = self.guids.add(deterministic_mvid(simple));
        self.tables.add(
            tables::MODULE,
            vec![
                Col::u16(0),
                name,
                Col::Heap(mvid),
                Col::Heap(0),
                Col::Heap(0),
            ],
        );
    }

    fn emit_assembly(&mut self, simple: &str) {
        let name = self.string(simple);
        self.tables.add(
            tables::ASSEMBLY,
            vec![
                Col::u32(0),
                Col::u16(4),
                Col::u16(0),
                Col::u16(0),
                Col::u16(0),
                Col::u32(0),
                Col::Heap(0),
                name,
                Col::Heap(0),
            ],
        );
    }

    fn emit_module_type(&mut self) {
        let name = self.string("<Module>");
        let namespace = self.string("");
        self.tables.add(
            tables::TYPE_DEF,
            vec![
                Col::u32(0),
                name,
                namespace,
                Col::Coded(Coded::TypeDefOrRef, 0),
                Col::Table(tables::FIELD, 1),
                Col::Table(tables::METHOD_DEF, 1),
            ],
        );
    }

    fn emit_type(&mut self, type_index: usize) -> Result<()> {
        let type_def = self.ctx.metadata.type_def(type_index)?.clone();
        let type_rid = self.local_rid[&type_index];

        let extends = match type_def.parent_index {
            Some(parent) => match self.type_ref_for_il2cpp(parent)? {
                Some((table, rid)) => Col::coded(Coded::TypeDefOrRef, table, rid),
                None => Col::Coded(Coded::TypeDefOrRef, 0),
            },
            None => Col::Coded(Coded::TypeDefOrRef, 0),
        };

        let name = self.string(&type_def.name);
        let namespace = self.string(&type_def.namespace);
        let field_list = Col::Table(tables::FIELD, self.tables.count(tables::FIELD) + 1);
        let method_list = Col::Table(
            tables::METHOD_DEF,
            self.tables.count(tables::METHOD_DEF) + 1,
        );
        self.tables.add(
            tables::TYPE_DEF,
            vec![
                Col::u32(type_def.flags),
                name,
                namespace,
                extends,
                field_list,
                method_list,
            ],
        );

        let token = 0x0200_0000 | type_index as u32;
        self.add_token_attribute(tables::TYPE_DEF, type_rid, token)?;

        self.emit_fields(type_index, &type_def)?;
        let method_rids = self.emit_methods(&type_def)?;
        self.emit_interfaces(type_rid, &type_def)?;
        self.emit_properties(&type_def, type_rid, &method_rids)?;
        self.emit_events(&type_def, type_rid, &method_rids)?;
        self.emit_nested(type_index, type_rid)?;
        self.emit_generic_params(type_index, type_rid)?;
        Ok(())
    }
}

pub(super) fn is_constructor(name: &str) -> bool {
    name == ".ctor" || name == ".cctor"
}
