const FILE_ALIGNMENT: u32 = 0x200;
const SECTION_ALIGNMENT: u32 = 0x2000;
const IMAGE_BASE: u32 = 0x1000_0000;
const TEXT_RVA: u32 = 0x2000;
const HEADERS_SIZE: u32 = 0x200;
const COR20_SIZE: u32 = 0x48;
const METADATA_VERSION: &[u8] = b"v4.0.30319";

const METHOD_BODY: [u8; 3] = [0x0A, 0x14, 0x7A];

pub(super) const METHOD_BODY_RVA: u32 = TEXT_RVA + COR20_SIZE;

fn align_up(value: u32, align: u32) -> u32 {
    value.div_ceil(align) * align
}

pub(super) fn build_metadata(
    tilde: &[u8],
    strings: &[u8],
    user_strings: &[u8],
    guids: &[u8],
    blobs: &[u8],
) -> Vec<u8> {
    let version_len = align_up(METADATA_VERSION.len() as u32 + 1, 4);

    let streams: [(&str, Vec<u8>); 5] = [
        ("#~", pad4(tilde)),
        ("#Strings", pad4(strings)),
        ("#US", pad4(user_strings)),
        ("#GUID", pad4(guids)),
        ("#Blob", pad4(blobs)),
    ];

    let mut header_size = 16 + version_len + 4;
    for (name, _) in &streams {
        header_size += 8 + align_up(name.len() as u32 + 1, 4);
    }

    let mut out = Vec::new();
    out.extend_from_slice(&0x424A_5342u32.to_le_bytes()); // "BSJB"
    out.extend_from_slice(&1u16.to_le_bytes()); // MajorVersion
    out.extend_from_slice(&1u16.to_le_bytes()); // MinorVersion
    out.extend_from_slice(&0u32.to_le_bytes()); // Reserved
    out.extend_from_slice(&version_len.to_le_bytes());
    out.extend_from_slice(METADATA_VERSION);
    out.resize(
        out.len() + (version_len as usize - METADATA_VERSION.len()),
        0,
    );
    out.extend_from_slice(&0u16.to_le_bytes()); // Flags
    out.extend_from_slice(&(streams.len() as u16).to_le_bytes());

    let mut offset = header_size;
    for (name, payload) in &streams {
        out.extend_from_slice(&offset.to_le_bytes());
        out.extend_from_slice(&(payload.len() as u32).to_le_bytes());
        let name_field = align_up(name.len() as u32 + 1, 4) as usize;
        let start = out.len();
        out.extend_from_slice(name.as_bytes());
        out.resize(start + name_field, 0);
        offset += payload.len() as u32;
    }

    for (_, payload) in &streams {
        out.extend_from_slice(payload);
    }
    out
}

fn pad4(data: &[u8]) -> Vec<u8> {
    let mut out = data.to_vec();
    out.resize(align_up(out.len() as u32, 4) as usize, 0);
    out
}

