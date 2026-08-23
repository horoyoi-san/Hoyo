use crate::lua::ast::*;
use crate::lua::lift::lifter::Lifter;
use crate::lua::lift::ops;
use crate::lua::opcodes::Op;

#[derive(Clone, Copy, Debug)]
enum TK {
    Then,
    Merge,
    Internal(usize),
}

pub(crate) struct RecoveredIf {
    pub cond: Expr,
    pub then_lo: usize,
    pub merge: usize,
    pub force_else: Option<(usize, usize)>,
}

impl Lifter<'_> {
    pub(crate) fn recover_cond(&mut self, i: usize, hi: usize) -> Option<RecoveredIf> {
        let mut starts: Vec<usize> = Vec::new();
        let mut jumps: Vec<usize> = Vec::new();
        let mut tgts: Vec<usize> = Vec::new();
        let mut cursor = i;
        while cursor < hi && jumps.len() < 32 {
            let mut k = cursor;
            while k < hi && !ops::is_cond_jump(self.insns[k].op) {
                let op = self.insns[k].op;
                if op == Op::Jump || op == Op::JumpX || !ops::is_cond_prefix_op(op) {
                    break;
                }
                k += 1;
            }
            if k >= hi || !ops::is_cond_jump(self.insns[k].op) {
                break;
            }
            let tgt = self.idx_of_pc(self.insns[k].jump_target_d());
            if tgt == usize::MAX || tgt <= k {
                break;
            }
            starts.push(cursor);
            jumps.push(k);
            tgts.push(tgt);
            cursor = k + 1;
        }
        if jumps.len() < 2 {
            return None;
        }

        let mut chosen: Option<(usize, usize, usize, Vec<TK>)> = None;
        for p in 2..=jumps.len() {
            let Some(cand) = self.try_two_sink(i, hi, p, &starts, &jumps, &tgts) else {
                continue;
            };
            let (t_idx, e_idx, emit_merge, kinds) = cand;
            let replace = match &chosen {
                None => true,
                Some((_, e, _, k)) => e_idx < *e || (e_idx == *e && p > k.len()),
            };
            if replace {
                chosen = Some((t_idx, e_idx, emit_merge, kinds));
            }
        }

        if let Some((mut t_idx, mut e_idx, mut emit_merge, mut kinds)) = chosen.take() {
            let mut p = kinds.len();
            while p < jumps.len() {
                let nj = jumps[p];
                if nj < t_idx || nj >= e_idx {
                    break;
                }
                if !(t_idx..nj).all(|k| ops::is_sc_operand_op(self.insns[k].op)) {
                    break;
                }
                let Some(cand) = self.try_two_sink(i, hi, p + 1, &starts, &jumps, &tgts) else {
                    break;
                };
                t_idx = cand.0;
                e_idx = cand.1;
                emit_merge = cand.2;
                kinds = cand.3;
                p += 1;
            }
            chosen = Some((t_idx, e_idx, emit_merge, kinds));
        }

        let shared_before = self.try_shared_before_then(i, hi, &jumps, &tgts);

        let (t_idx, e_idx, kinds, force_else, shared_before_then) = match (chosen, shared_before) {
            (Some((_, _, _, k)), Some((pn, s, t2, end))) if pn > k.len() => {
                let mut kinds = Vec::with_capacity(pn);
                for _ in 0..pn - 1 {
                    kinds.push(TK::Merge);
                }
                kinds.push(TK::Then);
                (t2, end, kinds, Some((s, t2)), true)
            }
            (Some((t, _e, emit_m, k)), _) => (t, emit_m, k, None, false),
            (None, Some((pn, s, t2, end))) => {
                let mut kinds = Vec::with_capacity(pn);
                for _ in 0..pn - 1 {
                    kinds.push(TK::Merge);
                }
                kinds.push(TK::Then);
                (t2, end, kinds, Some((s, t2)), true)
            }
            (None, None) => return None,
        };
        let n = kinds.len();

        let starts = &starts[..n];
        let jumps = &jumps[..n];

        for k in i..t_idx.min(self.insns.len()) {
            if self.insns[k].op == Op::Call && self.insns[k].c() != 1 {
                let res = self.insns[k].a();
                let mut reads = 0;
                for q in (k + 1)..t_idx.min(self.insns.len()) {
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

        let saved = self.regs.clone();
        let saved_mr = self.multret_start;
        let saved_fic = self.force_inline_calls;
        self.force_inline_calls = true;
        let mut preds: Vec<Expr> = Vec::with_capacity(n);
        let mut ok = true;
        for j in 0..n {
            let mut scratch = Block::default();
            for k in starts[j]..jumps[j] {
                let insn = self.insns[k];
                self.exec(&insn, &mut scratch);
            }
            if !scratch.0.is_empty() {
                ok = false;
                break;
            }
            preds.push(ops::negate(self.cond_enter(&self.insns[jumps[j]])));
        }

        let mut shared: Vec<(usize, Expr)> = Vec::new();
        if ok {
            let cond_end = force_else.map_or(t_idx, |(s, _)| s);
            for k in i..cond_end.min(self.insns.len()) {
                for w in ops::reg_writes(&self.insns[k]) {
                    if self.reads_of(w, t_idx) >= 1 || self.reads_of(w, e_idx) >= 1 {
                        let e = self.get(w as usize);
                        if ops::expr_has_call(&e) {
                            ok = false;
                            break;
                        }
                        if !shared.iter().any(|(r, _)| *r == w as usize) {
                            shared.push((w as usize, e));
                        }
                    }
                }
                if !ok {
                    break;
                }
            }
        }

        let cond = if ok {
            if shared_before_then {
                build_sc_shared_before_then(&preds, &kinds)
            } else {
                build_sc(&preds, &kinds, 0, 0)
            }
        } else {
            None
        };
        self.regs = saved;
        self.multret_start = saved_mr;
        self.force_inline_calls = saved_fic;
        let cond = cond?;
        for (r, e) in shared {
            self.set_e(r, e);
        }
        Some(RecoveredIf {
            cond,
            then_lo: t_idx,
            merge: e_idx,
            force_else,
        })
    }

    fn try_two_sink(
        &self,
        i: usize,
        hi: usize,
        p: usize,
        starts: &[usize],
        jumps: &[usize],
        tgts: &[usize],
    ) -> Option<(usize, usize, usize, Vec<TK>)> {
        if p < 2 || p > jumps.len() {
            return None;
        }
        let t_idx = jumps[p - 1] + 1;
        let e_idx = *tgts[..p].iter().max()?;
        let mut emit_merge = e_idx;
        if t_idx >= e_idx {
            return None;
        }
        if e_idx > hi {
            let e_pc = self.insns.get(e_idx).map_or(usize::MAX, |x| x.pc);
            if !self.matches_enclosing_merge(e_pc) {
                return None;
            }
            if hi <= t_idx
                || hi >= self.insns.len()
                || self.insns[hi].op != Op::Jump
                || self.idx_of_pc(self.insns[hi].jump_target_d()) != e_idx
            {
                return None;
            }
            emit_merge = hi;
        }
        let mut kinds: Vec<TK> = Vec::with_capacity(p);
        for &tgt in &tgts[..p] {
            let kind = if tgt == t_idx {
                TK::Then
            } else if tgt == e_idx {
                TK::Merge
            } else if tgt > i && tgt < t_idx {
                let m = starts[..p].iter().position(|&s| s == tgt)?;
                TK::Internal(m)
            } else {
                return None;
            };
            kinds.push(kind);
        }
        Some((t_idx, e_idx, emit_merge, kinds))
    }

    fn try_shared_before_then(
        &self,
        _i: usize,
        hi: usize,
        jumps: &[usize],
        tgts: &[usize],
    ) -> Option<(usize, usize, usize, usize)> {
        if self.loop_continue.is_empty() {
            return None;
        }
        for p in (2..=jumps.len()).rev() {
            let s = jumps[p - 1] + 1;
            let t = tgts[p - 1];
            if t <= s || t > hi {
                continue;
            }
            if tgts[..p - 1].iter().any(|&tgt| tgt != s) {
                continue;
            }
            if t == 0 {
                continue;
            }
            let prev = &self.insns[t - 1];
            let prev_ok = match prev.op {
                Op::Jump | Op::JumpX => {
                    let jt = if prev.op == Op::JumpX {
                        prev.jump_target_e()
                    } else {
                        prev.jump_target_d()
                    };
                    if self.loop_continue.last() != Some(&jt) {
                        false
                    } else {
                        let jti = self.idx_of_pc(jt);
                        jti != usize::MAX && self.insns[jti].op == Op::ForNLoop
                    }
                }
                _ => false,
            };
            if !prev_ok {
                continue;
            }
            let mut end = hi;
            if let Some(&cpc) = self.loop_continue.last() {
                let cidx = self.idx_of_pc(cpc);
                if cidx != usize::MAX && cidx > t && cidx < end {
                    end = cidx;
                }
            }
            if t >= end {
                continue;
            }
            return Some((p, s, t, end));
        }
        None
    }
}

fn build_sc(preds: &[Expr], kinds: &[TK], j: usize, depth: u32) -> Option<Expr> {
    if depth > 64 || j >= preds.len() {
        return None;
    }
    let taken = match kinds[j] {
        TK::Then => Expr::Bool(true),
        TK::Merge => Expr::Bool(false),
        TK::Internal(m) => {
            if m <= j {
                return None;
            }
            build_sc(preds, kinds, m, depth + 1)?
        }
    };
    let fall = if j + 1 == preds.len() {
        Expr::Bool(true)
    } else {
        build_sc(preds, kinds, j + 1, depth + 1)?
    };
    Some(ops::ite_expr(preds[j].clone(), taken, fall))
}

fn build_sc_shared_before_then(preds: &[Expr], kinds: &[TK]) -> Option<Expr> {
    if preds.len() != kinds.len() || preds.is_empty() {
        return None;
    }
    if !matches!(kinds[kinds.len() - 1], TK::Then) {
        return None;
    }
    let mut cond = preds[preds.len() - 1].clone();
    for j in (0..preds.len() - 1).rev() {
        if !matches!(kinds[j], TK::Merge) {
            return None;
        }
        cond = Expr::Bin(
            BinOp::And,
            Box::new(ops::negate(preds[j].clone())),
            Box::new(cond),
        );
    }
    Some(cond)
}
