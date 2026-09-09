using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class EnterMap : TaskConfigInfo
{
    public int EntranceID { get; set; }
    public int GroupID { get; set; }
    public int AnchorID { get; set; }
}