pub(super) fn build_pe(metadata: &[u8]) -> Vec<u8> {
    let body_len = align_up(METHOD_BODY.len() as u32, 4);
    let metadata_rva = TEXT_RVA + COR20_SIZE + body_len;
    let text_size = COR20_SIZE + body_len + metadata.len() as u32;
    let raw_text_size = align_up(text_size, FILE_ALIGNMENT);
    let size_of_image = TEXT_RVA + align_up(text_size, SECTION_ALIGNMENT);

    let mut pe = vec![0u8; HEADERS_SIZE as usize];

    pe[0] = b'M';
    pe[1] = b'Z';
    write_u32(&mut pe, 0x3C, 0x80); // e_lfanew

    let mut p = 0x80usize;
    pe[p..p + 4].copy_from_slice(b"PE\0\0");
    p += 4;
    write_u16(&mut pe, p, 0x014C); // Machine: I386
    write_u16(&mut pe, p + 2, 1); // NumberOfSections
    write_u32(&mut pe, p + 4, 0); // TimeDateStamp
    write_u32(&mut pe, p + 8, 0); // PointerToSymbolTable
    write_u32(&mut pe, p + 12, 0); // NumberOfSymbols
    write_u16(&mut pe, p + 16, 0xE0); // SizeOfOptionalHeader
    write_u16(&mut pe, p + 18, 0x2102); // Characteristics: EXECUTABLE | 32BIT | DLL
    p += 20;

    write_u16(&mut pe, p, 0x010B); // Magic: PE32
    pe[p + 2] = 11; // MajorLinkerVersion
    pe[p + 3] = 0; // MinorLinkerVersion
    write_u32(&mut pe, p + 4, raw_text_size); // SizeOfCode
    write_u32(&mut pe, p + 8, 0); // SizeOfInitializedData
    write_u32(&mut pe, p + 12, 0); // SizeOfUninitializedData
    write_u32(&mut pe, p + 16, 0); // AddressOfEntryPoint
    write_u32(&mut pe, p + 20, TEXT_RVA); // BaseOfCode
    write_u32(&mut pe, p + 24, 0); // BaseOfData (PE32 only)
    write_u32(&mut pe, p + 28, IMAGE_BASE);
    write_u32(&mut pe, p + 32, SECTION_ALIGNMENT);
    write_u32(&mut pe, p + 36, FILE_ALIGNMENT);
    write_u16(&mut pe, p + 40, 4); // MajorOSVersion
    write_u16(&mut pe, p + 42, 0);
    write_u16(&mut pe, p + 44, 0); // MajorImageVersion
    write_u16(&mut pe, p + 46, 0);
    write_u16(&mut pe, p + 48, 4); // MajorSubsystemVersion
    write_u16(&mut pe, p + 50, 0);
    write_u32(&mut pe, p + 52, 0); // Win32VersionValue
    write_u32(&mut pe, p + 56, size_of_image);
    write_u32(&mut pe, p + 60, HEADERS_SIZE); // SizeOfHeaders
    write_u32(&mut pe, p + 64, 0); // CheckSum
    write_u16(&mut pe, p + 68, 3); // Subsystem: WINDOWS_CUI
    write_u16(&mut pe, p + 70, 0x0140); // DllCharacteristics: DYNAMIC_BASE | NX_COMPAT
    write_u32(&mut pe, p + 72, 0x10_0000); // SizeOfStackReserve
    write_u32(&mut pe, p + 76, 0x1000); // SizeOfStackCommit
    write_u32(&mut pe, p + 80, 0x10_0000); // SizeOfHeapReserve
    write_u32(&mut pe, p + 84, 0x1000); // SizeOfHeapCommit
    write_u32(&mut pe, p + 88, 0); // LoaderFlags
    write_u32(&mut pe, p + 92, 16); // NumberOfRvaAndSizes

    let dir = p + 96;
    write_u32(&mut pe, dir + 14 * 8, TEXT_RVA); // RVA of COR20
    write_u32(&mut pe, dir + 14 * 8 + 4, COR20_SIZE); // size
    p = dir + 16 * 8;

    pe[p..p + 8].copy_from_slice(b".text\0\0\0");
    write_u32(&mut pe, p + 8, text_size); // VirtualSize
    write_u32(&mut pe, p + 12, TEXT_RVA); // VirtualAddress
    write_u32(&mut pe, p + 16, raw_text_size); // SizeOfRawData
    write_u32(&mut pe, p + 20, HEADERS_SIZE); // PointerToRawData
    write_u32(&mut pe, p + 36, 0x6000_0020); // CNT_CODE | EXECUTE | READ

    let mut text = Vec::with_capacity(raw_text_size as usize);
    write_cor20(&mut text, metadata_rva, metadata.len() as u32);
    text.extend_from_slice(&METHOD_BODY);
    text.resize((COR20_SIZE + body_len) as usize, 0); // pad body to 4 bytes
    text.extend_from_slice(metadata);
    text.resize(raw_text_size as usize, 0);

    pe.extend_from_slice(&text);
    pe
}

fn write_cor20(out: &mut Vec<u8>, metadata_rva: u32, metadata_size: u32) {
    out.extend_from_slice(&COR20_SIZE.to_le_bytes()); // cb
    out.extend_from_slice(&2u16.to_le_bytes()); // MajorRuntimeVersion
    out.extend_from_slice(&5u16.to_le_bytes()); // MinorRuntimeVersion
    out.extend_from_slice(&metadata_rva.to_le_bytes());
    out.extend_from_slice(&metadata_size.to_le_bytes());
    out.extend_from_slice(&1u32.to_le_bytes()); // Flags: COMIMAGE_FLAGS_ILONLY
    out.extend_from_slice(&0u32.to_le_bytes()); // EntryPointToken
    // Resources, StrongName, CodeManager, VTableFixups, ExportJumps, NativeHeader
    out.resize(out.len() + 6 * 8, 0);
}

fn write_u16(buffer: &mut [u8], offset: usize, value: u16) {
    buffer[offset..offset + 2].copy_from_slice(&value.to_le_bytes());
}

fn write_u32(buffer: &mut [u8], offset: usize, value: u32) {
    buffer[offset..offset + 4].copy_from_slice(&value.to_le_bytes());
}
