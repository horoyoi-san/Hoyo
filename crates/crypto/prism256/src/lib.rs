/*
The original algorithm came from some unknown company that sells security protection.
But many such companies used it.
Mihoyo also.
I analyzed the original algorithm and named it PPC256.
What's more, it has a lot of security issues.
Such as:
4bytes key(32bit) -> Easy Bruteforce
Sub_bytes only 2-2 changed -> No MixColumns
Nonce generate from Key -> Useless
SPN not full -> Weak encryption.

So i modified this shit encryption.
Idk why so many security protection companies used it and nobody noticed those issues.
They should learn cryptography!

Now this encryption didnt have crazy issue.
But this algorithm is not strictly verified,
can not treat as a standard algorithm like AES.
I just made a few modifications to this algorithm.
I also never looked at this algorithm's sbox quality.
I think so many security companies used it, should not be too bad.
If sbox still has major issues, I can only say:
A group of skill issue, please stop selling protection that has no protection at all.
*/

mod core;
mod decrypt;
mod encrypt;
mod sbox;

pub use decrypt::decrypt;
pub use encrypt::{encrypt, encrypt_with_nonce};

pub const BLOCK_SIZE: usize = 16;
pub const KEY_SIZE: usize = 16;
pub const NONCE_SIZE: usize = 16;

pub type Key = [u8; KEY_SIZE];
pub type Nonce = [u8; NONCE_SIZE];

pub type Result<T> = ::core::result::Result<T, Error>;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Error {
    InvalidCiphertextLength,
    InvalidPadding,
}

#[derive(Debug, Clone)]
pub struct Prism128 {
    pub(crate) key: Key,
}

impl Prism128 {
    #[must_use]
    pub const fn new(key: Key) -> Self {
        Self { key }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const KEY: Key = [0x42; KEY_SIZE];
    const NONCE: Nonce = [0x17; NONCE_SIZE];

    #[test]
    fn roundtrip_with_fixed_nonce() {
        let plaintext = b"hello hsr owner!".to_vec();
        let ciphertext = encrypt_with_nonce(KEY, NONCE, &plaintext).unwrap();
        // 16-byte input gets a full PKCS#7 padding block appended.
        assert_eq!(ciphertext.len(), NONCE_SIZE + 2 * BLOCK_SIZE);

        let decrypted = decrypt(KEY, &ciphertext).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn roundtrip_multi_block_and_empty() {
        for input in [Vec::new(), b"0123456789abcdefABCDEF".to_vec()] {
            let ciphertext = encrypt_with_nonce(KEY, NONCE, &input).unwrap();
            assert_eq!(decrypt(KEY, &ciphertext).unwrap(), input);
        }
    }

    #[test]
    fn roundtrip_with_random_nonce() {
        let plaintext = b"random nonce roundtrip".to_vec();
        let ciphertext = encrypt(KEY, &plaintext).unwrap();
        assert_eq!(decrypt(KEY, &ciphertext).unwrap(), plaintext);
    }

    #[test]
    fn rejects_invalid_ciphertext_lengths() {
        assert_eq!(decrypt(KEY, &[]), Err(Error::InvalidCiphertextLength));
        assert_eq!(
            decrypt(KEY, &[0u8; NONCE_SIZE + 3]),
            Err(Error::InvalidCiphertextLength)
        );
    }
}
