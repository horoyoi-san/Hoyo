pub(super) const MODULE: u8 = 0x00;
pub(super) const TYPE_REF: u8 = 0x01;
pub(super) const TYPE_DEF: u8 = 0x02;
pub(super) const FIELD: u8 = 0x04;
pub(super) const METHOD_DEF: u8 = 0x06;
pub(super) const PARAM: u8 = 0x08;
pub(super) const INTERFACE_IMPL: u8 = 0x09;
pub(super) const MEMBER_REF: u8 = 0x0A;
pub(super) const CONSTANT: u8 = 0x0B;
pub(super) const CUSTOM_ATTRIBUTE: u8 = 0x0C;
pub(super) const DECL_SECURITY: u8 = 0x0E;
pub(super) const STANDALONE_SIG: u8 = 0x11;
pub(super) const EVENT_MAP: u8 = 0x12;
pub(super) const EVENT: u8 = 0x14;
pub(super) const PROPERTY_MAP: u8 = 0x15;
pub(super) const PROPERTY: u8 = 0x17;
pub(super) const METHOD_SEMANTICS: u8 = 0x18;
pub(super) const MODULE_REF: u8 = 0x1A;
pub(super) const TYPE_SPEC: u8 = 0x1B;
pub(super) const ASSEMBLY: u8 = 0x20;
pub(super) const ASSEMBLY_REF: u8 = 0x23;
pub(super) const FILE: u8 = 0x26;
pub(super) const EXPORTED_TYPE: u8 = 0x27;
pub(super) const MANIFEST_RESOURCE: u8 = 0x28;
pub(super) const NESTED_CLASS: u8 = 0x29;
pub(super) const GENERIC_PARAM: u8 = 0x2A;
pub(super) const METHOD_SPEC: u8 = 0x2B;
pub(super) const GENERIC_PARAM_CONSTRAINT: u8 = 0x2C;
const TABLE_COUNT: usize = 64;
const SORTED_TABLES: &[(u8, usize)] = &[
    (INTERFACE_IMPL, 0),   // Class
    (CONSTANT, 1),         // Parent
    (CUSTOM_ATTRIBUTE, 0), // Parent
    (METHOD_SEMANTICS, 2), // Association
    (NESTED_CLASS, 0),     // NestedClass
    (GENERIC_PARAM, 2),    // Owner (secondary sort on Number, column 0)
];

#[derive(Clone, Copy, PartialEq, Eq)]
pub(super) enum Coded {
    TypeDefOrRef,
    HasConstant,
    HasCustomAttribute,
    HasSemantics,
    MemberRefParent,
    CustomAttributeType,
    ResolutionScope,
    TypeOrMethodDef,
}

impl Coded {
    fn tag_bits(self) -> u32 {
        match self {
            Coded::TypeDefOrRef | Coded::HasConstant | Coded::ResolutionScope => 2,
            Coded::HasSemantics | Coded::TypeOrMethodDef => 1,
            Coded::MemberRefParent | Coded::CustomAttributeType => 3,
            Coded::HasCustomAttribute => 5,
        }
    }

    fn tables(self) -> &'static [u8] {
        match self {
            Coded::TypeDefOrRef => &[TYPE_DEF, TYPE_REF, TYPE_SPEC],
            Coded::HasConstant => &[FIELD, PARAM, PROPERTY],
            Coded::HasSemantics => &[EVENT, PROPERTY],
            Coded::MemberRefParent => &[TYPE_DEF, TYPE_REF, MODULE_REF, METHOD_DEF, TYPE_SPEC],
            Coded::CustomAttributeType => &[0xFF, 0xFF, METHOD_DEF, MEMBER_REF, 0xFF],
            Coded::ResolutionScope => &[MODULE, MODULE_REF, ASSEMBLY_REF, TYPE_REF],
            Coded::TypeOrMethodDef => &[TYPE_DEF, METHOD_DEF],
            Coded::HasCustomAttribute => &[
                METHOD_DEF,
                FIELD,
                TYPE_REF,
                TYPE_DEF,
                PARAM,
                INTERFACE_IMPL,
                MEMBER_REF,
                MODULE,
                DECL_SECURITY,
                PROPERTY,
                EVENT,
                STANDALONE_SIG,
                MODULE_REF,
                TYPE_SPEC,
                ASSEMBLY,
                ASSEMBLY_REF,
                FILE,
                EXPORTED_TYPE,
                MANIFEST_RESOURCE,
                GENERIC_PARAM,
                GENERIC_PARAM_CONSTRAINT,
                METHOD_SPEC,
            ],
        }
    }

    pub(super) fn encode(self, table: u8, rid: u32) -> u32 {
        let tag = self
            .tables()
            .iter()
            .position(|&t| t == table)
            .expect("table not valid for coded index") as u32;
        (rid << self.tag_bits()) | tag
    }

    fn width(self, counts: &[u32; TABLE_COUNT]) -> usize {
        let max_rows = self
            .tables()
            .iter()
            .filter(|&&t| t != 0xFF)
            .map(|&t| counts[t as usize])
            .max()
            .unwrap_or(0);
        if max_rows < (1u32 << (16 - self.tag_bits())) {
            2
        } else {
            4
        }
    }
}

