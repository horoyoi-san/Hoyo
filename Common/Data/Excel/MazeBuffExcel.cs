using MemoryPack;
using March7thHoney.Proto;

namespace March7thHoney.Data.Excel;

[ResourceEntity("MazeBuff.json,AvatarMazeBuff.json,AvatarMazeBuffLD.json", true)]
[MemoryPackable]
public partial class MazeBuffExcel : ExcelResource
{
    public int ID { get; set; }
    public int Lv { get; set; }
    public string ModifierName { get; set; } = string.Empty;
    public string MazeBuffType { get; set; } = string.Empty;
    public string InBattleBindingType { get; set; } = string.Empty;
    public string InBattleBindingKey { get; set; } = string.Empty;
    public string UseType { get; set; } = string.Empty;

    public override int GetId()
    {
        return ID * 10 + Lv;
    }

    public override void Loaded()
    {
        GameData.MazeBuffData.TryAdd(GetId(), this);
    }

    public BattleBuff ToProto()
    {
        return new BattleBuff
        {
            Id = (uint)ID,
            Level = (uint)Lv
        };
    }
}
