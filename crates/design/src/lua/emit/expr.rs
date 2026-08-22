use crate::lua::ast::*;
use crate::lua::disasm::{fmt_number, quote_string};
use crate::lua::emit::{Printer, is_ident};
use crate::lua::ast::UNARY_PRIO;

impl Printer<'_> {
    pub(crate) fn expr_list(&mut self, es: &[Expr]) {
        for (i, e) in es.iter().enumerate() {
            if i > 0 { self.out.push_str(", "); }
            self.expr(e, 0);
        }
    }

    pub(crate) fn expr_to_string(&self, e: &Expr) -> String {
        let mut p = Printer { funcs: self.funcs, out: String::new(), indent: 0 };
        p.expr(e, 0);
        p.out
    }

    pub(crate) fn expr(&mut self, e: &Expr, parent_prio: u8) {
        match e {
            Expr::Nil => self.out.push_str("nil"),
            Expr::Bool(b) => self.out.push_str(if *b { "true" } else { "false" }),
            Expr::Num(n) => self.out.push_str(&fmt_number(*n)),
            Expr::Str(s) => self.out.push_str(&quote_string(s)),
            Expr::Vararg => self.out.push_str("..."),
            Expr::Name(n) => self.out.push_str(n),
            Expr::Upval(i) => self.out.push_str(&format!("upval{i}")),
            Expr::Raw(t) => self.out.push_str(t),
            Expr::Paren(inner) => { self.out.push('('); self.expr(inner, 0); self.out.push(')'); }
            Expr::Index(obj, key) => {
                self.expr_suffix_base(obj);
                self.out.push('[');
                self.expr(key, 0);
                self.out.push(']');
            }
            Expr::Field(obj, name) => {
                self.expr_suffix_base(obj);
                self.out.push('.');
                self.out.push_str(name);
            }
            Expr::Call(func, args) => {
                self.expr_suffix_base(func);
                self.call_args(args);
            }
            Expr::MethodCall(obj, name, args) => {
                self.expr_suffix_base(obj);
                self.out.push(':');
                self.out.push_str(name);
                self.call_args(args);
            }
            Expr::Table(items) => self.table(items),
            Expr::Closure(pid) => {
                self.out.push_str("function");
                self.func_tail_inline(*pid);
            }
            Expr::IfElse(cond, a, b) => {
                let need = parent_prio > 0;
                if need { self.out.push('('); }
                self.out.push_str("if ");
                self.expr(cond, 0);
                self.out.push_str(" then ");
                self.expr(a, 0);
                self.out.push_str(" else ");
                self.expr(b, 0);
                if need { self.out.push(')'); }
            }
            Expr::Un(op, operand) => {
                let need = UNARY_PRIO < parent_prio;
                if need { self.out.push('('); }
                self.out.push_str(op.symbol());
                self.expr(operand, UNARY_PRIO);
                if need { self.out.push(')'); }
            }
            Expr::Bin(op, l, r) => {
                let (lp, rp) = op.prio();
                let need = lp < parent_prio;
                if need { self.out.push('('); }
                self.expr(l, lp);
                self.out.push(' ');
                self.out.push_str(op.symbol());
                self.out.push(' ');
                self.expr(r, rp + 1);
                if need { self.out.push(')'); }
            }
        }
    }

    fn expr_suffix_base(&mut self, e: &Expr) {
        let needs_parens = matches!(e,
            Expr::Bin(..) | Expr::Un(..) | Expr::Num(_) | Expr::Bool(_)
            | Expr::Nil | Expr::Str(_) | Expr::Table(_) | Expr::Closure(_)
            | Expr::IfElse(..) | Expr::Vararg
        );
        if needs_parens { self.out.push('('); self.expr(e, 0); self.out.push(')'); }
        else { self.expr(e, 0); }
    }

    fn call_args(&mut self, args: &[Expr]) {
        self.out.push('(');
        self.expr_list(args);
        self.out.push(')');
    }

    fn func_tail_inline(&mut self, proto: usize) {
        let f = if let Some(f) = self.func_by_proto(proto) { f.clone() } else { self.out.push_str("() --[[missing proto]] end"); return; };
        self.out.push('(');
        let mut params: Vec<String> = f.params.clone();
        if f.is_vararg { params.push("...".to_string()); }
        self.out.push_str(&params.join(", "));
        self.out.push_str(")\n");
        self.indent += 1;
        if f.partial {
            self.pad();
            self.out.push_str("-- [decompiler: partial reconstruction below]\n");
        }
        self.block(&f.body);
        self.indent -= 1;
        self.pad();
        self.out.push_str("end");
    }

    fn table(&mut self, items: &[Item]) {
        if items.is_empty() { self.out.push_str("{}"); return; }
        self.out.push('{');
        for (i, it) in items.iter().enumerate() {
            if i > 0 { self.out.push_str(", "); }
            match it {
                Item::Pos(e) => self.expr(e, 0),
                Item::Named(name, e) => {
                    if is_ident(name) { self.out.push_str(name); }
                    else { self.out.push('['); self.out.push_str(&quote_string(name.as_bytes())); self.out.push(']'); }
                    self.out.push_str(" = ");
                    self.expr(e, 0);
                }
                Item::Keyed(k, v) => {
                    self.out.push('[');
                    self.expr(k, 0);
                    self.out.push_str("] = ");
                    self.expr(v, 0);
                }
            }
        }
        self.out.push('}');
    }
}

pub fn field_or_index(obj: Expr, key: &[u8]) -> Expr {
    if let Ok(s) = std::str::from_utf8(key) {
        if is_ident(s) { return Expr::Field(Box::new(obj), s.to_string()); }
        return Expr::Index(Box::new(obj), Box::new(Expr::Str(key.to_vec())));
    }
    Expr::Index(Box::new(obj), Box::new(Expr::Str(key.to_vec())))
}
