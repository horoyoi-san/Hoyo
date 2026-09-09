using MemoryPack;
using March7thHoney.Data.Custom;
using March7thHoney.Util;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueBuffGroup.json")]
[MemoryPackable]
public partial class RogueBuffGroupExcel : BaseRogueBuffGroupExcel
{
    [JsonProperty("IDLBMIHBAPB")] public int GroupID { get; set; }
    [JsonProperty("GNGDPDOMDFH")] public List<int> BuffTagList { get; set; } = [];

    public override int GetId()
    {
        return GroupID;
    }

    public override void Loaded()
    {
        GameData.RogueBuffGroupData[GetId()] = this;
        LoadBuff();
    }

    public override void AfterAllDone()
    {
        LoadBuff();
    }

    public void LoadBuff()
    {
        if (IsLoaded) return;
        var count = 0;
        foreach (var buffId in BuffTagList)
        {
            List<RogueBuffExcel> buffs =
            [
                .. GameData.RogueBuffData.Where(x => x.Value is RogueBuffExcel).Select(x =>
                    (x.Value as RogueBuffExcel)!).ToList()
            ];
            if (buffs.FirstOrDefault(x => x.RogueBuffTag == buffId) is { } buff)
            {
                BuffList.SafeAdd(buff);
                count++;
            }
            else
            {
                // might is group id
                if (!GameData.RogueBuffGroupData.TryGetValue(buffId, out var group)) continue;
                if (group is not RogueBuffGroupExcel e) continue;
                e.LoadBuff();
                BuffList.SafeAddRange(e.BuffList);
                count++;
            }
        }

        if (count == BuffTagList.Count) IsLoaded = true;
    }
}
