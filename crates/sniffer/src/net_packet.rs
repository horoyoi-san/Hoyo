use std::fmt::Debug;

use base64::Engine;

pub struct NetPacket<'b> {
    pub head_magic: u32,
    pub cmd_id: u16,
    pub head_len: u16,
    pub body_len: u32,
    pub header: &'b [u8],
    pub body: &'b [u8],
    pub tail_magic: u32,
}

impl Debug for NetPacket<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("NetPacket")
            .field("head_magic", &format!("0x{:X}", self.head_magic))
            .field("cmd_id", &self.cmd_id)
            .field("head_len", &self.head_len)
            .field("body_len", &self.body_len)
            .field(
                "header",
                &base64::engine::general_purpose::STANDARD.encode(self.header),
            )
            .field(
                "body",
                &base64::engine::general_purpose::STANDARD.encode(self.body),
            )
            .field("tail_magic", &format!("0x{:X}", self.tail_magic))
            .finish()
    }
}

impl<'b> NetPacket<'b> {
    pub fn from_slice(s: &'b [u8]) -> Option<Self> {
        if s.len() < 16 {
            return None;
        }

        let head_magic = u32::from_be_bytes(s[0..4].try_into().unwrap());

        if head_magic != 0x9D74C714 {
            return None;
        }

        let cmd_id = u16::from_be_bytes(s[4..6].try_into().unwrap());
        let head_len = u16::from_be_bytes(s[6..8].try_into().unwrap());
        let body_len = u32::from_be_bytes(s[8..12].try_into().unwrap());

        let head_start = 12;
        let head_end = 12 + head_len as usize;
        if head_end > s.len() {
            return None;
        }
        let header = &s[head_start..head_end];

        let body_start = head_end;
        let body_end = head_end + body_len as usize;
        if body_end > s.len() {
            return None;
        }
        let body = &s[body_start..body_end];

        if body_end + 4 > s.len() {
            return None;
        }

        let tail_magic = u32::from_be_bytes(s[body_end..body_end + 4].try_into().unwrap());

        Some(Self {
            head_magic,
            cmd_id,
            head_len,
            body_len,
            header,
            body,
            tail_magic,
        })
    }

    pub fn serialize(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(16 + self.header.len() + self.body.len());
        buf.extend(self.head_magic.to_be_bytes());
        buf.extend(self.cmd_id.to_be_bytes());
        buf.extend(self.head_len.to_be_bytes());
        buf.extend(self.body_len.to_be_bytes());
        buf.extend(self.header);
        buf.extend(self.body);
        buf.extend(self.tail_magic.to_be_bytes());
        buf
    }
}
