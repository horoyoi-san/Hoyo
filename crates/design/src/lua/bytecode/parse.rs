use crate::lua::bytecode::types::*;

struct Reader<'a> {
    d: &'a [u8],
    p: usize,
}

impl<'a> Reader<'a> {
    fn new(d: &'a [u8]) -> Self {
        Reader { d, p: 0 }
    }

    fn u8(&mut self) -> Result<u8, ParseError> {
        let v = *self.d.get(self.p).ok_or(ParseError::Truncated)?;
        self.p += 1;
        Ok(v)
    }

    fn u32(&mut self) -> Result<u32, ParseError> {
        if self.p + 4 > self.d.len() {
            return Err(ParseError::Truncated);
        }
        let v = u32::from_le_bytes(self.d[self.p..self.p + 4].try_into().unwrap());
        self.p += 4;
        Ok(v)
    }

    fn f64(&mut self) -> Result<f64, ParseError> {
        if self.p + 8 > self.d.len() {
            return Err(ParseError::Truncated);
        }
        let v = f64::from_le_bytes(self.d[self.p..self.p + 8].try_into().unwrap());
        self.p += 8;
        Ok(v)
    }

    fn varint(&mut self) -> Result<u32, ParseError> {
        let mut result: u32 = 0;
        let mut shift = 0;
        loop {
            let b = self.u8()?;
            result |= ((b & 0x7f) as u32) << shift;
            shift += 7;
            if b & 0x80 == 0 {
                break;
            }
        }
        Ok(result)
    }

    fn bytes(&mut self, n: usize) -> Result<&'a [u8], ParseError> {
        if self.p + n > self.d.len() {
            return Err(ParseError::Truncated);
        }
        let s = &self.d[self.p..self.p + n];
        self.p += n;
        Ok(s)
    }
}

pub fn parse(data: &[u8]) -> Result<Module, ParseError> {
    let mut r = Reader::new(data);
    let version = r.u8()?;
    if version == 0 {
        let msg = data[1..]
            .iter()
            .position(|&b| b == 0)
            .map_or(&data[1..], |n| &data[1..1 + n]);
        return Err(ParseError::ErrorBlob(
            String::from_utf8_lossy(msg).into_owned(),
        ));
    }
    if version != 3 && version != 4 {
        return Err(ParseError::UnsupportedVersion(version));
    }
    let types_version = if version >= 4 { r.u8()? } else { 0 };

    let nstr = r.varint()? as usize;
    let mut strings = Vec::with_capacity(nstr);
    for _ in 0..nstr {
        let len = r.varint()? as usize;
        strings.push(r.bytes(len)?.to_vec());
    }

    let nproto = r.varint()? as usize;
    let mut protos = Vec::with_capacity(nproto);
    for _ in 0..nproto {
        let max_stack_size = r.u8()?;
        let num_params = r.u8()?;
        let num_upvals = r.u8()?;
        let is_vararg = r.u8()? != 0;
        let mut flags = 0u8;
        let mut type_info = Vec::new();
        if version >= 4 {
            flags = r.u8()?;
            let typesize = r.varint()? as usize;
            if typesize > 0 {
                type_info = r.bytes(typesize)?.to_vec();
            }
        }
        let sizecode = r.varint()? as usize;
        let mut code = Vec::with_capacity(sizecode);
        for _ in 0..sizecode {
            code.push(r.u32()?);
        }
        let sizek = r.varint()? as usize;
        let mut constants = Vec::with_capacity(sizek);
        for _ in 0..sizek {
            let kind = r.u8()?;
            let c = match kind {
                0 => Constant::Nil,
                1 => Constant::Bool(r.u8()? != 0),
                2 => Constant::Number(r.f64()?),
                3 => Constant::String(r.varint()?),
                4 => Constant::Import(r.u32()?),
                5 => {
                    let cnt = r.varint()? as usize;
                    let mut keys = Vec::with_capacity(cnt);
                    for _ in 0..cnt {
                        keys.push(r.varint()?);
                    }
                    Constant::Table(keys)
                }
                6 => Constant::Closure(r.varint()?),
                other => return Err(ParseError::BadConstant(other)),
            };
            constants.push(c);
        }
        let sizep = r.varint()? as usize;
        let mut child_protos = Vec::with_capacity(sizep);
        for _ in 0..sizep {
            child_protos.push(r.varint()?);
        }
        let line_defined = r.varint()?;
        let debug_name = r.varint()?;

        let mut line_info = None;
        if r.u8()? != 0 {
            let linegaplog2 = r.u8()?;
            let intervals = ((sizecode.saturating_sub(1)) >> linegaplog2) + 1;
            let lineinfo = r.bytes(sizecode)?.to_vec();
            let absinfo_raw = r.bytes(intervals * 4)?.to_vec();
            let mut li = Vec::with_capacity(sizecode);
            let mut acc: u8 = 0;
            for &b in &lineinfo {
                acc = acc.wrapping_add(b);
                li.push(acc);
            }
            let mut absinfo = Vec::with_capacity(intervals);
            let mut acc2: i32 = 0;
            for j in 0..intervals {
                let d = i32::from_le_bytes(absinfo_raw[j * 4..j * 4 + 4].try_into().unwrap());
                acc2 = acc2.wrapping_add(d);
                absinfo.push(acc2);
            }
            let mut lines = Vec::with_capacity(sizecode);
            for i in 0..sizecode {
                let base = absinfo[i >> linegaplog2];
                lines.push((base.wrapping_add(li[i] as i32)) as u32);
            }
            line_info = Some(LineInfo { lines });
        }

        let mut locals = Vec::new();
        let mut upval_names = Vec::new();
        if r.u8()? != 0 {
            let nloc = r.varint()? as usize;
            for _ in 0..nloc {
                let name = r.varint()?;
                let start_pc = r.varint()?;
                let end_pc = r.varint()?;
                let reg = r.u8()?;
                locals.push(LocalVar {
                    name,
                    start_pc,
                    end_pc,
                    reg,
                });
            }
            let nup = r.varint()? as usize;
            for _ in 0..nup {
                upval_names.push(r.varint()?);
            }
        }

        protos.push(Proto {
            max_stack_size,
            num_params,
            num_upvals,
            is_vararg,
            flags,
            type_info,
            code,
            constants,
            child_protos,
            line_defined,
            debug_name,
            line_info,
            locals,
            upval_names,
        });
    }
    let main_id = r.varint()?;
    Ok(Module {
        version,
        types_version,
        strings,
        protos,
        main_id,
    })
}
