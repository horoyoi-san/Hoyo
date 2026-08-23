use std::fmt::Write;
use crate::lua::bytecode::{decode_import, Constant, Module, Proto};
use crate::lua::decode::Insn;
use crate::lua::opcodes::Op;

pub fn fmt_number(n: f64) -> String {
    if n.is_nan() { return "0/0".into(); }
    if n.is_infinite() { return if n < 0.0 { "-1/0".into() } else { "1/0".into() }; }
    if n == n.trunc() && n.abs() < 1e15 { return format!("{}", n as i64); }
    let mut s = format!("{n}");
    if !s.contains('.') && !s.contains('e') && !s.contains('E') { s.push_str(".0"); }
    s
}

pub fn quote_string(b: &[u8]) -> String {
    let mut s = String::with_capacity(b.len() + 2);
    s.push('"');
    for &ch in b {
        match ch {
            b'"' => s.push_str("\\\""), b'\\' => s.push_str("\\\\"),
            b'\n' => s.push_str("\\n"), b'\r' => s.push_str("\\r"),
            b'\t' => s.push_str("\\t"), 0 => s.push_str("\\0"),
            0x20..=0x7e => s.push(ch as char),
            _ => { let _ = write!(s, "\\{ch}"); }
        }
    }
    s.push('"');
    s
}

pub fn resolve_import(m: &Module, p: &Proto, packed: u32) -> String {
    let path = decode_import(packed);
    let mut parts = Vec::new();
    for cidx in path.0 {
        if let Some(Constant::String(sid)) = p.constants.get(cidx as usize) {
            parts.push(m.string_str(*sid));
        } else {
            parts.push(format!("k{cidx}"));
        }
    }
    parts.join(".")
}

pub fn kdesc(m: &Module, p: &Proto, idx: usize) -> String {
    match p.constants.get(idx) {
        None => format!("K{idx}?"),
        Some(Constant::Nil) => "nil".into(),
        Some(Constant::Bool(v)) => v.to_string(),
        Some(Constant::Number(n)) => fmt_number(*n),
        Some(Constant::String(sid)) => quote_string(m.string(*sid).unwrap_or(b"")),
        Some(Constant::Import(packed)) => format!("import({})", resolve_import(m, p, *packed)),
        Some(Constant::Table(_)) => "{table}".into(),
        Some(Constant::Closure(pi)) => format!("closure(P{pi})"),
    }
}

impl Insn {
    pub(crate) fn jump_target_d_c(&self) -> usize {
        self.pc + 1 + self.c() as usize
    }
}

