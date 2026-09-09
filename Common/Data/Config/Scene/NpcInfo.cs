using MemoryPack;
namespace March7thHoney.Data.Config.Scene;

[MemoryPackable]
public partial class NpcInfo : PositionInfo
{
    public int NPCID { get; set; }
    public bool IsClientOnly { get; set; }
    public bool LoadOnInitial { get; set; } = true;
}
