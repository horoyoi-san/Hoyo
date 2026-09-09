using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("ChallengeStoryMazeExtra.json")]
[MemoryPackable]
public partial class ChallengeStoryExtraExcel : ExcelResource
{
    public int ID { get; set; }
    public uint TurnLimit { get; set; }
    public int ClearScore { get; set; }
    public List<int>? BattleTargetID { get; set; }


    public override int GetId()
    {
        return ID;
    }

    public override void AfterAllDone()
    {
        if (GameData.ChallengeConfigData.ContainsKey(ID))
        {
            var challengeExcel = GameData.ChallengeConfigData[ID];
            challengeExcel.SetStoryExcel(this);
        }
    }
}