pub fn fmt_insn(m: &Module, p: &Proto, ins: &Insn) -> String {
    use Op::*;
    let a = ins.a(); let b = ins.b(); let c = ins.c();
    let d = ins.d(); let aux = ins.aux;
    match ins.op {
        Nop => "NOP".into(),
        Break => "BREAK".into(),
        LoadNil => format!("LOADNIL R{a}"),
        LoadB => format!("LOADB R{a} {b} +{c}"),
        LoadN => format!("LOADN R{a} {d}"),
        LoadK => format!("LOADK R{a} K{d}  ; {}", kdesc(m, p, d as usize)),
        Move => format!("MOVE R{a} R{b}"),
        GetGlobal => format!("GETGLOBAL R{a} K{aux}  ; {}", kdesc(m, p, aux as usize)),
        SetGlobal => format!("SETGLOBAL R{a} K{aux}  ; {}", kdesc(m, p, aux as usize)),
        GetUpval => format!("GETUPVAL R{a} U{b}"),
        SetUpval => format!("SETUPVAL R{a} U{b}"),
        CloseUpvals => format!("CLOSEUPVALS R{a}"),
        GetImport => format!("GETIMPORT R{a} K{d}  ; {}", kdesc(m, p, d as usize)),
        GetTable => format!("GETTABLE R{a} R{b} R{c}"),
        SetTable => format!("SETTABLE R{a} R{b} R{c}"),
        GetTableKS => format!("GETTABLEKS R{a} R{b} K{aux}  ; {}", kdesc(m, p, aux as usize)),
        SetTableKS => format!("SETTABLEKS R{a} R{b} K{aux}  ; {}", kdesc(m, p, aux as usize)),
        GetTableN => format!("GETTABLEN R{a} R{b} {}", c as u32 + 1),
        SetTableN => format!("SETTABLEN R{a} R{b} {}", c as u32 + 1),
        NewClosure => format!("NEWCLOSURE R{a} P{d}"),
        NameCall => format!("NAMECALL R{a} R{b} K{aux}  ; {}", kdesc(m, p, aux as usize)),
        Call => format!("CALL R{a} {} {}", b as i32 - 1, c as i32 - 1),
        Return => format!("RETURN R{a} {}", b as i32 - 1),
        Jump => format!("JUMP ->{}", ins.jump_target_d()),
        JumpBack => format!("JUMPBACK ->{}", ins.jump_target_d()),
        JumpIf => format!("JUMPIF R{a} ->{}", ins.jump_target_d()),
        JumpIfNot => format!("JUMPIFNOT R{a} ->{}", ins.jump_target_d()),
        JumpIfEq => format!("JUMPIFEQ R{a} R{aux} ->{}", ins.jump_target_d()),
        JumpIfLe => format!("JUMPIFLE R{a} R{aux} ->{}", ins.jump_target_d()),
        JumpIfLt => format!("JUMPIFLT R{a} R{aux} ->{}", ins.jump_target_d()),
        JumpIfNotEq => format!("JUMPIFNOTEQ R{a} R{aux} ->{}", ins.jump_target_d()),
        JumpIfNotLe => format!("JUMPIFNOTLE R{a} R{aux} ->{}", ins.jump_target_d()),
        JumpIfNotLt => format!("JUMPIFNOTLT R{a} R{aux} ->{}", ins.jump_target_d()),
        Add => format!("ADD R{a} R{b} R{c}"), Sub => format!("SUB R{a} R{b} R{c}"),
        Mul => format!("MUL R{a} R{b} R{c}"), Div => format!("DIV R{a} R{b} R{c}"),
        Mod => format!("MOD R{a} R{b} R{c}"), Pow => format!("POW R{a} R{b} R{c}"),
        AddK => format!("ADDK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        SubK => format!("SUBK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        MulK => format!("MULK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        DivK => format!("DIVK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        ModK => format!("MODK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        PowK => format!("POWK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        Band => format!("BAND R{a} R{b} R{c}"), Bor => format!("BOR R{a} R{b} R{c}"),
        BandK => format!("BANDK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        BorK => format!("BORK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        And => format!("AND R{a} R{b} R{c}"), Or => format!("OR R{a} R{b} R{c}"),
        AndK => format!("ANDK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        OrK => format!("ORK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        Concat => format!("CONCAT R{a} R{b} R{c}"),
        Not => format!("NOT R{a} R{b}"), Minus => format!("MINUS R{a} R{b}"),
        Length => format!("LENGTH R{a} R{b}"),
        NewTable => format!("NEWTABLE R{a} sz={b} arr={aux}"),
        DupTable => format!("DUPTABLE R{a} K{d}"),
        SetList => format!("SETLIST R{a} R{b} {} [{aux}]", c as i32 - 1),
        ForNPrep => format!("FORNPREP R{a} ->{}", ins.jump_target_d()),
        ForNLoop => format!("FORNLOOP R{a} ->{}", ins.jump_target_d()),
        ForGLoop => format!("FORGLOOP R{a} ->{} {aux}", ins.jump_target_d()),
        ForGPrepInext => format!("FORGPREP_INEXT R{a} ->{}", ins.jump_target_d()),
        DepForGLoopInext => format!("FORGLOOP_INEXT R{a}"),
        ForGPrepNext => format!("FORGPREP_NEXT R{a} ->{}", ins.jump_target_d()),
        NativeCall => "NATIVECALL".into(),
        GetVarargs => format!("GETVARARGS R{a} {}", b as i32 - 1),
        DupClosure => format!("DUPCLOSURE R{a} K{d}  ; {}", kdesc(m, p, d as usize)),
        PrepVarargs => format!("PREPVARARGS {a}"),
        LoadKX => format!("LOADKX R{a} K{aux}  ; {}", kdesc(m, p, aux as usize)),
        JumpX => format!("JUMPX ->{}", ins.jump_target_e()),
        FastCall => format!("FASTCALL {a} ->{}", ins.jump_target_d_c()),
        Coverage => "COVERAGE".into(),
        Capture => {
            let kind = match a { 0 => "VAL", 1 => "REF", 2 => "UPVAL", _ => "?" };
            format!("CAPTURE {kind} {b}")
        }
        DepJumpIfEqK => format!("JUMPIFEQK R{a} K{aux} ->{}", ins.jump_target_d()),
        DepJumpIfNotEqK => format!("JUMPIFNOTEQK R{a} K{aux} ->{}", ins.jump_target_d()),
        FastCall1 => format!("FASTCALL1 {a} R{b} ->{}", ins.jump_target_d_c()),
        FastCall2 => format!("FASTCALL2 {a} R{b} R{aux} ->{}", ins.jump_target_d_c()),
        FastCall2K => format!("FASTCALL2K {a} R{b} K{aux} ->{}", ins.jump_target_d_c()),
        ForGPrep => format!("FORGPREP R{a} ->{}", ins.jump_target_d()),
        JumpXEqKNil => format!("JUMPXEQKNIL R{a} ->{} {}", ins.jump_target_d(), if aux >> 31 != 0 { "not" } else { "" }),
        JumpXEqKB => format!("JUMPXEQKB R{a} {} ->{} {}", aux & 1, ins.jump_target_d(), if aux >> 31 != 0 { "not" } else { "" }),
        JumpXEqKN => format!("JUMPXEQKN R{a} K{}  ->{} {}", aux & 0xffffff, ins.jump_target_d(), if aux >> 31 != 0 { "not" } else { "" }),
        JumpXEqKS => format!("JUMPXEQKS R{a} K{}  ->{} {}", aux & 0xffffff, ins.jump_target_d(), if aux >> 31 != 0 { "not" } else { "" }),
        Idiv => format!("IDIV R{a} R{b} R{c}"),
        IdivK => format!("IDIVK R{a} R{b} K{c}  ; {}", kdesc(m, p, c as usize)),
        Unknown(byte) => format!("UNKNOWN({byte}) raw={:08x}", ins.raw),
    }
}
