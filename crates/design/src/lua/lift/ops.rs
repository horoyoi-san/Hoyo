use crate::lua::ast::*;
use crate::lua::decode::Insn;
use crate::lua::opcodes::Op;

pub(crate) fn is_cond_jump(op: Op) -> bool {
    matches!(
        op,
        Op::JumpIf
            | Op::JumpIfNot
            | Op::JumpIfEq
            | Op::JumpIfLe
            | Op::JumpIfLt
            | Op::JumpIfNotEq
            | Op::JumpIfNotLe
            | Op::JumpIfNotLt
            | Op::JumpXEqKNil
            | Op::JumpXEqKB
            | Op::JumpXEqKN
            | Op::JumpXEqKS
    )
}

pub(crate) fn is_pure_value_op(op: Op) -> bool {
    matches!(
        op,
        Op::Nop
            | Op::Coverage
            | Op::LoadNil
            | Op::LoadB
            | Op::LoadN
            | Op::LoadK
            | Op::LoadKX
            | Op::Move
            | Op::GetGlobal
            | Op::GetUpval
            | Op::GetImport
            | Op::GetTable
            | Op::GetTableN
            | Op::GetTableKS
            | Op::Add
            | Op::Sub
            | Op::Mul
            | Op::Div
            | Op::Idiv
            | Op::Mod
            | Op::Pow
            | Op::AddK
            | Op::SubK
            | Op::MulK
            | Op::DivK
            | Op::IdivK
            | Op::ModK
            | Op::PowK
            | Op::Band
            | Op::Bor
            | Op::BandK
            | Op::BorK
            | Op::And
            | Op::Or
            | Op::AndK
            | Op::OrK
            | Op::Concat
            | Op::Not
            | Op::Minus
            | Op::Length
            | Op::NewTable
            | Op::DupTable
            | Op::Jump
            | Op::JumpIf
            | Op::JumpIfNot
            | Op::JumpIfEq
            | Op::JumpIfLe
            | Op::JumpIfLt
            | Op::JumpIfNotEq
            | Op::JumpIfNotLe
            | Op::JumpIfNotLt
            | Op::JumpXEqKNil
            | Op::JumpXEqKB
            | Op::JumpXEqKN
            | Op::JumpXEqKS
    )
}

pub(crate) fn is_cond_prefix_op(op: Op) -> bool {
    is_pure_value_op(op)
        || matches!(
            op,
            Op::Call | Op::NameCall | Op::FastCall | Op::FastCall1 | Op::FastCall2 | Op::FastCall2K
        )
}

pub(crate) fn is_sc_operand_op(op: Op) -> bool {
    matches!(
        op,
        Op::Nop
            | Op::Coverage
            | Op::LoadNil
            | Op::LoadB
            | Op::LoadN
            | Op::LoadK
            | Op::LoadKX
            | Op::Move
            | Op::GetGlobal
            | Op::GetUpval
            | Op::GetImport
            | Op::GetTable
            | Op::GetTableN
            | Op::GetTableKS
            | Op::Add
            | Op::Sub
            | Op::Mul
            | Op::Div
            | Op::Idiv
            | Op::Mod
            | Op::Pow
            | Op::AddK
            | Op::SubK
            | Op::MulK
            | Op::DivK
            | Op::IdivK
            | Op::ModK
            | Op::PowK
            | Op::Band
            | Op::Bor
            | Op::BandK
            | Op::BorK
            | Op::And
            | Op::Or
            | Op::AndK
            | Op::OrK
            | Op::Concat
            | Op::Not
            | Op::Minus
            | Op::Length
    )
}

pub(crate) fn negate(e: Expr) -> Expr {
    match e {
        Expr::Un(UnOp::Not, inner) => *inner,
        Expr::Bin(op, l, r) => {
            let flipped = match op {
                BinOp::Eq => Some(BinOp::Ne),
                BinOp::Ne => Some(BinOp::Eq),
                BinOp::Lt => Some(BinOp::Ge),
                BinOp::Le => Some(BinOp::Gt),
                BinOp::Gt => Some(BinOp::Le),
                BinOp::Ge => Some(BinOp::Lt),
                _ => None,
            };
            match flipped {
                Some(op2) => Expr::Bin(op2, l, r),
                None => Expr::Un(UnOp::Not, Box::new(Expr::Bin(op, l, r))),
            }
        }
        other => Expr::Un(UnOp::Not, Box::new(other)),
    }
}

