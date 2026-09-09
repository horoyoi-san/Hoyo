using MemoryPack;

namespace March7thHoney.Data.Custom;

// Runtime-only GridFight corrections that are not represented by the bundled resource schema.
[MemoryPackable]
public partial class GridFightRuntimeConfig
{
    public uint RotationPortalId { get; set; }
    public Dictionary<uint, List<uint>> ShopRarityWeightOverrides { get; set; } = [];
}
