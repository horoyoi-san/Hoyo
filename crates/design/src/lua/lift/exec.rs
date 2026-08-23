use crate::lua::ast::*;
use crate::lua::decode::Insn;
use crate::lua::lift::lifter::Lifter;
use crate::lua::lift::ops::{self, bin_of};
use crate::lua::opcodes::Op;

impl Lifter<'_> {
    pub(crate) fn exec(&mut self, ins: &Insn, out: &mut Block) {
        use Op::*;
        let a = ins.a() as usize;
        let b = ins.b() as usize;
        let c = ins.c() as usize;
        match ins.op {
            Nop | Coverage | PrepVarargs | CloseUpvals | Capture | NativeCall | Break => {}
            FastCall | FastCall1 | FastCall2 | FastCall2K => {}
            LoadNil => self.def(a, Expr::Nil, out),
            LoadB => self.def(a, Expr::Bool(ins.b() != 0), out),
            LoadN => self.def(a, Expr::Num(ins.d() as f64), out),
            LoadK => self.def(a, self.kexpr(ins.d() as usize), out),
            LoadKX => self.def(a, self.kexpr(ins.aux as usize), out),
            Move => self.exec_move(ins, a, b, out),
            GetGlobal => self.def(a, Expr::Name(self.m.string_str(self.const_str_id(ins.aux as usize))), out),
            SetGlobal => {
                let name = self.m.string_str(self.const_str_id(ins.aux as usize));
                out.0.push(Stat::Assign(vec![Expr::Name(name)], vec![self.get(a)]));
            }
            GetUpval => self.def(a, Expr::Upval(b), out),
            SetUpval => out.0.push(Stat::Assign(vec![Expr::Upval(b)], vec![self.get(a)])),
            GetImport => self.def(a, self.kexpr(ins.d() as usize), out),
            GetTable => {
                let obj = self.get(b);
                let key = self.get(c);
                self.def_field(a, Expr::Index(Box::new(obj), Box::new(key)), ins, out);
            }
            GetTableN => {
                let obj = self.get(b);
                self.def_field(a, Expr::Index(Box::new(obj), Box::new(Expr::Num((c + 1) as f64))), ins, out);
            }
            GetTableKS => {
                let obj = self.get(b);
                let key = self.const_bytes(ins.aux as usize);
                self.def_field(a, crate::lua::emit::field_or_index(obj, &key), ins, out);
            }
            SetTable => {
                let key = self.get(c);
                let val = self.get(a);
                let tbl = self.get(b);
                self.store(b, Expr::Index(Box::new(tbl), Box::new(key.clone())), val.clone(), Some(Item::Keyed(key, val)), out);
            }
            SetTableN => {
                let val = self.get(a);
                let idx = Expr::Num((c + 1) as f64);
                let tbl = self.get(b);
                self.store(b, Expr::Index(Box::new(tbl), Box::new(idx.clone())), val.clone(), Some(Item::Keyed(idx, val)), out);
            }
            SetTableKS => {
                let key = self.const_bytes(ins.aux as usize);
                let val = self.get(a);
                let tbl = self.get(b);
                let target = crate::lua::emit::field_or_index(tbl, &key);
                let item = match std::str::from_utf8(&key) {
                    Ok(s) => Item::Named(s.to_string(), val.clone()),
                    Err(_) => Item::Keyed(Expr::Str(key), val.clone()),
                };
                self.store(b, target, val, Some(item), out);
            }
            NewClosure => {
                let pid = self.p.child_protos.get(ins.d() as usize).copied().unwrap_or(0) as usize;
                self.def(a, Expr::Closure(pid), out);
            }
            DupClosure => {
                if let Some(crate::lua::bytecode::Constant::Closure(pid)) = self.p.constants.get(ins.d() as usize) {
                    self.def(a, Expr::Closure(*pid as usize), out);
                } else {
                    self.def(a, Expr::Raw("--[[dupclosure?]]nil".into()), out);
                }
            }
            NameCall => {
                let obj = self.get(b);
                let name = String::from_utf8_lossy(&self.const_bytes(ins.aux as usize)).into_owned();
                self.namecall.insert(a, (obj, name));
            }
            Call => self.do_call(ins, out),
            NewTable | DupTable => {
                self.set_tab(a, vec![]);
                let k = self.idx_of_pc(ins.pc);
                if k != usize::MAX && self.tab_value_read_count(a as u8, k + 1) >= 2 {
                    self.materialize_table(a, out);
                }
            }
            SetList => self.do_setlist(ins, out),
            GetVarargs => {
                if ins.b() == 0 {
                    self.multret_start = Some(a);
                    self.set_e(a, Expr::Vararg);
                } else {
                    for k in 0..ins.b() as usize - 1 {
                        self.set_e(a + k, Expr::Vararg);
                    }
                }
            }
            Add | Sub | Mul | Div | Idiv | Mod | Pow | Band | Bor | And | Or => {
                self.def(a, Expr::Bin(bin_of(ins.op), Box::new(self.get(b)), Box::new(self.get(c))), out);
            }
            AddK | SubK | MulK | DivK | IdivK | ModK | PowK | BandK | BorK | AndK | OrK => {
                self.def(a, Expr::Bin(bin_of(ins.op), Box::new(self.get(b)), Box::new(self.kexpr(c))), out);
            }
            Concat => {
                let mut e = self.get(c);
                let mut r = c;
                while r > b {
                    r -= 1;
                    e = Expr::Bin(crate::lua::ast::BinOp::Concat, Box::new(self.get(r)), Box::new(e));
                }
                self.def(a, e, out);
            }
            Not => self.def(a, Expr::Un(crate::lua::ast::UnOp::Not, Box::new(self.get(b))), out),
            Minus => self.def(a, Expr::Un(crate::lua::ast::UnOp::Neg, Box::new(self.get(b))), out),
            Length => self.def(a, Expr::Un(crate::lua::ast::UnOp::Len, Box::new(self.get(b))), out),
            _ => {
                self.partial = true;
                out.0.push(Stat::Comment(format!("[unhandled] {}", ops::kdesc_insn(ins))));
            }
        }
    }

    fn exec_move(&mut self, ins: &Insn, a: usize, b: usize, out: &mut Block) {
        let e = self.get(b);
        let from = self.idx_of_pc(ins.pc).wrapping_add(1);
        let stable = (a as u8) < self.p.num_params || self.promote.contains(&(a as u8));
        if !stable && ops::expr_has_call(&e) && self.reads_of(a as u8, from) > 1 {
            let nm = self.fresh();
            out.0.push(Stat::Local(vec![nm.clone()], vec![e]));
            self.set_e(a, Expr::Name(nm.clone()));
            self.set_e(b, Expr::Name(nm));
        } else {
            self.def(a, e, out);
        }
    }

    pub(crate) fn do_call(&mut self, ins: &Insn, out: &mut Block) {
        let a = ins.a() as usize;
        let raw_b = ins.b();
        let raw_c = ins.c();
        let call_expr = if let Some((obj, name)) = self.namecall.remove(&a) {
            let args = self.collect_args_method(a, raw_b);
            Expr::MethodCall(Box::new(obj), name, args)
        } else {
            let func = self.get(a);
            let args = self.collect_from((a + 1) as u8, raw_b);
            Expr::Call(Box::new(func), args)
        };
        if raw_c == 0 {
            self.multret_start = Some(a);
            self.set_e(a, call_expr);
        } else if raw_c == 1 {
            out.0.push(Stat::ExprCall(call_expr));
        } else {
            let nres = (raw_c - 1) as usize;
            if nres == 1 {
                let from = self.idx_of_pc(ins.pc) + 1;
                if self.force_inline_calls {
                    self.set_e(a, call_expr);
                } else if self.promote.contains(&(a as u8)) || (a as u8) < self.p.num_params {
                    self.def(a, call_expr, out);
                } else if self.reads_of(a as u8, from) <= 1 && self.safe_to_inline(a as u8, from) {
                    self.set_e(a, call_expr);
                } else {
                    let nm = self.fresh();
                    out.0.push(Stat::Local(vec![nm.clone()], vec![call_expr]));
                    self.set_e(a, Expr::Name(nm));
                }
            } else {
                let names: Vec<String> = (0..nres).map(|_| self.fresh()).collect();
                out.0.push(Stat::Local(names.clone(), vec![call_expr]));
                for (k, nm) in names.into_iter().enumerate() {
                    self.set_e(a + k, Expr::Name(nm));
                }
            }
        }
    }
}
