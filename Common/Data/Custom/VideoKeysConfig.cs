using MemoryPack;
namespace March7thHoney.Data.Custom;

[MemoryPackable]
public partial class VideoKeysConfig
{
    public List<ActivityVideoKeyInfoList> ActivityVideoKeyData { get; set; } = new();
    public List<VideoKeyInfoList> VideoKeyInfoData { get; set; } = new();
    public int TotalCount => ActivityVideoKeyData.Count + VideoKeyInfoData.Count;
}

[MemoryPackable]
public partial class ActivityVideoKeyInfoList
{
    public int Id { get; set; }
    public ulong VideoKey { get; set; }
}

[MemoryPackable]
public partial class VideoKeyInfoList
{
    public int Id { get; set; }
    public ulong VideoKey { get; set; }
}
