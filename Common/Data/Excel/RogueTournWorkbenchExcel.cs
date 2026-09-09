using MemoryPack;
using Newtonsoft.Json;

namespace March7thHoney.Data.Excel;

[ResourceEntity("RogueTournWorkbench.json")]
[MemoryPackable]
public partial class RogueTournWorkbenchExcel : ExcelResource
{
    public int WorkbenchID { get; set; }
    public List<int> FuncList { get; set; } = [];

    [JsonIgnore] public List<RogueTournWorkbenchFuncExcel> Funcs { get; set; } = [];

    public override int GetId()
    {
        return WorkbenchID;
    }

    public override void Loaded()
    {
        GameData.RogueTournWorkbenchData.Add(WorkbenchID, this);
    }

    public override void AfterAllDone()
    {
        foreach (var func in FuncList)
            if (GameData.RogueTournWorkbenchFuncData.TryGetValue(func, out var funcExcel))
                Funcs.Add(funcExcel);
    }
}
