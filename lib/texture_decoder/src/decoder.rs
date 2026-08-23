use std::io;

use crate::error::DecodeImageError;
use crate::pixel_info::{Pixel, WritePixelBuf};
use crate::write_buffer::WriteBuff;
use crate::ImageSize;
use rayon::iter::{ParallelBridge, ParallelIterator};

pub trait ImageDecoder<const DECODE_PIXEL_BYTE: usize, const PIXEL_NUM: usize = 1> {
    fn check_decodiblity(size: &ImageSize, data_len: usize) -> Result<(), DecodeImageError> {
        let data_base_times = data_len / DECODE_PIXEL_BYTE;
        let size_base_times = size.size() / PIXEL_NUM;

        if data_base_times < size_base_times {
            Err(DecodeImageError::SizeNotMatch(
                data_base_times,
                size_base_times,
            ))?;
        }
        Ok(())
    }

    fn decoding(size: &ImageSize, img_data: &[u8]) -> Result<Box<[u8]>, DecodeImageError> {
        Self::check_decodiblity(size, img_data.len())?;

        let (image_chunks, _) = img_data.as_chunks::<DECODE_PIXEL_BYTE>();
        let mut out_buff = WriteBuff::new(size.output_size(), Pixel::PIXEL_SPACE * PIXEL_NUM);
        for (pixel_buf, mut out_buf) in image_chunks.iter().zip(out_buff.as_chunks()) {
            let mut pixel_buf = pixel_buf.as_slice();
            Self::decode_pixel(&mut pixel_buf)?.write_buf(&mut out_buf);
        }
        Ok(out_buff.inner())
    }

    fn decode_currently(size: &ImageSize, img_data: &[u8]) -> Result<Box<[u8]>, DecodeImageError> {
        Self::check_decodiblity(size, img_data.len())?;
        let (image_chunks, _) = img_data.as_chunks::<DECODE_PIXEL_BYTE>();
        let mut buf = WriteBuff::new(size.output_size(), Pixel::PIXEL_SPACE * PIXEL_NUM);

        let pixel_count = image_chunks.len();
        if pixel_count < 4096 {
            image_chunks
                .iter()
                .zip(buf.as_chunks())
                .for_each(|(pixel_buf, mut write_buf)| {
                    let mut buff = pixel_buf.as_slice();
                    let pixels = Self::decode_pixel(&mut buff).unwrap();
                    pixels.write_buf(&mut write_buf);
                });
        } else {
            image_chunks
                .iter()
                .zip(buf.as_chunks())
                .par_bridge()
                .try_for_each(|(pixel_buf, mut write_buf)| {
                    let mut buff = pixel_buf.as_slice();
                    let pixels = Self::decode_pixel(&mut buff)?;
                    pixels.write_buf(&mut write_buf);
                    Ok::<_, io::Error>(())
                })?;
        }

        Ok(buf.inner())
    }

    const DECODE_PIXEL_BYTE: usize = DECODE_PIXEL_BYTE;

    fn decode_pixel(data: &mut &[u8]) -> io::Result<[Pixel; PIXEL_NUM]>;
}
