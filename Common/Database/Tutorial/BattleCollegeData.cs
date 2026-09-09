using MemoryPack;

namespace March7thHoney.Database.Tutorial;

[DbTable("battle_college_data")]
public class BattleCollegeData : BaseDatabaseDataHelper
{
    public List<int> FinishedCollegeIdList { get; set; } = [];
}
