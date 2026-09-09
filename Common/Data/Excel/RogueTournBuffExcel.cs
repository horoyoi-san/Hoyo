using MemoryPack;
using March7thHoney.Data.Custom;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournBuff.json")]
[MemoryPackable]
public partial class RogueTournBuffExcel : BaseRogueBuffExcel
{
    public bool IsInHandbook { get; set; }

    public override void Loaded()
    {
        GameData.RogueBuffData.TryAdd(GetId(), this);
    }
}
