# gen_obf.py
def rotate16(v, r):
    r = r & 0xF
    return ((v >> r) | ((v << (16 - r)) & 0xFFFF)) & 0xFFFF

def byte_swap(v):
    return ((v >> 8) & 0xFF) | ((v & 0xFF) << 8)

def encode_char(c, i):
    # คำนวณ b ตามโค้ด Zig: b = truncate(((i + ((i >> 31) >> 29)) & 0xF8) - i)
    # สำหรับ i >= 0 เงื่อนไขซับซ้อนย่อเป็น ((i & 0xF8) - i)
    b = ((i & 0xF8) - i) & 0xFFFF
    # r1 = (-11 - b) mod 16, r2 = (b + 11) mod 16
    r1 = ((-11 - b) % 16) & 0xFFFF
    r2 = ((b + 11) % 16) & 0xFFFF
    v = ord(c)
    # original code operates on 16-bit words; to match, put char into low byte, high byte 0
    word = v & 0xFF
    rotated = rotate16(word, r2) | (rotate16(word, r1) if False else 0)  # simpler below
    # but original: v >> r1 | v << r2  (both on 16-bit)
    rotated = ((word >> (r1 & 0xF)) | ((word << (r2 & 0xF)) & 0xFFFF)) & 0xFFFF
    swapped = byte_swap(rotated)
    return swapped

def encode_string(s):
    # convert into list of 16-bit words (little-endian pairs)
    words = []
    # ensure null-terminated
    if not s.endswith('\0'):
        s += '\0'
    # pack as little-endian u16 words
    for i in range(0, len(s), 2):
        lo = ord(s[i])
        hi = ord(s[i+1]) if i+1 < len(s) else 0
        word = (hi << 8) | lo
        words.append(word)
    # apply per-index transform like in Zig loop (note Zig loop iterates up to d.len-1)
    out = []
    for i, v in enumerate(words):
        # compute b simplified (for non-negative i)
        b = ((i & 0xF8) - i) & 0xFFFF
        r1 = (-11 - b) % 16
        r2 = (b + 11) % 16
        newv = ((v >> r1) | ((v << r2) & 0xFFFF)) & 0xFFFF
        swapped = ((newv >> 8) & 0xFF) | ((newv & 0xFF) << 8)
        out.append(swapped)
    return out

if __name__ == "__main__":
    msg = "Horoyoi-san\0"
    arr = encode_string(msg)
    print(", ".join(str(x) for x in arr))
