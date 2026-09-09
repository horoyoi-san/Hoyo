using MemoryPack;
namespace March7thHoney.Data.Config.Task;

[MemoryPackable]
public partial class PlayMessage : TaskConfigInfo
{
    public int MessageSectionID { get; set; }
}
