use crate::core::{decrypt_block, expand_round_keys, pkcs7_unpad, to_block, xor_block};
use crate::{Error, Key, Prism128, Result, BLOCK_SIZE, NONCE_SIZE};

impl Prism128 {
    pub fn decrypt(&self, input: &[u8]) -> Result<Vec<u8>> {
        if input.len() < NONCE_SIZE + BLOCK_SIZE {
            return Err(Error::InvalidCiphertextLength);
        }

        let ciphertext = &input[NONCE_SIZE..];
        if !ciphertext.len().is_multiple_of(BLOCK_SIZE) {
            return Err(Error::InvalidCiphertextLength);
        }

        let nonce = to_block(&input[..NONCE_SIZE]);
        let round_keys = expand_round_keys(&self.key, &nonce);

        let mut plaintext = Vec::with_capacity(ciphertext.len());
        let mut chain = nonce;

        for chunk in ciphertext.as_chunks::<BLOCK_SIZE>().0 {
            let cipher_block = to_block(chunk);
            let mut block = cipher_block;

            decrypt_block(&mut block, &round_keys);
            xor_block(&mut block, &chain);

            plaintext.extend_from_slice(&block);
            chain = cipher_block;
        }

        pkcs7_unpad(&mut plaintext)?;
        Ok(plaintext)
    }
}

pub fn decrypt(key: Key, input: impl AsRef<[u8]>) -> Result<Vec<u8>> {
    Prism128::new(key).decrypt(input.as_ref())
}
