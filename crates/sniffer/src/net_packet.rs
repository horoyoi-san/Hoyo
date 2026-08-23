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

#[cfg(test)]
mod tests {
    use super::*;

    fn sample() -> NetPacket<'static> {
        NetPacket {
            head_magic: 0x9D74C714,
            cmd_id: 0x0123,
            head_len: 0,
            body_len: 5,
            header: &[],
            body: b"hello",
            tail_magic: 0xD7A152C8,
        }
    }

    #[test]
    fn roundtrip_serialize_then_parse() {
        let packet = sample();
        let bytes = packet.serialize();
        let parsed = NetPacket::from_slice(&bytes).expect("valid packet should parse");

        assert_eq!(parsed.cmd_id, packet.cmd_id);
        assert_eq!(parsed.body, packet.body);
        assert_eq!(parsed.tail_magic, packet.tail_magic);
    }

    #[test]
    fn rejects_short_buffer() {
        assert!(NetPacket::from_slice(&[0u8; 15]).is_none());
    }

    #[test]
    fn rejects_wrong_head_magic() {
        let mut bytes = sample().serialize();
        bytes[0] = 0;
        assert!(NetPacket::from_slice(&bytes).is_none());
    }

    #[test]
    fn rejects_truncated_body() {
        let bytes = sample().serialize();
        // Drop the tail magic so the declared body length no longer fits.
        assert!(NetPacket::from_slice(&bytes[..bytes.len() - 4]).is_none());
    }
}
