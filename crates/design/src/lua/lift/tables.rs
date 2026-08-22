use crate::lua::ast::*;
use crate::lua::decode::Insn;
use crate::lua::lift::lifter::{Lifter, RV};
use crate::lua::lift::ops;
use crate::lua::opcodes::Op;

impl Lifter<'_> {
    pub(crate) fn do_setlist(&mut self, ins: &Insn, out: &mut Block) {
        let a = ins.a() as usize;
        let raw_c = ins.c();
        let vals = self.collect_from(ins.b(), raw_c);
        if let Some(Some(RV::Tab(items))) = self.regs.get_mut(a) {
            for v in vals { items.push(Item::Pos(v)); }
        } else {
            let start = ins.aux as usize;
            for (k, v) in vals.into_iter().enumerate() {
                let target = Expr::Index(Box::new(self.get(a)), Box::new(Expr::Num((start + k) as f64)));
                out.0.push(Stat::Assign(vec![target], vec![v]));
            }
        }
    }

    pub(crate) fn store(&mut self, tbl_reg: usize, target: Expr, val: Expr, item: Option<Item>, out: &mut Block) {
        if let Some(Some(RV::Tab(items))) = self.regs.get_mut(tbl_reg)
            && let Some(it) = item
        {
            items.push(it);
            return;
        }
        out.0.push(Stat::Assign(vec![target], vec![val]));
    }

    pub(crate) fn materialize_table(&mut self, r: usize, out: &mut Block) {
        let items = match self.regs.get(r) {
            Some(Some(RV::Tab(items))) => items.clone(),
            _ => return,
        };
        let name = self.fresh();
        out.0.push(Stat::Local(vec![name.clone()], vec![Expr::Table(items)]));
        self.set_e(r, Expr::Name(name));
    }

    pub(crate) fn materialize_tables_in(&mut self, lo: usize, hi: usize, out: &mut Block) {
        let mut to_mat: Vec<usize> = Vec::new();
        for k in lo..hi.min(self.insns.len()) {
            let ins = self.insns[k];
            let treg = match ins.op {
                Op::SetTable | Op::SetTableN | Op::SetTableKS => Some(ins.b() as usize),
                Op::SetList => Some(ins.a() as usize),
                _ => None,
            };
            if let Some(r) = treg
                && matches!(self.regs.get(r), Some(Some(RV::Tab(_))))
                && !to_mat.contains(&r)
            {
                to_mat.push(r);
            }
        }
        for r in 0..self.regs.len() {
            if matches!(self.regs.get(r), Some(Some(RV::Tab(_))))
                && !to_mat.contains(&r)
                && self.tab_used_as_value(r as u8, lo, hi)
            {
                to_mat.push(r);
            }
        }
        to_mat.sort_unstable();
        for r in to_mat { self.materialize_table(r, out); }
    }

    fn tab_used_as_value(&self, r: u8, lo: usize, hi: usize) -> bool {
        for k in lo..hi.min(self.insns.len()) {
            let ins = self.insns[k];
            if !ops::reg_reads(&ins).contains(&r) { continue; }
            let only_base = match ins.op {
                Op::SetTable => ins.b() == r && ins.a() != r && ins.c() != r,
                Op::SetTableN | Op::SetTableKS => ins.b() == r && ins.a() != r,
                Op::SetList => ins.a() == r,
                _ => false,
            };
            if !only_base { return true; }
        }
        false
    }

    pub(crate) fn tab_value_read_count(&self, r: u8, from: usize) -> usize {
        let mut count = 0;
        for k in from..self.insns.len() {
            let ins = self.insns[k];
            if ops::reg_reads(&ins).contains(&r) {
                let only_base = match ins.op {
                    Op::SetTable => ins.b() == r && ins.a() != r && ins.c() != r,
                    Op::SetTableN | Op::SetTableKS => ins.b() == r && ins.a() != r,
                    Op::SetList => ins.a() == r,
                    _ => false,
                };
                if !only_base { count += 1; }
            }
            if ops::reg_writes(&ins).contains(&r) { break; }
        }
        count
    }

    pub(crate) fn bool_sandwich_in(&self, lo: usize, hi: usize) -> Option<u8> {
        let end = hi.min(self.insns.len());
        let mut d = None;
        for k in lo..end.saturating_sub(1) {
            let a = self.insns[k];
            let b = self.insns[k + 1];
            if a.op == Op::LoadB && a.c() != 0 && b.op == Op::LoadB && a.a() == b.a() {
                d = Some(a.a());
                break;
            }
        }
        let d = d?;
        let reinits = (lo..end)
            .filter(|&j| {
                let ins = self.insns[j];
                ins.op == Op::LoadB && ins.a() == d && ins.b() == 0 && ins.c() == 0
            })
            .count();
        if reinits >= 2 { Some(d) } else { None }
    }
}
