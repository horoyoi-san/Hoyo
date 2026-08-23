use crate::lua::ast::*;
use crate::lua::decode::Insn;
use crate::lua::lift::lifter::Lifter;
use crate::lua::opcodes::Op;

impl Lifter<'_> {
    pub(crate) fn block(&mut self, lo: usize, hi: usize) -> Block {
        let mut out = Block::default();
        let mut i = lo;
        while i < hi {
            i = self.step(i, hi, &mut out);
        }
        out
    }

    pub(crate) fn step(&mut self, i: usize, hi: usize, out: &mut Block) -> usize {
        let ins = self.insns[i];
        use Op::*;
        if let Some(next) = self.try_loop(i, hi, out) {
            return next;
        }
        match ins.op {
            ForNPrep => self.num_for(i, hi, out),
            ForGPrep | ForGPrepInext | ForGPrepNext => self.gen_for(i, hi, out),
            Jump | JumpX => self.handle_jump(i, hi, out),
            JumpIf | JumpIfNot | JumpIfEq | JumpIfLe | JumpIfLt | JumpIfNotEq | JumpIfNotLe
            | JumpIfNotLt | JumpXEqKNil | JumpXEqKB | JumpXEqKN | JumpXEqKS => {
                if let Some(next) = self.try_sandwich(i) {
                    next
                } else if let Some(next) = self.try_logical(i, hi) {
                    next
                } else {
                    self.handle_cond(i, hi, out)
                }
            }
            JumpBack => self.handle_jumpback(i, hi, out),
            Return => {
                let vals = self.collect(ins.a(), ins.b());
                out.0.push(Stat::Return(vals));
                self.next_reachable(i + 1, hi)
            }
            _ => {
                self.exec(&ins, out);
                i + 1
            }
        }
    }

    pub(crate) fn def(&mut self, r: usize, expr: Expr, out: &mut Block) {
        if (r as u8) < self.p.num_params {
            let name = format!("p{r}");
            out.0.push(Stat::Assign(vec![Expr::Name(name.clone())], vec![expr]));
            self.set_e(r, Expr::Name(name));
        } else if self.promote.contains(&(r as u8)) {
            let name = format!("L{r}");
            out.0.push(Stat::Assign(vec![Expr::Name(name.clone())], vec![expr]));
            self.set_e(r, Expr::Name(name));
        } else {
            self.set_e(r, expr);
        }
    }

    pub(crate) fn def_field(&mut self, r: usize, expr: Expr, def_ins: &Insn, out: &mut Block) {
        let stable = (r as u8) < self.p.num_params || self.promote.contains(&(r as u8));
        if !stable && self.field_clobbered_before_use(r as u8, def_ins) {
            let nm = self.fresh();
            out.0.push(Stat::Local(vec![nm.clone()], vec![expr]));
            self.set_e(r, Expr::Name(nm));
        } else {
            self.def(r, expr, out);
        }
    }

    fn field_clobbered_before_use(&self, a: u8, def_ins: &Insn) -> bool {
        let from = self.idx_of_pc(def_ins.pc).wrapping_add(1);
        let mut clobbered = false;
        for k in from..self.insns.len() {
            let ins = self.insns[k];
            if crate::lua::lift::ops::reg_reads(&ins).contains(&a) {
                return clobbered;
            }
            if crate::lua::lift::ops::reg_writes(&ins).contains(&a) {
                return false;
            }
            if !clobbered {
                clobbered = match ins.op {
                    Op::SetTable | Op::SetList => true,
                    Op::SetTableN => match def_ins.op {
                        Op::GetTableN => def_ins.c() == ins.c(),
                        Op::GetTable => true,
                        _ => false,
                    },
                    Op::SetTableKS => match def_ins.op {
                        Op::GetTableKS => def_ins.aux == ins.aux,
                        Op::GetTable => true,
                        _ => false,
                    },
                    _ => false,
                };
            }
        }
        false
    }
}
