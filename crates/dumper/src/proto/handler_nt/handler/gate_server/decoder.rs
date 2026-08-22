#[derive(Debug)]
pub struct Decoder {
    data: Vec<u8>,
    idx: usize,
}

#[derive(Debug)]
pub enum DecodeError {
    UnsupportedWireType(u8),
    InvalidMemoryAccess,
}

impl std::fmt::Display for DecodeError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DecodeError::UnsupportedWireType(wt) => write!(f, "Unsupported wire type: {wt}"),
            DecodeError::InvalidMemoryAccess => write!(f, "Invalid memory access detected"),
        }
    }
}

impl std::error::Error for DecodeError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WireType {
    VarInt = 0,
    I64 = 1,
    Len = 2,
    #[allow(dead_code)]
    SGroup = 3,
    #[allow(dead_code)]
    EGroup = 4,
    I32 = 5,
}

#[derive(Debug, Clone)]
pub struct Decoded {
    pub field: u32,
    #[allow(dead_code)]
    pub wire_type: WireType,
    #[allow(dead_code)]
    pub is_object: bool,
    pub value: DecodedValue,
}

#[derive(Debug, Clone)]
pub enum DecodedValue {
    BigInt(i128),
    Buffer(Vec<u8>),
    Nested(DecodingResult),
}

#[derive(Debug, Clone)]
pub struct DecodingResult {
    pub fields: Vec<Decoded>,
    #[allow(dead_code)]
    pub unprocessed: Vec<u8>,
}

impl Decoder {
    pub fn new(data: Vec<u8>) -> Self {
        Self { data, idx: 0 }
    }

    pub fn next_byte(&mut self) -> Result<&u8, DecodeError> {
        self.data
            .get(self.idx)
            .ok_or(DecodeError::InvalidMemoryAccess)
            .inspect(|_| self.idx += 1)
    }

    pub fn next_varint(&mut self) -> Result<i128, DecodeError> {
        let mut value = 0_i128;
        let mut shift = 0;

        loop {
            let byte = self.next_byte()?;
            let current = (byte & 0x7F) as i128;
            value |= current << shift;
            if byte & 0x80 == 0 {
                break;
            }
            shift += 7;
        }

        Ok(value)
    }

    pub fn read(&mut self, length: usize) -> Result<Vec<u8>, DecodeError> {
        self.data
            .get(self.idx..self.idx + length)
            .map(|slice| {
                self.idx += length;
                slice.to_vec()
            })
            .ok_or(DecodeError::InvalidMemoryAccess)
    }

    pub fn remaining(&self) -> usize {
        self.data.len() - self.idx
    }

    pub fn decode(&mut self) -> Result<DecodingResult, DecodeError> {
        let mut fields = Vec::new();

        while self.remaining() > 0 {
            let enc = self.next_varint()? as u32;
            let field = enc >> 3;
            let wire_type = WireType::from_u8((enc & 7) as u8)?;

            let mut value_decoded = false;
            let value = match wire_type {
                WireType::VarInt => DecodedValue::BigInt(self.next_varint()?),
                WireType::Len => {
                    let length = self.next_varint()? as usize;
                    let sub_data = self.read(length)?;
                    let mut nested_decoder = Decoder::new(sub_data.clone());
                    match nested_decoder.decode() {
                        Ok(decoded) => {
                            value_decoded = true;
                            DecodedValue::Nested(decoded)
                        }
                        Err(_) => DecodedValue::Buffer(sub_data),
                    }
                }
                WireType::I32 => DecodedValue::Buffer(self.read(4)?),
                WireType::I64 => DecodedValue::Buffer(self.read(8)?),
                _ => return Err(DecodeError::UnsupportedWireType((enc & 7) as u8)),
            };

            fields.push(Decoded {
                field,
                wire_type,
                is_object: value_decoded,
                value,
            });
        }

        Ok(DecodingResult {
            fields,
            unprocessed: self.read(self.remaining())?,
        })
    }
}

impl WireType {
    pub fn from_u8(value: u8) -> Result<Self, DecodeError> {
        match value {
            0 => Ok(WireType::VarInt),
            1 => Ok(WireType::I64),
            2 => Ok(WireType::Len),
            5 => Ok(WireType::I32),
            _ => Err(DecodeError::UnsupportedWireType(value)),
        }
    }
}
