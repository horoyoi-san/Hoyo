use bitflags::bitflags;

bitflags! {
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    #[repr(transparent)]
    pub struct TypeAttributes: i32 {
        // Visibility attributes
        const NotPublic        = 0x00000000;
        const Public           = 0x00000001;
        const NestedPublic     = 0x00000002;
        const NestedPrivate    = 0x00000003;
        const NestedFamily     = 0x00000004;
        const NestedAssembly   = 0x00000005;
        const NestedFamANDAssem = 0x00000006;
        const NestedFamORAssem = 0x00000007;
        const VisibilityMask   = 0x00000007;

        // Layout
        const AutoLayout       = 0x00000000;
        const SequentialLayout = 0x00000008;
        const ExplicitLayout   = 0x00000010;
        const LayoutMask       = 0x00000018;

        // Semantics
        const Class            = 0x00000000;
        const Interface        = 0x00000020;
        const ClassSemanticsMask = 0x00000020;

        // Other attributes
        const Abstract         = 0x00000080;
        const Sealed           = 0x00000100;
        const SpecialName      = 0x00000400;
        const RTSpecialName    = 0x00000800;
        const Import           = 0x00001000;
        const Serializable     = 0x00002000;
        const WindowsRuntime   = 0x00004000;

        // String formatting
        const AnsiClass        = 0x00000000;
        const UnicodeClass     = 0x00010000;
        const AutoClass        = 0x00020000;
        const CustomFormatClass = 0x00030000;
        const StringFormatMask = 0x00030000;
        const CustomFormatMask = 0x00C00000;

        // Initialization
        const BeforeFieldInit  = 0x00100000;

        // Reserved
        const HasSecurity      = 0x00040000;
        const ReservedMask     = 0x00040800;
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    #[repr(transparent)]
    pub struct FieldAttributes: i32 {
        const PrivateScope     = 0x0000;
        const Private          = 0x0001;
        const FamANDAssem      = 0x0002;
        const Assembly         = 0x0003;
        const Family           = 0x0004;
        const FamORAssem       = 0x0005;
        const Public           = 0x0006;
        const FieldAccessMask  = 0x0007;

        const Static           = 0x0010;
        const InitOnly         = 0x0020;
        const Literal          = 0x0040;
        const HasFieldRVA      = 0x0100;
        const NotSerialized    = 0x0080;
        const SpecialName      = 0x0200;
        const RTSpecialName    = 0x0400;
        const HasFieldMarshal  = 0x1000;
        const PinvokeImpl      = 0x2000;
        const HasDefault       = 0x8000;

        const ReservedMask     = 0x9500; // 0b1001_0101_0000_0000 = 38144
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    #[repr(transparent)]
    pub struct MethodAttributes: i32 {
        const MemberAccessMask         = 0x7;
        const PrivateScope             = 0x0;
        const Private                  = 0x1;
        const FamANDAssem              = 0x2;
        const Assembly                 = 0x3;
        const Family                   = 0x4;
        const FamORAssem               = 0x5;
        const Public                   = 0x6;
        const Static                   = 0x10;
        const Final                    = 0x20;
        const Virtual                  = 0x40;
        const HideBySig                = 0x80;
        const CheckAccessOnOverride    = 0x200;
        const VtableLayoutMask         = 0x100;
        const ReuseSlot                = 0x0;
        const NewSlot                  = 0x100;
        const Abstract                 = 0x400;
        const SpecialName              = 0x800;
        const PinvokeImpl              = 0x2000;
        const UnmanagedExport          = 0x8;
        const RTSpecialName            = 0x1000;
        const ReservedMask             = 0xD000;
        const HasSecurity              = 0x4000;
        const RequireSecObject         = 0x8000;
    }

    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    #[repr(transparent)]
    pub struct BindingFlags: i32 {
        const Default                = 0;
        const IgnoreCase             = 0x1;
        const DeclaredOnly           = 0x2;
        const Instance               = 0x4;
        const Static                 = 0x8;
        const Public                 = 0x10;
        const NonPublic              = 0x20;
        const FlattenHierarchy       = 0x40;
        const InvokeMethod           = 0x100;
        const CreateInstance         = 0x200;
        const GetField               = 0x400;
        const SetField               = 0x800;
        const GetProperty            = 0x1000;
        const SetProperty            = 0x2000;
        const PutDispProperty        = 0x4000;
        const PutRefDispProperty     = 0x8000;
        const ExactBinding           = 0x10000;
        const SuppressChangeType     = 0x20000;
        const OptionalParamBinding   = 0x40000;
        const IgnoreReturn           = 0x1000000;
    }

}
