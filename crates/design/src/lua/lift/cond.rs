use crate::lua::ast::*;
use crate::lua::decode::Insn;
use crate::lua::lift::lifter::Lifter;
use crate::lua::lift::ops;
use crate::lua::opcodes::Op;

impl Lifter<'_> {
    pub(crate) fn try_bool_and_chain(&mut self, i: usize, hi: usize) -> Option<usize> {
        let start = self.insns[i];
        if !ops::is_cond_jump(start.op) {
            return None;
        }
        let end = self.idx_of_pc(start.jump_target_d());
        if end == usize::MAX || end <= i || end > hi {
            return None;
        }
        let mut sandwich_at: Option<usize> = None;
        let mut d: Option<u8> = None;
        if end >= 2 {
            let lb1 = self.insns[end - 2];
            let lb2 = self.insns[end - 1];
            if lb1.op == Op::LoadB
                && lb1.c() != 0
                && lb2.op == Op::LoadB
                && lb1.a() == lb2.a()
                && lb1.b() == 0
                && lb2.b() != 0
            {
                sandwich_at = Some(end - 2);
                d = Some(lb1.a());
            }
        }
        if d.is_none() {
            for k in i..end {
                let ins = self.insns[k];
                if ins.op == Op::LoadB && ins.b() == 0 && ins.c() == 0 {
                    d = Some(ins.a());
                    break;
                }
            }
        }
        let d = d?;
        let reinits = (i..end)
            .filter(|&j| {
                let ins = self.insns[j];
                ins.op == Op::LoadB && ins.a() == d && ins.b() == 0 && ins.c() == 0
            })
            .count();
        if reinits < 1 {
            return None;
        }
        let sandwich_true = sandwich_at.map(|s| s + 1);
        let mut terms: Vec<(usize, usize)> = Vec::new();
        let mut cursor = i;
        let scan_hi = sandwich_at.unwrap_or(end);
        while cursor < scan_hi && terms.len() < 32 {
            let mut k = cursor;
            while k < scan_hi && !ops::is_cond_jump(self.insns[k].op) {
                let op = self.insns[k].op;
                if (op == Op::Jump || op == Op::JumpX || !ops::is_cond_prefix_op(op))
                    && !(op == Op::LoadB
                        && self.insns[k].a() == d
                        && self.insns[k].b() == 0
                        && self.insns[k].c() == 0)
                {
                    return None;
                }
                k += 1;
            }
            if k >= scan_hi || !ops::is_cond_jump(self.insns[k].op) {
                break;
            }
            let tgt = self.idx_of_pc(self.insns[k].jump_target_d());
            let exits = tgt == end || sandwich_true == Some(tgt) || sandwich_at == Some(tgt);
            if !exits {
                return None;
            }
            terms.push((cursor, k));
            cursor = k + 1;
        }
        if terms.len() < 2 {
            return None;
        }
        for &(lo, j) in &terms {
            for k in lo..=j {
                if self.insns[k].op == Op::Call && self.insns[k].c() != 1 {
                    let res = self.insns[k].a();
                    let mut reads = 0;
                    for q in (k + 1)..=j {
                        if ops::reg_reads(&self.insns[q]).contains(&res) {
                            reads += 1;
                        }
                        if ops::reg_writes(&self.insns[q]).contains(&res) {
                            break;
                        }
                    }
                    if reads > 1 {
                        return None;
                    }
                }
            }
        }
        let saved = self.regs.clone();
        let saved_mr = self.multret_start;
        let saved_fic = self.force_inline_calls;
        self.force_inline_calls = true;
        let mut parts: Vec<Expr> = Vec::with_capacity(terms.len());
        let mut ok = true;
        for &(lo, j) in &terms {
            let mut scratch = Block::default();
            for k in lo..j {
                let ins = self.insns[k];
                if ins.op == Op::LoadB && ins.a() == d {
                    continue;
                }
                self.exec(&ins, &mut scratch);
            }
            if !scratch.0.is_empty() {
                ok = false;
                break;
            }
            let jmp = self.insns[j];
            let enter = self.cond_enter(&jmp);
            let tgt = self.idx_of_pc(jmp.jump_target_d());
            // Jump to false-exit: fall-through means term holds.
            // Jump into sandwich true-leg: taken means term holds.
            let term = if sandwich_true == Some(tgt) {
                ops::negate(enter)
            } else {
                enter
            };
            parts.push(term);
        }
        self.regs = saved;
        self.multret_start = saved_mr;
        self.force_inline_calls = saved_fic;
        if !ok || parts.is_empty() {
            return None;
        }
        let mut val = parts.remove(0);
        for p in parts {
            val = Expr::Bin(BinOp::And, Box::new(val), Box::new(p));
        }
        self.set_e(d as usize, val);
        Some(end)
    }

    pub(crate) fn handle_cond(&mut self, i: usize, hi: usize, out: &mut Block) -> usize {
        let ins = self.insns[i];
        let enter_cond = self.cond_enter(&ins);
        let target_pc = ins.jump_target_d();
        let tgt_idx = self.idx_of_pc(target_pc);

        if tgt_idx != usize::MAX && tgt_idx > i && tgt_idx <= hi {
            if let Some(next) = self.try_bool_and_chain(i, hi) {
                return next;
            }
            if let Some(d) = self.bool_sandwich_in(i, tgt_idx)
                && self.reads_of(d, tgt_idx) >= 1
            {
                self.partial = true;
                out.0.push(Stat::Comment("[cond: boolean value]".into()));
                return tgt_idx;
            }
        }

        if matches!(ins.op, Op::JumpIf | Op::JumpIfNot)
            && tgt_idx != usize::MAX
            && tgt_idx > i + 1
            && tgt_idx <= hi
        {
            let cond_reg = ins.a() as usize;
            let last_body = self.insns[tgt_idx - 1];
            if ops::reg_writes(&last_body).contains(&(cond_reg as u8)) {
                let x = self.get(cond_reg);
                let saved = self.regs.clone();
                let saved_mr = self.multret_start;
                let mut tmp = Block::default();
                let mut j = i + 1;
                let mut pure = true;
                while j < tgt_idx {
                    let n0 = tmp.0.len();
                    j = self.step(j, tgt_idx, &mut tmp);
                    if tmp.0.len() != n0 {
                        pure = false;
                        break;
                    }
                }
                if pure && j == tgt_idx {
                    let y = self.get(cond_reg);
                    let op = if ins.op == Op::JumpIf {
                        BinOp::Or
                    } else {
                        BinOp::And
                    };
                    self.regs = saved;
                    self.set_e(cond_reg, Expr::Bin(op, Box::new(x), Box::new(y)));
                    return tgt_idx;
                }
                self.regs = saved;
                self.multret_start = saved_mr;
            }
        }

        if let Some(rec) = self.recover_cond(i, hi) {
            return self.emit_if_ex(rec.cond, rec.then_lo, rec.merge, hi, rec.force_else, out);
        }

        if self.loop_exit.last() == Some(&target_pc) {
            let exit_cond = ops::negate(enter_cond);
            out.0
                .push(Stat::If(vec![(exit_cond, Block(vec![Stat::Break]))], None));
            return i + 1;
        }

        if tgt_idx != usize::MAX && tgt_idx < self.insns.len() {
            let tins = self.insns[tgt_idx];
            if tins.op == Op::Return {
                let vals = self.collect(tins.a(), tins.b());
                let jump_cond = ops::negate(enter_cond);
                out.0.push(Stat::If(
                    vec![(jump_cond, Block(vec![Stat::Return(vals)]))],
                    None,
                ));
                self.consumed_guard_jumps.insert(i);
                return i + 1;
            }
        }

        if tgt_idx != usize::MAX && tgt_idx <= i {
            self.partial = true;
            out.0
                .push(Stat::Comment(format!("[cond back ->{target_pc}]")));
            return i + 1;
        }

        if tgt_idx == usize::MAX || tgt_idx > hi {
            if tgt_idx != usize::MAX && self.matches_enclosing_merge(target_pc) && i + 1 < hi {
                return self.emit_if(enter_cond, i + 1, hi, hi, out);
            }
            if tgt_idx != usize::MAX && self.matches_enclosing_merge(target_pc) && i + 1 >= hi {
                return i + 1;
            }
            self.partial = true;
            out.0.push(Stat::Comment("[cond: bad target]".into()));
            return i + 1;
        }

        self.emit_if(enter_cond, i + 1, tgt_idx, hi, out)
    }

    pub(crate) fn emit_if(
        &mut self,
        enter_cond: Expr,
        then_lo: usize,
        merge_idx: usize,
        hi: usize,
        out: &mut Block,
    ) -> usize {
        self.emit_if_ex(enter_cond, then_lo, merge_idx, hi, None, out)
    }

    pub(crate) fn emit_if_ex(
        &mut self,
        enter_cond: Expr,
        then_lo: usize,
        merge_idx: usize,
        hi: usize,
        force_else: Option<(usize, usize)>,
        out: &mut Block,
    ) -> usize {
        let mut else_range: Option<(usize, usize)> = force_else;
        let mut end_idx = merge_idx;
        let mut shared_tail: Option<(usize, usize, usize)> = None;
        let mut continue_from_then: Option<usize> = None;
        let mut join_pc: Option<usize> = None;
        if force_else.is_none() && merge_idx >= 1 && merge_idx <= self.insns.len() {
            let prev = self.insns[merge_idx - 1];
            if prev.op == Op::Jump {
                let jt = prev.jump_target_d();
                if self.loop_exit.last() != Some(&jt) {
                    let jt_idx = self.idx_of_pc(jt);
                    if jt_idx != usize::MAX && jt_idx > merge_idx {
                        if jt_idx <= hi {
                            else_range = Some((merge_idx, jt_idx));
                            end_idx = jt_idx;
                        } else if merge_idx < hi && self.matches_enclosing_merge(jt) {
                            else_range = Some((merge_idx, hi));
                            end_idx = hi;
                            join_pc = Some(jt);
                        }
                    }
                }
            } else if ops::is_cond_jump(prev.op) {
                let jt = prev.jump_target_d();
                if self.loop_exit.last() != Some(&jt) {
                    let jt_idx = self.idx_of_pc(jt);
                    if jt_idx != usize::MAX && jt_idx > merge_idx {
                        if jt_idx <= hi {
                            shared_tail = Some((merge_idx - 1, merge_idx, jt_idx));
                            end_idx = jt_idx;
                        } else if self.loop_continue.last() == Some(&jt) {
                            continue_from_then = Some(merge_idx - 1);
                        }
                    }
                }
            }
        } else if force_else.is_some() {
            end_idx = merge_idx;
        }
        let then_hi = if force_else.is_some() {
            merge_idx
        } else if else_range.is_some() || shared_tail.is_some() || continue_from_then.is_some() {
            merge_idx - 1
        } else {
            merge_idx
        };

        self.materialize_tables_in(then_lo, end_idx, out);

        let mut ranges = vec![(then_lo, then_hi)];
        if let Some(r) = else_range {
            ranges.push(r);
        }
        if let Some((_, slo, shi)) = shared_tail {
            ranges.push((slo, shi));
        }
        let (phis, newly) = self.begin_phi(&ranges, &[end_idx], &[], false, out);

        let merge_pc =
            join_pc.unwrap_or_else(|| self.insns.get(end_idx).map_or(usize::MAX, |x| x.pc));
        self.merge_stack.push(merge_pc);

        let saved = self.regs.clone();
        let mut then_block = self.block(then_lo, then_hi);
        let els = if let Some((inner_jmp_idx, slo, shi)) = shared_tail {
            let inner_enter = self.cond_enter(&self.insns[inner_jmp_idx]);
            self.regs = saved.clone();
            let mut shared = self.block(slo, shi);
            self.capture_phis(&phis, &mut shared);
            let shared_for_then = Block(shared.0.clone());
            then_block
                .0
                .push(Stat::If(vec![(inner_enter, shared_for_then)], None));
            self.capture_phis(&phis, &mut then_block);
            Some(shared)
        } else if let Some(inner_jmp_idx) = continue_from_then {
            let taken = ops::negate(self.cond_enter(&self.insns[inner_jmp_idx]));
            then_block
                .0
                .push(Stat::If(vec![(taken, Block(vec![Stat::Continue]))], None));
            self.capture_phis(&phis, &mut then_block);
            None
        } else if let Some((elo, ehi)) = else_range {
            self.capture_phis(&phis, &mut then_block);
            self.regs = saved.clone();
            let mut else_block = self.block(elo, ehi);
            self.capture_phis(&phis, &mut else_block);
            Some(else_block)
        } else {
            self.capture_phis(&phis, &mut then_block);
            None
        };
        let arms = vec![(enter_cond, then_block)];
        self.merge_stack.pop();

        self.regs = saved;
        self.end_phi(&phis, newly);
        out.0.push(Stat::If(arms, els));
        end_idx
    }

    pub(crate) fn cond_enter(&self, ins: &Insn) -> Expr {
        use Op::*;
        let a = ins.a() as usize;
        match ins.op {
            JumpIf => Expr::Un(UnOp::Not, Box::new(self.get(a))),
            JumpIfNot => self.get(a),
            JumpIfEq => ops::bin(BinOp::Ne, self.get(a), self.get(ins.aux as usize)),
            JumpIfNotEq => ops::bin(BinOp::Eq, self.get(a), self.get(ins.aux as usize)),
            JumpIfLe => ops::bin(BinOp::Gt, self.get(a), self.get(ins.aux as usize)),
            JumpIfNotLe => ops::bin(BinOp::Le, self.get(a), self.get(ins.aux as usize)),
            JumpIfLt => ops::bin(BinOp::Ge, self.get(a), self.get(ins.aux as usize)),
            JumpIfNotLt => ops::bin(BinOp::Lt, self.get(a), self.get(ins.aux as usize)),
            JumpXEqKNil => {
                let notf = ins.aux >> 31 != 0;
                let cmp = ops::bin(BinOp::Eq, self.get(a), Expr::Nil);
                if notf {
                    cmp
                } else {
                    ops::bin(BinOp::Ne, self.get(a), Expr::Nil)
                }
            }
            JumpXEqKB => {
                let val = (ins.aux & 1) != 0;
                let notf = ins.aux >> 31 != 0;
                let base = ops::bin(BinOp::Eq, self.get(a), Expr::Bool(val));
                if notf {
                    base
                } else {
                    ops::bin(BinOp::Ne, self.get(a), Expr::Bool(val))
                }
            }
            JumpXEqKN | JumpXEqKS => {
                let kidx = (ins.aux & 0xffffff) as usize;
                let notf = ins.aux >> 31 != 0;
                let k = self.kexpr(kidx);
                if notf {
                    ops::bin(BinOp::Eq, self.get(a), k)
                } else {
                    ops::bin(BinOp::Ne, self.get(a), k)
                }
            }
            _ => Expr::Raw("--[[cond?]]true".into()),
        }
    }
}
