using MemoryPack;
namespace March7thHoney.Data.Config.Scene;

[MemoryPackable]
public partial class MapInfo
{
    public List<AreaInfo> AreaList { get; set; } = [];
    public List<int> MapLayerList { get; set; } = [];
}

[MemoryPackable]
public partial class AreaInfo
{
    public int ID { get; set; }
    public MinimapVolumeInfo MinimapVolume { get; set; } = new();
    public List<int> RegionIDList { get; set; } = [];
    public List<int> MapLayerList { get; set; } = [];
}

[MemoryPackable]
public partial class MinimapVolumeInfo
{
    public List<SectionsInfo> Sections { get; set; } = new();
}

[MemoryPackable]
public partial class SectionsInfo
{
    public int ID { get; set; }
    public int MapLayerID { get; set; }
    public bool IsRect { get; set; }
    public List<int> Indices { get; set; } = [];
}
