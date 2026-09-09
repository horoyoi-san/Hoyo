using MemoryPack;
using March7thHoney.Data.Config.Rogue;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueNPC.json,RogueTournNPC.json", true)]
[MemoryPackable]
public partial class RogueNPCExcel : ExcelResource
{
    public int RogueNPCID { get; set; }
    public string NPCJsonPath { get; set; } = string.Empty;

    [JsonIgnore] public RogueNPCConfigInfo? RogueNpcConfig { get; set; }

    public override int GetId()
    {
        return RogueNPCID;
    }

    public override void Loaded()
    {
        GameData.RogueNPCData.TryAdd(RogueNPCID, this);
    }

    public bool CanUseInVer(int version)
    {
        return RogueNpcConfig != null;
    }
}
