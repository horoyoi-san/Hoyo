using MemoryPack;
using March7thHoney.Enums.Task;

namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class ByCompareSubMissionState : PredicateConfigInfo
{
    public int SubMissionID { get; set; }
    public SubMissionStateEnum SubMissionState { get; set; }
    public bool AllStoryLine { get; set; }
}
