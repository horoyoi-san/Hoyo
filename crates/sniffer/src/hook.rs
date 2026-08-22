#![allow(static_mut_refs)]
use std::sync::atomic::Ordering;

use hsr_ipc::PacketSource;
use il2cpp::api::Il2CppArray;
use ilhook::x64::Registers;
use utils::Interceptor;

use super::handlers::{
    HOOKED_CMD_IDS, PACKET_ORDER, PENDING_MODIFICATIONS, REQUEST_ID, push_packet,
    replace_packet_data,
};
use super::net_packet::NetPacket;
use std::sync::mpsc;
use std::time::Duration;

static mut INTERCEPTOR: Interceptor = Interceptor::new();

pub fn hook() {
    unsafe {
        let (send_addr, recv_addr) = *super::init::PACKET_METHODS;
        let packet_xor_addr = *super::init::PACKET_XOR_METHOD;

        if send_addr == 0 || recv_addr == 0 || packet_xor_addr == 0 {
            log::debug!("Sniffer Init Failed");
            return;
        }

        INTERCEPTOR.replace(packet_xor_addr, packet_xor);
        INTERCEPTOR.attach(send_addr, send);
        INTERCEPTOR.replace(recv_addr, recv);
        super::send::init_send_func(send_addr);
    }
}

extern "win64" fn packet_xor(reg: *mut Registers, actual: usize, _: usize) -> usize {
    unsafe {
        let func: extern "win64" fn(u64, u64, i32, i32) -> i32 = std::mem::transmute(actual);

        let this = (*reg).rcx;
        let array_ptr = (*reg).rdx;
        let offset = (*reg).r8 as i32;
        let count = (*reg).r9 as i32;

        super::encrypt::save_xor_this(this as usize);

        if super::recv::injection_in_progress()
            && let Some(n) = super::recv::serve_custom_recv(array_ptr, offset, count, false)
        {
            return n;
        }

        let ret = func(this, array_ptr, offset, count);

        super::encrypt::dump_current_key();

        if ret == 0
            && let Some(n) = super::recv::serve_custom_recv(array_ptr, offset, count, true)
        {
            return n;
        }

        ret as usize
    }
}

extern "win64" fn send(reg: *mut Registers, _: usize) {
    unsafe {
        super::encrypt::dump_current_key();

        super::send::update_send_context((*reg).rcx);

        if super::send::is_sending_custom_packet() {
            return;
        }

        let array = Il2CppArray((*reg).rdx as usize);
        let param2 = (*reg).r8 as i32;
        let param3 = (*reg).r9 as i32;
        let mut slice = array.to_vec::<u8>();

        let seq_id = PACKET_ORDER.fetch_add(1, Ordering::SeqCst);

        super::encrypt::xor_packet(slice.as_mut_slice(), seq_id);

        if let Some(packet) = NetPacket::from_slice(&slice) {
            let _ = (param2, param3);

            let cmd_id = packet.cmd_id;
            let is_hooked = HOOKED_CMD_IDS.read().unwrap().contains(&cmd_id);

            if !is_hooked {
                push_packet(PacketSource::Client, &packet, None);
            } else {
                let req_id = REQUEST_ID.fetch_add(1, Ordering::SeqCst);
                let (tx, rx) = mpsc::sync_channel(1);
                PENDING_MODIFICATIONS.lock().unwrap().insert(req_id, tx);

                push_packet(PacketSource::Client, &packet, Some(req_id));

                if let Ok(resp) = rx.recv_timeout(Duration::from_millis(50)) {
                    if !resp.drop_packet {
                        let new_packet = NetPacket {
                            head_magic: packet.head_magic,
                            cmd_id: packet.cmd_id,
                            head_len: packet.head_len,
                            body_len: resp.body.len() as u32,
                            header: packet.header,
                            body: &resp.body,
                            tail_magic: packet.tail_magic,
                        };
                        let mut ser = new_packet.serialize();
                        super::encrypt::xor_packet(ser.as_mut_slice(), seq_id);
                        replace_packet_data(ser, &mut *reg);
                    } else {
                        (*reg).r9 = 0;
                    }
                } else {
                    PENDING_MODIFICATIONS.lock().unwrap().remove(&req_id);
                }
            }
        }
    }
}

extern "win64" fn recv(reg: *mut Registers, actual: usize, _: usize) -> usize {
    unsafe {
        let array = Il2CppArray((*reg).rdx as usize);

        let func: extern "win64" fn(u64, u64, u64, u64) -> usize = std::mem::transmute(actual);

        let ret = func((*reg).rcx, (*reg).rdx, (*reg).r8, (*reg).r9);

        let mut slice = array.to_vec::<u8>();
        let param2 = (*reg).r8 as i32;
        let param3 = (*reg).r9 as i32;
        let slice = &mut slice[param2 as usize..param2 as usize + param3 as usize];

        let seq_id = PACKET_ORDER.fetch_add(1, Ordering::SeqCst);

        super::encrypt::xor_packet(slice, seq_id);

        if let Some(packet) = NetPacket::from_slice(slice) {
            let _ = (param2, param3);

            let cmd_id = packet.cmd_id;
            let is_hooked = HOOKED_CMD_IDS.read().unwrap().contains(&cmd_id);

            if !is_hooked {
                push_packet(PacketSource::Server, &packet, None);
            } else {
                let req_id = REQUEST_ID.fetch_add(1, Ordering::SeqCst);
                let (tx, rx) = mpsc::sync_channel(1);
                PENDING_MODIFICATIONS.lock().unwrap().insert(req_id, tx);

                push_packet(PacketSource::Server, &packet, Some(req_id));

                if let Ok(resp) = rx.recv_timeout(Duration::from_millis(50)) {
                    if !resp.drop_packet {
                        let new_packet = NetPacket {
                            head_magic: packet.head_magic,
                            cmd_id: packet.cmd_id,
                            head_len: packet.head_len,
                            body_len: resp.body.len() as u32,
                            header: packet.header,
                            body: &resp.body,
                            tail_magic: packet.tail_magic,
                        };
                        let mut ser = new_packet.serialize();
                        super::encrypt::xor_packet(ser.as_mut_slice(), seq_id);
                        replace_packet_data(ser, &mut *reg);
                    } else {
                        (*reg).r9 = 0;
                    }
                } else {
                    PENDING_MODIFICATIONS.lock().unwrap().remove(&req_id);
                }
            }
        }

        ret
    }
}
