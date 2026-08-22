#![allow(static_mut_refs)]

use std::sync::atomic::{AtomicBool, Ordering};

use il2cpp::{get_cached_class, vm::array::Il2CppArray};

use super::{encrypt, handlers::PACKET_ORDER, net_packet::NetPacket};

static mut ORIGINAL_SEND_FUNC: Option<extern "win64" fn(u64, u64, i32, i32)> = None;
static mut SEND_CONTEXT: u64 = 0;
static SENDING_CUSTOM_PACKET: AtomicBool = AtomicBool::new(false);

pub fn init_send_func(send_addr: usize) {
    unsafe {
        ORIGINAL_SEND_FUNC = Some(std::mem::transmute::<
            usize,
            extern "win64" fn(u64, u64, i32, i32),
        >(send_addr));
    }
}

pub fn is_sending_custom_packet() -> bool {
    SENDING_CUSTOM_PACKET.load(Ordering::SeqCst)
}

pub fn update_send_context(ctx: u64) {
    unsafe {
        SEND_CONTEXT = ctx;
    }
}

pub fn send_custom_packet(cmd_id: u16, body: &[u8]) -> anyhow::Result<()> {
    let result = microseh::try_seh(|| unsafe { send_custom_packet_inner(cmd_id, body) });
    SENDING_CUSTOM_PACKET.store(false, Ordering::SeqCst);

    result.map_err(|error| {
        anyhow::anyhow!(
            "SEH exception while sending custom packet cmd_id={cmd_id}: code={:?}",
            error.code()
        )
    })?
}

unsafe fn send_custom_packet_inner(cmd_id: u16, body: &[u8]) -> anyhow::Result<()> {
    unsafe {
        let Some(send_func) = ORIGINAL_SEND_FUNC else {
            anyhow::bail!("Send function not initialized");
        };

        let header: Vec<u8> = vec![];

        let packet = NetPacket {
            head_magic: 0x9D74C714,
            cmd_id,
            head_len: 0,
            body_len: body.len() as u32,
            header: &header,
            body,
            tail_magic: 0xD7A152C8,
        };

        let mut serialized = packet.serialize();

        encrypt::dump_current_key();
        let seq_id = PACKET_ORDER.fetch_add(1, Ordering::SeqCst);
        encrypt::xor_packet(serialized.as_mut_slice(), seq_id);

        let mut array = Il2CppArray::new(
            get_cached_class("System.Byte").unwrap().get_array_class(1),
            serialized.len(),
        );
        array.as_mut_slice().copy_from_slice(&serialized);

        SENDING_CUSTOM_PACKET.store(true, Ordering::SeqCst);
        send_func(SEND_CONTEXT, array.0 as u64, 0, serialized.len() as i32);

        Ok(())
    }
}
