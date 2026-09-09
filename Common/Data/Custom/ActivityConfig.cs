using MemoryPack;
namespace March7thHoney.Data.Custom;

[MemoryPackable]
public partial class ActivityConfig
{
    public List<ActivityScheduleData> ScheduleData { get; set; } = [];
}

[MemoryPackable]
public partial class ActivityScheduleData
{
    public int ActivityId { get; set; }
    public long BeginTime { get; set; }
    public long EndTime { get; set; }
    public int PanelId { get; set; }
}
