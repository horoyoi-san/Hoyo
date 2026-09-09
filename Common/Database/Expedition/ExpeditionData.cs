using MemoryPack;

namespace March7thHoney.Database.Expedition;

[DbTable("Expedition")]
public class ExpeditionData : BaseDatabaseDataHelper
{
    public List<uint> ActiveExpeditionIds { get; set; } = [];

    public long RefreshTime { get; set; } = 0;
}
