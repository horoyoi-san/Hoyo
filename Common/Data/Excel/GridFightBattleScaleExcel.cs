using MemoryPack;

namespace March7thHoney.Data.Excel;

[MemoryPackable]
public partial class GridFightRatioValue
{
    public double Value { get; set; }
}

[ResourceEntity("GridFightBinaryNodeRule.json")]
[MemoryPackable]
public partial class GridFightBinaryNodeRuleExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint Quality { get; set; }
    public uint PerformLevel { get; set; }

    public override int GetId() => (int)ID;

    public override void Loaded()
    {
        GameData.GridFightBinaryNodeRuleData.TryAdd(ID, this);
    }
}

[ResourceEntity("GridFightEliteGroup.json")]
[MemoryPackable]
public partial class GridFightEliteGroupExcel : ExcelResource
{
    public uint EliteGroup { get; set; }
    public GridFightRatioValue AttackRatio { get; set; } = new();
    public GridFightRatioValue DefenceRatio { get; set; } = new();
    public GridFightRatioValue HPRatio { get; set; } = new();
    public GridFightRatioValue SpeedRatio { get; set; } = new();
    public GridFightRatioValue StanceRatio { get; set; } = new();

    public override int GetId() => (int)EliteGroup;

    public override void Loaded()
    {
        GameData.GridFightEliteGroupData.TryAdd(EliteGroup, this);
    }
}

[ResourceEntity("GridFightEnemyDifficultyLv.json")]
[MemoryPackable]
public partial class GridFightEnemyDifficultyLvExcel : ExcelResource
{
    public uint EnemyDifficultyLevel { get; set; }
    public uint ChapterID { get; set; }
    public GridFightRatioValue AttackRatio { get; set; } = new();
    public GridFightRatioValue DefenceRatio { get; set; } = new();
    public GridFightRatioValue HPRatio { get; set; } = new();
    public GridFightRatioValue SpeedRatio { get; set; } = new();
    public GridFightRatioValue StanceRatio { get; set; } = new();

    public override int GetId() => (int)((ChapterID << 16) | EnemyDifficultyLevel);

    public override void Loaded()
    {
        GameData.GridFightEnemyDifficultyLvData.TryAdd(ChapterID, []);
        GameData.GridFightEnemyDifficultyLvData[ChapterID][EnemyDifficultyLevel] = this;
    }
}

[ResourceEntity("GridFightStageLevelValue.json")]
[MemoryPackable]
public partial class GridFightStageLevelValueExcel : ExcelResource
{
    public uint StageID { get; set; }
    public uint LevelBaseAttack { get; set; }
    public uint LevelBaseHP { get; set; }

    public override int GetId() => (int)StageID;

    public override void Loaded()
    {
        GameData.GridFightStageLevelValueData.TryAdd(StageID, this);
    }
}

[ResourceEntity("GridFightFormationWave.json")]
[MemoryPackable]
public partial class GridFightFormationWaveExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint MaxTeammateCount { get; set; }

    public override int GetId() => (int)ID;

    public override void Loaded()
    {
        GameData.GridFightFormationWaveData.TryAdd(ID, this);
    }
}

[ResourceEntity("GridFightPenaltyRule.json")]
[MemoryPackable]
public partial class GridFightPenaltyRuleExcel : ExcelResource
{
    public uint ID { get; set; }
    public uint ThresholdPosition { get; set; }
    public uint ThresholdFailPlayerHPPenalty { get; set; }
    public uint ThresholdPassBasicPlayerHPPenalty { get; set; }
    public uint ProgressPenaltyCoefficient { get; set; }

    public override int GetId() => (int)ID;

    public override void Loaded()
    {
        GameData.GridFightPenaltyRuleData.TryAdd(ID, this);
    }
}

[ResourceEntity("GridFightVictoryBonus.json")]
[MemoryPackable]
public partial class GridFightVictoryBonusExcel : ExcelResource
{
    public uint VictoryCount { get; set; }
    public uint GoldBonus { get; set; }
    public uint ExtraGroupID { get; set; }

    public override int GetId() => (int)VictoryCount;

    public override void Loaded()
    {
        GameData.GridFightVictoryBonusData.TryAdd(VictoryCount, this);
    }
}
