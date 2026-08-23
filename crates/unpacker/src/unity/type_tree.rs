use anyhow::Result;

use crate::{
    binary_reader::{BinaryReader, ByteOrder},
    unity::serialized_file::SerializedFileHeader,
};

#[derive(Default, Debug)]
pub struct TypeTreeNode {
    pub type_: String,
    pub name: String,
    pub size: i32,
    pub index: i32,
    pub type_flag: i32,
    pub version: i32,
    pub meta_flag: i32,
    pub level: i32,
    pub type_str_offset: usize,
    pub name_str_offset: usize,
    pub ref_type_hash: u64,
}

#[derive(Default, Debug)]
pub struct TypeTree {
    pub nodes: Vec<TypeTreeNode>,
    pub string_buffer: Vec<u8>,
}

impl TypeTree {
    pub fn read_from_blob_reader(
        tt: &mut TypeTree,
        br: &mut BinaryReader,
        header: &SerializedFileHeader,
    ) -> Result<()> {
        let node_count = br.read_i32()?;
        let string_buffer_size = br.read_i32()?;

        for _ in 0..node_count {
            tt.nodes.push(TypeTreeNode {
                version: br.read_u16()? as i32,
                level: br.read_u8()? as i32,
                type_flag: br.read_u8()? as i32,
                type_str_offset: br.read_u32()? as usize,
                name_str_offset: br.read_u32()? as usize,
                size: br.read_i32()?,
                index: br.read_i32()?,
                meta_flag: br.read_i32()?,
                ref_type_hash: if header.version >= 19 {
                    br.read_u64()?
                } else {
                    0
                },
                ..Default::default()
            });
        }

        tt.string_buffer = br.read_u8_list(string_buffer_size as usize)?;

        let mut string_buffer_reader = BinaryReader::new(&tt.string_buffer, ByteOrder::Big);
        for node in &mut tt.nodes {
            node.type_ = read_string(&mut string_buffer_reader, node.type_str_offset)?;
            node.name = read_string(&mut string_buffer_reader, node.name_str_offset)?;
        }

        Ok(())
    }

    pub fn read_from_reader(
        tt: &mut TypeTree,
        br: &mut BinaryReader,
        header: &SerializedFileHeader,
        level: i32,
    ) -> Result<()> {
        let mut node = TypeTreeNode {
            level,
            type_: br.read_string_util_null()?,
            name: br.read_string_util_null()?,
            size: br.read_i32()?,
            ..Default::default()
        };

        if header.version == 2 {
            let _variable_count = br.read_i32()?;
        }

        if header.version != 3 {
            node.index = br.read_i32()?;
        }

        node.type_flag = br.read_i32()?;
        node.version = br.read_i32()?;
        if header.version != 3 {
            node.meta_flag = br.read_i32()?;
        }

        tt.nodes.push(node);
        for _ in 0..br.read_i32()? {
            TypeTree::read_from_reader(tt, br, header, level + 1)?;
        }

        Ok(())
    }
}

fn read_string(r: &mut BinaryReader, offset: usize) -> Result<String> {
    if offset & 0x80000000 == 0 {
        r.set_offset(offset)?;
        return Ok(r.read_string_util_null()?);
    }
    let offset = offset & 0x7FFFFFFF;
    match common_string(offset) {
        Some(s) => Ok(s.to_string()),
        None => Ok(offset.to_string()),
    }
}

fn common_string(index: usize) -> Option<&'static str> {
    match index {
        0 => Some("AABB"),
        5 => Some("AnimationClip"),
        19 => Some("AnimationCurve"),
        34 => Some("AnimationState"),
        49 => Some("Array"),
        55 => Some("Base"),
        60 => Some("BitField"),
        69 => Some("bitset"),
        76 => Some("bool"),
        81 => Some("char"),
        86 => Some("ColorRGBA"),
        96 => Some("Component"),
        106 => Some("data"),
        111 => Some("deque"),
        117 => Some("double"),
        124 => Some("dynamic_array"),
        138 => Some("FastPropertyName"),
        155 => Some("first"),
        161 => Some("float"),
        167 => Some("Font"),
        172 => Some("GameObject"),
        183 => Some("Generic Mono"),
        196 => Some("GradientNEW"),
        208 => Some("GUID"),
        213 => Some("GUIStyle"),
        222 => Some("int"),
        226 => Some("list"),
        231 => Some("long long"),
        241 => Some("map"),
        245 => Some("Matrix4x4f"),
        256 => Some("MdFour"),
        263 => Some("MonoBehaviour"),
        277 => Some("MonoScript"),
        288 => Some("m_ByteSize"),
        299 => Some("m_Curve"),
        307 => Some("m_EditorClassIdentifier"),
        331 => Some("m_EditorHideFlags"),
        349 => Some("m_Enabled"),
        359 => Some("m_ExtensionPtr"),
        374 => Some("m_GameObject"),
        387 => Some("m_Index"),
        395 => Some("m_IsArray"),
        405 => Some("m_IsStatic"),
        416 => Some("m_MetaFlag"),
        427 => Some("m_Name"),
        434 => Some("m_ObjectHideFlags"),
        452 => Some("m_PrefabInternal"),
        469 => Some("m_PrefabParentObject"),
        490 => Some("m_Script"),
        499 => Some("m_StaticEditorFlags"),
        519 => Some("m_Type"),
        526 => Some("m_Version"),
        536 => Some("Object"),
        543 => Some("pair"),
        548 => Some("PPtr<Component>"),
        564 => Some("PPtr<GameObject>"),
        581 => Some("PPtr<Material>"),
        596 => Some("PPtr<MonoBehaviour>"),
        616 => Some("PPtr<MonoScript>"),
        633 => Some("PPtr<Object>"),
        646 => Some("PPtr<Prefab>"),
        659 => Some("PPtr<Sprite>"),
        672 => Some("PPtr<TextAsset>"),
        688 => Some("PPtr<Texture>"),
        702 => Some("PPtr<Texture2D>"),
        718 => Some("PPtr<Transform>"),
        734 => Some("Prefab"),
        741 => Some("Quaternionf"),
        753 => Some("Rectf"),
        759 => Some("RectInt"),
        767 => Some("RectOffset"),
        778 => Some("second"),
        785 => Some("set"),
        789 => Some("short"),
        795 => Some("size"),
        800 => Some("SInt16"),
        807 => Some("SInt32"),
        814 => Some("SInt64"),
        821 => Some("SInt8"),
        827 => Some("staticvector"),
        840 => Some("string"),
        847 => Some("TextAsset"),
        857 => Some("TextMesh"),
        866 => Some("Texture"),
        874 => Some("Texture2D"),
        884 => Some("Transform"),
        894 => Some("TypelessData"),
        907 => Some("UInt16"),
        914 => Some("UInt32"),
        921 => Some("UInt64"),
        928 => Some("UInt8"),
        934 => Some("unsigned int"),
        947 => Some("unsigned long long"),
        966 => Some("unsigned short"),
        981 => Some("vector"),
        988 => Some("Vector2f"),
        997 => Some("Vector3f"),
        1006 => Some("Vector4f"),
        1015 => Some("m_ScriptingClassIdentifier"),
        1042 => Some("Gradient"),
        1051 => Some("Type*"),
        1057 => Some("int2_storage"),
        1070 => Some("int3_storage"),
        1083 => Some("BoundsInt"),
        1093 => Some("m_CorrespondingSourceObject"),
        1121 => Some("m_PrefabInstance"),
        1138 => Some("m_PrefabAsset"),
        1152 => Some("FileSize"),
        1161 => Some("Hash128"),
        _ => None,
    }
}