pub(crate) fn ite_value(cond: Expr, then_v: Expr, else_v: Expr) -> Expr {
    if then_v == else_v {
        return then_v;
    }
    if then_v == cond {
        return Expr::Bin(BinOp::Or, Box::new(cond), Box::new(else_v));
    }
    if else_v == cond {
        return Expr::Bin(BinOp::And, Box::new(cond), Box::new(then_v));
    }
    if let Expr::Un(UnOp::Not, p) = cond {
        let (c2, t2, e2) = (*p, else_v, then_v);
        if t2 == e2 {
            return t2;
        }
        if t2 == c2 {
            return Expr::Bin(BinOp::Or, Box::new(c2), Box::new(e2));
        }
        if e2 == c2 {
            return Expr::Bin(BinOp::And, Box::new(c2), Box::new(t2));
        }
        return Expr::IfElse(Box::new(c2), Box::new(t2), Box::new(e2));
    }
    Expr::IfElse(Box::new(cond), Box::new(then_v), Box::new(else_v))
}

pub(crate) fn ite_expr(p: Expr, t: Expr, f: Expr) -> Expr {
    match (&t, &f) {
        (Expr::Bool(true), _) => or_e(p, f),
        (Expr::Bool(false), _) => and_e(negate(p), f),
        (_, Expr::Bool(true)) => or_e(negate(p), t),
        (_, Expr::Bool(false)) => and_e(p, t),
        _ => Expr::IfElse(Box::new(p), Box::new(t), Box::new(f)),
    }
}

fn or_e(l: Expr, r: Expr) -> Expr {
    match (&l, &r) {
        (Expr::Bool(true), _) | (_, Expr::Bool(true)) => Expr::Bool(true),
        (Expr::Bool(false), _) => r,
        (_, Expr::Bool(false)) => l,
        _ => Expr::Bin(BinOp::Or, Box::new(l), Box::new(r)),
    }
}

fn and_e(l: Expr, r: Expr) -> Expr {
    match (&l, &r) {
        (Expr::Bool(false), _) | (_, Expr::Bool(false)) => Expr::Bool(false),
        (Expr::Bool(true), _) => r,
        (_, Expr::Bool(true)) => l,
        _ => Expr::Bin(BinOp::And, Box::new(l), Box::new(r)),
    }
}

pub(crate) fn bin(op: BinOp, l: Expr, r: Expr) -> Expr {
    Expr::Bin(op, Box::new(l), Box::new(r))
}

pub(crate) fn bin_of(op: Op) -> BinOp {
    use Op::*;
    match op {
        Add | AddK => BinOp::Add,
        Sub | SubK => BinOp::Sub,
        Mul | MulK => BinOp::Mul,
        Div | DivK => BinOp::Div,
        Idiv | IdivK => BinOp::FloorDiv,
        Mod | ModK => BinOp::Mod,
        Pow | PowK => BinOp::Pow,
        Band | BandK => BinOp::Band,
        Bor | BorK => BinOp::Bor,
        And | AndK => BinOp::And,
        Or | OrK => BinOp::Or,
        _ => BinOp::Add,
    }
}

