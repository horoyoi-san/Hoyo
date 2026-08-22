use std::fmt;

#[derive(Clone, Debug)]
pub enum Constant {
    Nil,
    Bool(bool),
    Number(f64),
    String(u32),
    Import(u32),
    Table(Vec<u32>),
    Closure(u32),
}

pub struct ImportPath(pub Vec<u32>);

pub fn decode_import(id: u32) -> ImportPath {
    let count = (id >> 30) & 3;
    let mut out = Vec::with_capacity(count as usize);
    if count >= 1 { out.push((id >> 20) & 0x3ff); }
    if count >= 2 { out.push((id >> 10) & 0x3ff); }
    if count >= 3 { out.push(id & 0x3ff); }
    ImportPath(out)
}

#[derive(Clone, Default)]
pub struct LineInfo {
    pub lines: Vec<u32>,
}

#[derive(Clone, Debug)]
pub struct LocalVar {
    pub name: u32,
    pub start_pc: u32,
    pub end_pc: u32,
    pub reg: u8,
}

#[derive(Clone)]
pub struct Proto {
    pub max_stack_size: u8,
    pub num_params: u8,
    pub num_upvals: u8,
    pub is_vararg: bool,
    pub flags: u8,
    pub type_info: Vec<u8>,
    pub code: Vec<u32>,
    pub constants: Vec<Constant>,
    pub child_protos: Vec<u32>,
    pub line_defined: u32,
    pub debug_name: u32,
    pub line_info: Option<LineInfo>,
    pub locals: Vec<LocalVar>,
    pub upval_names: Vec<u32>,
}

impl Proto {
    pub fn line_at(&self, pc: usize) -> Option<u32> {
        self.line_info.as_ref().and_then(|li| li.lines.get(pc).copied())
    }
}

pub struct Module {
    pub version: u8,
    pub types_version: u8,
    pub strings: Vec<Vec<u8>>,
    pub protos: Vec<Proto>,
    pub main_id: u32,
}

impl Module {
    pub fn string(&self, id: u32) -> Option<&[u8]> {
        if id == 0 { None } else { self.strings.get((id - 1) as usize).map(std::vec::Vec::as_slice) }
    }

    pub fn string_str(&self, id: u32) -> String {
        match self.string(id) {
            Some(b) => String::from_utf8_lossy(b).into_owned(),
            None => String::new(),
        }
    }

    pub fn main(&self) -> &Proto { &self.protos[self.main_id as usize] }
}

#[derive(Debug)]
pub enum ParseError {
    ErrorBlob(String),
    UnsupportedVersion(u8),
    Truncated,
    BadConstant(u8),
}

impl fmt::Display for ParseError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ParseError::ErrorBlob(m) => write!(f, "compile error blob: {m}"),
            ParseError::UnsupportedVersion(v) => write!(f, "unsupported bytecode version {v}"),
            ParseError::Truncated => write!(f, "unexpected end of bytecode"),
            ParseError::BadConstant(k) => write!(f, "bad constant kind {k}"),
        }
    }
}
impl std::error::Error for ParseError {}
