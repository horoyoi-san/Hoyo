pub use crate::crypt::attributes::{field_attributes, method_attributes, type_attributes};

pub fn format_field_modifiers(attrs: u16) -> String {
    use field_attributes::*;
    let mut parts = Vec::new();

    match attrs & FIELD_ACCESS_MASK {
        PUBLIC => parts.push("public"),
        PRIVATE => parts.push("private"),
        FAMILY => parts.push("protected"),
        ASSEMBLY => parts.push("internal"),
        FAM_OR_ASSEM => parts.push("protected internal"),
        FAM_AND_ASSEM => parts.push("private protected"),
        _ => {}
    }

    if attrs & LITERAL != 0 {
        parts.push("const");
    } else {
        if attrs & STATIC != 0 {
            parts.push("static");
        }
        if attrs & INIT_ONLY != 0 {
            parts.push("readonly");
        }
    }

    parts.join(" ")
}

pub fn format_method_modifiers(flags: u16) -> String {
    use method_attributes::*;
    let mut parts = Vec::new();

    match flags & MEMBER_ACCESS_MASK {
        PUBLIC => parts.push("public"),
        PRIVATE => parts.push("private"),
        FAMILY => parts.push("protected"),
        ASSEM => parts.push("internal"),
        FAM_OR_ASSEM => parts.push("protected internal"),
        FAM_AND_ASSEM => parts.push("private protected"),
        _ => {}
    }

    if flags & STATIC != 0 {
        parts.push("static");
    }

    let new_slot = flags & VTABLE_LAYOUT_MASK == NEW_SLOT;
    let reuse_slot = flags & VTABLE_LAYOUT_MASK == 0;

    if flags & ABSTRACT != 0 {
        parts.push("abstract");
        if reuse_slot {
            parts.push("override");
        }
    } else if flags & FINAL != 0 {
        if reuse_slot {
            parts.push("sealed");
            parts.push("override");
        }
    } else if flags & VIRTUAL != 0 {
        if new_slot {
            parts.push("virtual");
        } else {
            parts.push("override");
        }
    }

    if flags & PINVOKE_IMPL != 0 {
        parts.push("extern");
    }

    parts.join(" ")
}

pub fn format_type_modifiers(flags: u32, is_value_type: bool, is_enum: bool) -> String {
    use type_attributes::*;
    let mut parts: Vec<&str> = Vec::new();

    match flags & VISIBILITY_MASK {
        PUBLIC | NESTED_PUBLIC => parts.push("public"),
        NESTED_PRIVATE => parts.push("private"),
        NESTED_FAMILY => parts.push("protected"),
        NESTED_FAM_OR_ASSEM => parts.push("protected internal"),
        NESTED_FAM_AND_ASSEM => parts.push("private protected"),
        _ => parts.push("internal"),
    }

    let is_interface = flags & INTERFACE != 0;
    let is_abstract = flags & ABSTRACT != 0;
    let is_sealed = flags & SEALED != 0;

    if !is_interface && !is_enum {
        if is_abstract && is_sealed {
            parts.push("static");
        } else {
            if is_abstract {
                parts.push("abstract");
            }
            if is_sealed {
                parts.push("sealed");
            }
        }
    }

    if is_enum {
        parts.push("enum");
    } else if is_interface {
        parts.push("interface");
    } else if is_value_type {
        parts.push("struct");
    } else {
        parts.push("class");
    }

    parts.join(" ")
}
