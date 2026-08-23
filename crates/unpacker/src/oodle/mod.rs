use std::ptr;

unsafe extern "C" {
    fn OodleLZ_Decompress(
        src: *const u8,
        src_len: usize,
        dst: *mut u8,
        dst_len: usize,
        fuzz: i32,
        check_crc: i32,
        verbosity: i32,
        context: *mut u8,
        context_len: usize,
        fp_callback: *mut u8,
        callback_user_data: *mut u8,
        decoder_memory: *mut u8,
        decoder_memory_size: usize,
        thread_phase: i32,
    ) -> i32;
}

pub fn decompress(src: &[u8], uncompressed_size: usize) -> Result<Vec<u8>, String> {
    let mut dst = vec![0u8; uncompressed_size];

    let ret = unsafe {
        OodleLZ_Decompress(
            src.as_ptr(),
            src.len(),
            dst.as_mut_ptr(),
            dst.len(),
            1,
            0,
            0,
            ptr::null_mut(),
            0,
            ptr::null_mut(),
            ptr::null_mut(),
            ptr::null_mut(),
            0,
            3,
        )
    };

    if ret <= 0 {
        return Err(format!("Oodle error code: {ret}"));
    }

    dst.truncate(ret as usize);

    Ok(dst)
}
