use crate::lua::ast::*;
use crate::lua::emit::Printer;

impl Printer<'_> {
    pub(crate) fn stat(&mut self, s: &Stat) {
        match s {
            Stat::Comment(text) => {
                for line in text.split('\n') {
                    self.pad();
                    self.out.push_str("-- ");
                    self.out.push_str(line);
                    self.out.push('\n');
                }
            }
            Stat::Local(names, values) => {
                if names.len() == 1
                    && values.len() == 1
                    && let Expr::Closure(pid) = &values[0]
                {
                    self.func_decl(Some(&names[0]), false, *pid);
                    return;
                }
                self.pad();
                self.out.push_str("local ");
                self.out.push_str(&names.join(", "));
                if !values.is_empty() {
                    self.out.push_str(" = ");
                    self.expr_list(values);
                }
                self.out.push('\n');
            }
            Stat::Assign(lhs, rhs) => {
                if lhs.len() == 1
                    && rhs.len() == 1
                    && let Expr::Closure(pid) = &rhs[0]
                {
                    let is_method = self.closure_is_method(*pid);
                    let target = self.expr_to_string(&lhs[0]);
                    self.func_decl_named(&target, is_method, *pid);
                    return;
                }
                self.pad();
                self.expr_list(lhs);
                self.out.push_str(" = ");
                self.expr_list(rhs);
                self.out.push('\n');
            }
            Stat::ExprCall(e) => {
                self.pad();
                self.expr(e, 0);
                self.out.push('\n');
            }
            Stat::Do(b) => {
                self.pad();
                self.out.push_str("do\n");
                self.indent += 1;
                self.block(b);
                self.indent -= 1;
                self.pad();
                self.out.push_str("end\n");
            }
            Stat::While(cond, body) => {
                self.pad();
                self.out.push_str("while ");
                self.expr(cond, 0);
                self.out.push_str(" do\n");
                self.indent += 1;
                self.block(body);
                self.indent -= 1;
                self.pad();
                self.out.push_str("end\n");
            }
            Stat::Repeat(body, cond) => {
                self.pad();
                self.out.push_str("repeat\n");
                self.indent += 1;
                self.block(body);
                self.indent -= 1;
                self.pad();
                self.out.push_str("until ");
                self.expr(cond, 0);
                self.out.push('\n');
            }
            Stat::NumFor {
                var,
                start,
                stop,
                step,
                body,
            } => {
                self.pad();
                self.out.push_str("for ");
                self.out.push_str(var);
                self.out.push_str(" = ");
                self.expr(start, 0);
                self.out.push_str(", ");
                self.expr(stop, 0);
                if let Some(st) = step {
                    self.out.push_str(", ");
                    self.expr(st, 0);
                }
                self.out.push_str(" do\n");
                self.indent += 1;
                self.block(body);
                self.indent -= 1;
                self.pad();
                self.out.push_str("end\n");
            }
            Stat::GenFor { vars, iters, body } => {
                self.pad();
                self.out.push_str("for ");
                self.out.push_str(&vars.join(", "));
                self.out.push_str(" in ");
                self.expr_list(iters);
                self.out.push_str(" do\n");
                self.indent += 1;
                self.block(body);
                self.indent -= 1;
                self.pad();
                self.out.push_str("end\n");
            }
            Stat::If(arms, els) => {
                for (i, (cond, body)) in arms.iter().enumerate() {
                    self.pad();
                    self.out.push_str(if i == 0 { "if " } else { "elseif " });
                    self.expr(cond, 0);
                    self.out.push_str(" then\n");
                    self.indent += 1;
                    self.block(body);
                    self.indent -= 1;
                }
                if let Some(eb) = els {
                    self.pad();
                    self.out.push_str("else\n");
                    self.indent += 1;
                    self.block(eb);
                    self.indent -= 1;
                }
                self.pad();
                self.out.push_str("end\n");
            }
            Stat::Return(values) => {
                self.pad();
                self.out.push_str("return");
                if !values.is_empty() {
                    self.out.push(' ');
                    self.expr_list(values);
                }
                self.out.push('\n');
            }
            Stat::Break => {
                self.pad();
                self.out.push_str("break\n");
            }
            Stat::Continue => {
                self.pad();
                self.out.push_str("continue\n");
            }
        }
    }

    pub(crate) fn closure_is_method(&self, proto: usize) -> bool {
        self.func_by_proto(proto)
            .is_some_and(|f| f.params.first().is_some_and(|p| p == "self"))
    }

    pub(crate) fn func_decl(&mut self, name: Option<&str>, _is_method: bool, proto: usize) {
        self.pad();
        self.out.push_str("local function ");
        self.out.push_str(name.unwrap_or("_"));
        self.func_tail(proto, false);
    }

    pub(crate) fn func_decl_named(&mut self, target: &str, is_method: bool, proto: usize) {
        self.pad();
        self.out.push_str("function ");
        if is_method && let Some(dot) = target.rfind('.') {
            self.out.push_str(&target[..dot]);
            self.out.push(':');
            self.out.push_str(&target[dot + 1..]);
            self.func_tail(proto, true);
            return;
        }
        self.out.push_str(target);
        self.func_tail(proto, false);
    }

    pub(crate) fn func_tail(&mut self, proto: usize, skip_self: bool) {
        let f = if let Some(f) = self.func_by_proto(proto) { f.clone() } else {
            self.out.push_str("() end\n");
            return;
        };
        self.out.push('(');
        let mut params: Vec<String> = f.params.clone();
        if skip_self && !params.is_empty() {
            params.remove(0);
        }
        if f.is_vararg {
            params.push("...".to_string());
        }
        self.out.push_str(&params.join(", "));
        self.out.push_str(")\n");
        self.indent += 1;
        if f.partial {
            self.pad();
            self.out
                .push_str("-- [decompiler: partial reconstruction below]\n");
        }
        self.block(&f.body);
        self.indent -= 1;
        self.pad();
        self.out.push_str("end\n");
    }
}