#[derive(Clone)]
pub(super) enum Col {
    Fixed(u32, u8),
    Heap(u32),
    Table(u8, u32),
    Coded(Coded, u32),
}

impl Col {
    pub(super) fn u16(value: u32) -> Col {
        Col::Fixed(value, 2)
    }

    pub(super) fn u32(value: u32) -> Col {
        Col::Fixed(value, 4)
    }

    pub(super) fn coded(kind: Coded, table: u8, rid: u32) -> Col {
        Col::Coded(kind, kind.encode(table, rid))
    }

    fn sort_value(&self) -> u32 {
        match *self {
            Col::Fixed(value, _) | Col::Heap(value) | Col::Coded(_, value) => value,
            Col::Table(_, rid) => rid,
        }
    }

    fn width(&self, counts: &[u32; TABLE_COUNT]) -> usize {
        match self {
            Col::Fixed(_, bytes) => *bytes as usize,
            Col::Heap(_) => 4,
            Col::Table(table, _) => simple_index_width(counts[*table as usize]),
            Col::Coded(kind, _) => kind.width(counts),
        }
    }

    fn emit(&self, counts: &[u32; TABLE_COUNT], out: &mut Vec<u8>) {
        let value = match *self {
            Col::Fixed(value, _) | Col::Heap(value) | Col::Coded(_, value) => value,
            Col::Table(_, rid) => rid,
        };
        let bytes = value.to_le_bytes();
        out.extend_from_slice(&bytes[..self.width(counts)]);
    }
}

fn simple_index_width(rows: u32) -> usize {
    if rows < 0x1_0000 { 2 } else { 4 }
}

pub(super) struct Tables {
    rows: Vec<Vec<Vec<Col>>>,
}

impl Tables {
    pub(super) fn new() -> Self {
        Self {
            rows: vec![Vec::new(); TABLE_COUNT],
        }
    }

    pub(super) fn add(&mut self, table: u8, row: Vec<Col>) -> u32 {
        let table = &mut self.rows[table as usize];
        table.push(row);
        table.len() as u32
    }

    pub(super) fn count(&self, table: u8) -> u32 {
        self.rows[table as usize].len() as u32
    }

    fn counts(&self) -> [u32; TABLE_COUNT] {
        let mut counts = [0u32; TABLE_COUNT];
        for (index, table) in self.rows.iter().enumerate() {
            counts[index] = table.len() as u32;
        }
        counts
    }

    fn sort(&mut self) {
        for &(table, key) in SORTED_TABLES {
            self.rows[table as usize].sort_by_key(|row| {
                let primary = row[key].sort_value();
                let secondary = if table == GENERIC_PARAM {
                    row[0].sort_value()
                } else {
                    0
                };
                (primary, secondary)
            });
        }
    }

    pub(super) fn serialize(mut self) -> Vec<u8> {
        self.sort();
        let counts = self.counts();

        let mut valid = 0u64;
        let mut sorted = 0u64;
        for (table, &count) in counts.iter().enumerate() {
            if count != 0 {
                valid |= 1u64 << table;
            }
        }
        for &(table, _) in SORTED_TABLES {
            sorted |= 1u64 << table;
        }

        let mut out = Vec::new();
        out.extend_from_slice(&0u32.to_le_bytes()); // Reserved
        out.push(2); // MajorVersion
        out.push(0); // MinorVersion
        out.push(0x07); // HeapSizes: #Strings, #GUID and #Blob all 4-byte
        out.push(1); // Reserved
        out.extend_from_slice(&valid.to_le_bytes());
        out.extend_from_slice(&sorted.to_le_bytes());

        for &count in &counts {
            if count != 0 {
                out.extend_from_slice(&count.to_le_bytes());
            }
        }

        for rows in &self.rows {
            for row in rows {
                for col in row {
                    col.emit(&counts, &mut out);
                }
            }
        }
        out
    }
}
