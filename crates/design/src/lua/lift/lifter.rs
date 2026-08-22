use crate::lua::ast::*;
use crate::lua::bytecode::{Constant, Module, Proto};
use crate::lua::decode::{Insn, decode};
use crate::lua::disasm::resolve_import;
use crate::lua::opcodes::Op;

#[derive(Clone)]
pub(crate) enum RV {
    E(Expr),
    Tab(Vec<Item>),
}

pub struct Lifter<'a> {
    pub(crate) m: &'a Module,
    pub(crate) p: &'a Proto,
    pub(crate) proto_idx: usize,
    pub(crate) insns: Vec<Insn>,
    pub(crate) pc_to_idx: Vec<usize>,
    pub(crate) regs: Vec<Option<RV>>,
    pub(crate) multret_start: Option<usize>,
    pub(crate) namecall: std::collections::HashMap<usize, (Expr, String)>,
    pub(crate) local_ctr: usize,
    pub(crate) partial: bool,
    pub(crate) loop_exit: Vec<usize>,
    pub(crate) loop_continue: Vec<usize>,
    pub(crate) promote: std::collections::HashSet<u8>,
    pub(crate) loop_headers: std::collections::HashMap<usize, usize>,
    pub(crate) merge_stack: Vec<usize>,
    pub(crate) force_inline_calls: bool,
    pub(crate) consumed_guard_jumps: std::collections::HashSet<usize>,
}

impl<'a> Lifter<'a> {
    pub fn new(m: &'a Module, proto_idx: usize) -> Self {
        let p = &m.protos[proto_idx];
        let (insns, pc_to_idx) = decode(&p.code);
        let nregs = p.max_stack_size as usize + 2;
        let mut loop_headers = std::collections::HashMap::new();
        for (k, ins) in insns.iter().enumerate() {
            let is_branch = matches!(ins.op, Op::JumpBack | Op::Jump)
                || crate::lua::lift::ops::is_cond_jump(ins.op);
            if is_branch {
                let t = *pc_to_idx
                    .get((ins.pc as i64 + 1 + ins.d() as i64) as usize)
                    .unwrap_or(&usize::MAX);
                if t != usize::MAX && t < k {
                    let e = loop_headers.entry(t).or_insert(k);
                    if k > *e {
                        *e = k;
                    }
                }
            }
        }
        Lifter {
            m,
            p,
            proto_idx,
            insns,
            pc_to_idx,
            regs: vec![None; nregs],
            multret_start: None,
            namecall: std::collections::HashMap::new(),
            local_ctr: 0,
            partial: false,
            loop_exit: Vec::new(),
            loop_continue: Vec::new(),
            promote: std::collections::HashSet::new(),
            loop_headers,
            merge_stack: Vec::new(),
            force_inline_calls: false,
            consumed_guard_jumps: std::collections::HashSet::new(),
        }
    }

    pub fn run(mut self) -> DecFunc {
        let mut params = Vec::new();
        for i in 0..self.p.num_params as usize {
            let name = format!("p{i}");
            self.set_e(i, Expr::Name(name.clone()));
            params.push(name);
        }
        let upval_names: Vec<String> = (0..self.p.num_upvals as usize)
            .map(|i| format!("upval{i}"))
            .collect();
        let body = self.block(0, self.insns.len());
        DecFunc {
            proto: self.proto_idx,
            name: if self.p.debug_name != 0 {
                Some(self.m.string_str(self.p.debug_name))
            } else {
                None
            },
            params,
            is_vararg: self.p.is_vararg,
            upval_names,
            body,
            partial: self.partial,
        }
    }

    pub(crate) fn set_e(&mut self, r: usize, e: Expr) {
        if r < self.regs.len() {
            self.regs[r] = Some(RV::E(e));
        }
    }

    pub(crate) fn set_tab(&mut self, r: usize, items: Vec<Item>) {
        if r < self.regs.len() {
            self.regs[r] = Some(RV::Tab(items));
        }
    }

    pub(crate) fn get(&self, r: usize) -> Expr {
        match self.regs.get(r) {
            Some(Some(RV::E(e))) => e.clone(),
            Some(Some(RV::Tab(items))) => Expr::Table(items.clone()),
            _ => Expr::Name(format!("r{r}")),
        }
    }

    pub(crate) fn fresh(&mut self) -> String {
        let n = self.local_ctr;
        self.local_ctr += 1;
        format!("v{n}")
    }

    pub(crate) fn idx_of_pc(&self, pc: usize) -> usize {
        self.pc_to_idx.get(pc).copied().unwrap_or(usize::MAX)
    }

    pub(crate) fn matches_enclosing_merge(&self, target_pc: usize) -> bool {
        for &p in self.merge_stack.iter().rev() {
            if p == usize::MAX {
                return false;
            }
            if p == target_pc {
                return true;
            }
        }
        false
    }

    pub(crate) fn kexpr(&self, idx: usize) -> Expr {
        match self.p.constants.get(idx) {
            None => Expr::Raw(format!("--[[K{idx}?]]nil")),
            Some(Constant::Nil) => Expr::Nil,
            Some(Constant::Bool(b)) => Expr::Bool(*b),
            Some(Constant::Number(n)) => Expr::Num(*n),
            Some(Constant::String(sid)) => Expr::Str(self.m.string(*sid).unwrap_or(b"").to_vec()),
            Some(Constant::Import(packed)) => self.import_expr(*packed),
            Some(Constant::Table(_)) => Expr::Table(vec![]),
            Some(Constant::Closure(pid)) => Expr::Closure(*pid as usize),
        }
    }

    fn import_expr(&self, packed: u32) -> Expr {
        let path = resolve_import(self.m, self.p, packed);
        let mut parts = path.split('.');
        let mut e = match parts.next() {
            Some(first) if !first.is_empty() => Expr::Name(first.to_string()),
            _ => return Expr::Raw(format!("--[[import {packed:#x}]]nil")),
        };
        for part in parts {
            e = Expr::Field(Box::new(e), part.to_string());
        }
        e
    }

    pub(crate) fn const_str_id(&self, idx: usize) -> u32 {
        match self.p.constants.get(idx) {
            Some(Constant::String(sid)) => *sid,
            _ => 0,
        }
    }

    pub(crate) fn const_bytes(&self, idx: usize) -> Vec<u8> {
        match self.p.constants.get(idx) {
            Some(Constant::String(sid)) => self.m.string(*sid).unwrap_or(b"").to_vec(),
            _ => b"_".to_vec(),
        }
    }
}
