use crate::error::Result;

use super::super::ATTRIBUTE_ASSEMBLY;
use super::super::heaps::{BlobHeap, GuidHeap, StringHeap, compress_u32, deterministic_mvid};
use super::super::pe;
use super::super::tables::{self, Coded, Col, Tables};
use super::*;

fn ser_string(value: &str, out: &mut Vec<u8>) {
    compress_u32(value.len() as u32, out);
    out.extend_from_slice(value.as_bytes());
}

impl AsmBuilder<'_> {
    pub(super) fn add_token_attribute(
        &mut self,
        parent_table: u8,
        parent_rid: u32,
        token: u32,
    ) -> Result<()> {
        self.add_named_attribute(
            parent_table,
            parent_rid,
            "TokenAttribute",
            &[("Token", format!("0x{token:X}"))],
        )
    }

    pub(super) fn add_named_attribute(
        &mut self,
        parent_table: u8,
        parent_rid: u32,
        attribute: &'static str,
        fields: &[(&str, String)],
    ) -> Result<()> {
        let ctor = self.attribute_ctor(attribute)?;

        let mut value = vec![0x01, 0x00];
        value.extend_from_slice(&(fields.len() as u16).to_le_bytes());
        for (name, content) in fields {
            value.push(0x53);
            value.push(ET_STRING);
            ser_string(name, &mut value);
            ser_string(content, &mut value);
        }

        let blob = self.blob(&value);
        self.tables.add(
            tables::CUSTOM_ATTRIBUTE,
            vec![
                Col::coded(Coded::HasCustomAttribute, parent_table, parent_rid),
                Col::coded(Coded::CustomAttributeType, tables::MEMBER_REF, ctor),
                blob,
            ],
        );
        Ok(())
    }

    fn attribute_ctor(&mut self, attribute: &'static str) -> Result<u32> {
        if let Some(&rid) = self.attr_ctor.get(attribute) {
            return Ok(rid);
        }
        let asm_ref = if let Some(rid) = self.attr_asm_ref { rid } else {
            let name = self.string(ATTRIBUTE_ASSEMBLY);
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
            self.attr_asm_ref = Some(rid);
            rid
        };

        let type_name = self.string(attribute);
        let type_ns = self.string("");
        let type_ref = self.tables.add(
            tables::TYPE_REF,
            vec![
                Col::coded(Coded::ResolutionScope, tables::ASSEMBLY_REF, asm_ref),
                type_name,
                type_ns,
            ],
        );

        let ctor_sig = self.blob(&[SIG_HASTHIS, 0x00, ET_VOID]);
        let ctor_name = self.string(".ctor");
        let ctor = self.tables.add(
            tables::MEMBER_REF,
            vec![
                Col::coded(Coded::MemberRefParent, tables::TYPE_REF, type_ref),
                ctor_name,
                ctor_sig,
            ],
        );
        self.attr_ctor.insert(attribute, ctor);
        Ok(ctor)
    }
}

pub(in crate::dummydll) fn build_attribute_assembly() -> Vec<u8> {
    let mut tables = Tables::new();
    let mut strings = StringHeap::new();
    let mut blobs = BlobHeap::new();
    let mut guids = GuidHeap::new();

    let mut s = |value: &str| strings.add(value);

    let mvid = guids.add(deterministic_mvid(ATTRIBUTE_ASSEMBLY));
    tables.add(
        tables::MODULE,
        vec![
            Col::u16(0),
            Col::Heap(s(&format!("{ATTRIBUTE_ASSEMBLY}.dll"))),
            Col::Heap(mvid),
            Col::Heap(0),
            Col::Heap(0),
        ],
    );
    tables.add(
        tables::ASSEMBLY,
        vec![
            Col::u32(0),
            Col::u16(4),
            Col::u16(0),
            Col::u16(0),
            Col::u16(0),
            Col::u32(0),
            Col::Heap(0),
            Col::Heap(s(ATTRIBUTE_ASSEMBLY)),
            Col::Heap(0),
        ],
    );

    let mscorlib = tables.add(
        tables::ASSEMBLY_REF,
        vec![
            Col::u16(4),
            Col::u16(0),
            Col::u16(0),
            Col::u16(0),
            Col::u32(0),
            Col::Heap(0),
            Col::Heap(s("mscorlib")),
            Col::Heap(0),
            Col::Heap(0),
        ],
    );
    let attribute_base = tables.add(
        tables::TYPE_REF,
        vec![
            Col::coded(Coded::ResolutionScope, tables::ASSEMBLY_REF, mscorlib),
            Col::Heap(s("Attribute")),
            Col::Heap(s("System")),
        ],
    );

    tables.add(
        tables::TYPE_DEF,
        vec![
            Col::u32(0),
            Col::Heap(s("<Module>")),
            Col::Heap(s("")),
            Col::Coded(Coded::TypeDefOrRef, 0),
            Col::Table(tables::FIELD, 1),
            Col::Table(tables::METHOD_DEF, 1),
        ],
    );

    let string_field_sig = blobs.add(&[SIG_FIELD, ET_STRING]);
    let ctor_sig = blobs.add(&[SIG_HASTHIS, 0x00, ET_VOID]);
    const TYPE_FLAGS: u32 = 0x0010_0001;
    const FIELD_FLAGS: u32 = 0x0000_0006;
    const CTOR_FLAGS: u32 = 0x0000_1886;

    let attribute_types: [(&str, &[&str]); 4] = [
        ("AddressAttribute", &["RVA", "Offset", "VA", "Slot", "Name"]),
        ("FieldOffsetAttribute", &["Offset"]),
        ("TokenAttribute", &["Token"]),
        ("GenericInstMethodAttribute", &["RVA", "Name"]),
    ];

    for (type_name, fields) in attribute_types {
        let field_list = tables.count(tables::FIELD) + 1;
        let method_list = tables.count(tables::METHOD_DEF) + 1;
        tables.add(
            tables::TYPE_DEF,
            vec![
                Col::u32(TYPE_FLAGS),
                Col::Heap(s(type_name)),
                Col::Heap(s("")),
                Col::coded(Coded::TypeDefOrRef, tables::TYPE_REF, attribute_base),
                Col::Table(tables::FIELD, field_list),
                Col::Table(tables::METHOD_DEF, method_list),
            ],
        );
        for field_name in fields {
            tables.add(
                tables::FIELD,
                vec![
                    Col::u16(FIELD_FLAGS),
                    Col::Heap(s(field_name)),
                    Col::Heap(string_field_sig),
                ],
            );
        }
        tables.add(
            tables::METHOD_DEF,
            vec![
                Col::u32(pe::METHOD_BODY_RVA),
                Col::u16(0),
                Col::u16(CTOR_FLAGS),
                Col::Heap(s(".ctor")),
                Col::Heap(ctor_sig),
                Col::Table(tables::PARAM, 1),
            ],
        );
    }

    let metadata = pe::build_metadata(
        &tables.serialize(),
        &strings.into_bytes(),
        &[0u8],
        &guids.into_bytes(),
        &blobs.into_bytes(),
    );
    pe::build_pe(&metadata)
}