pub(crate) fn build_iter_list(r#gen: Expr, state: Expr, ctrl: Expr) -> Vec<Expr> {
    let mut v = vec![r#gen];
    if !matches!(state, Expr::Nil) {
        v.push(state);
    }
    if !matches!(ctrl, Expr::Nil) {
        v.push(ctrl);
    }
    v
}

pub(crate) fn kdesc_insn(ins: &Insn) -> String {
    format!("{} (pc {})", ins.op.name(), ins.pc)
}

pub(crate) fn expr_has_call(e: &Expr) -> bool {
    match e {
        Expr::Call(..) | Expr::MethodCall(..) => true,
        Expr::Index(a, b) | Expr::Bin(_, a, b) => expr_has_call(a) || expr_has_call(b),
        Expr::Field(a, _) | Expr::Un(_, a) | Expr::Paren(a) => expr_has_call(a),
        Expr::IfElse(a, b, c) => expr_has_call(a) || expr_has_call(b) || expr_has_call(c),
        Expr::Table(items) => items.iter().any(|it| match it {
            Item::Pos(v) | Item::Named(_, v) => expr_has_call(v),
            Item::Keyed(k, v) => expr_has_call(k) || expr_has_call(v),
        }),
        _ => false,
    }
}

pub(crate) fn expr_contains(hay: &Expr, needle: &Expr) -> bool {
    if hay == needle {
        return true;
    }
    match hay {
        Expr::Index(a, b) | Expr::Bin(_, a, b) => {
            expr_contains(a, needle) || expr_contains(b, needle)
        }
        Expr::Field(a, _) | Expr::Un(_, a) | Expr::Paren(a) => expr_contains(a, needle),
        Expr::IfElse(a, b, c) => {
            expr_contains(a, needle) || expr_contains(b, needle) || expr_contains(c, needle)
        }
        Expr::Call(f, args) => {
            expr_contains(f, needle) || args.iter().any(|x| expr_contains(x, needle))
        }
        Expr::MethodCall(o, _, args) => {
            expr_contains(o, needle) || args.iter().any(|x| expr_contains(x, needle))
        }
        Expr::Table(items) => items.iter().any(|it| match it {
            Item::Pos(v) | Item::Named(_, v) => expr_contains(v, needle),
            Item::Keyed(k, v) => expr_contains(k, needle) || expr_contains(v, needle),
        }),
        _ => false,
    }
}

pub(crate) fn mentions_loopvar(e: &Expr) -> bool {
    match e {
        Expr::Name(s) => {
            let b = s.as_bytes();
            matches!(b.first(), Some(b'i') | Some(b'k'))
                && b.len() > 1
                && b[1..].iter().all(u8::is_ascii_digit)
        }
        Expr::Index(a, b) => mentions_loopvar(a) || mentions_loopvar(b),
        Expr::Field(a, _) | Expr::Un(_, a) | Expr::Paren(a) => mentions_loopvar(a),
        Expr::Call(f, args) => mentions_loopvar(f) || args.iter().any(mentions_loopvar),
        Expr::MethodCall(o, _, args) => mentions_loopvar(o) || args.iter().any(mentions_loopvar),
        Expr::Bin(_, l, r) => mentions_loopvar(l) || mentions_loopvar(r),
        Expr::IfElse(c, t, f) => mentions_loopvar(c) || mentions_loopvar(t) || mentions_loopvar(f),
        Expr::Table(items) => items.iter().any(|it| match it {
            Item::Pos(e) => mentions_loopvar(e),
            Item::Keyed(k, v) => mentions_loopvar(k) || mentions_loopvar(v),
            Item::Named(_, v) => mentions_loopvar(v),
        }),
        _ => false,
    }
}

pub(crate) fn reg_reads(ins: &Insn) -> Vec<u8> {
    use Op::*;
    let a = ins.a();
    let b = ins.b();
    let c = ins.c();
    match ins.op {
        Move | Not | Minus | Length => vec![b],
        SetUpval | SetGlobal => vec![a],
        GetTable => vec![b, c],
        SetTable => vec![a, b, c],
        GetTableN | GetTableKS => vec![b],
        SetTableN | SetTableKS => vec![a, b],
        Add | Sub | Mul | Div | Idiv | Mod | Pow | Band | Bor | And | Or => vec![b, c],
        Concat => (b..=c).collect(),
        AddK | SubK | MulK | DivK | IdivK | ModK | PowK | BandK | BorK | AndK | OrK => vec![b],
        Return => {
            let cnt = ins.b();
            if cnt == 0 {
                vec![a]
            } else {
                (a..a.saturating_add(cnt.saturating_sub(1))).collect()
            }
        }
        Call => {
            let cnt = ins.b();
            if cnt == 0 {
                vec![a, a.saturating_add(1)]
            } else {
                (a..a.saturating_add(cnt)).collect()
            }
        }
        NameCall => vec![b],
        JumpIf | JumpIfNot | JumpXEqKNil | JumpXEqKB | JumpXEqKN | JumpXEqKS => vec![a],
        JumpIfEq | JumpIfLe | JumpIfLt | JumpIfNotEq | JumpIfNotLe | JumpIfNotLt => {
            vec![a, ins.aux as u8]
        }
        _ => vec![],
    }
}

pub(crate) fn reg_writes(ins: &Insn) -> Vec<u8> {
    use Op::*;
    let a = ins.a();
    match ins.op {
        LoadNil | LoadB | LoadN | LoadK | LoadKX | Move | GetGlobal | GetUpval | GetImport
        | GetTable | GetTableN | GetTableKS | NewClosure | DupClosure | NewTable | DupTable
        | Add | Sub | Mul | Div | Idiv | Mod | Pow | Band | Bor | And | Or | AddK | SubK | MulK
        | DivK | IdivK | ModK | PowK | BandK | BorK | AndK | OrK | Concat | Not | Minus
        | Length | GetVarargs => vec![a],
        NameCall => vec![a, a.saturating_add(1)],
        Call if ins.c() != 1 => vec![a],
        _ => vec![],
    }
}
