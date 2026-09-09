using MemoryPack;

namespace March7thHoney.Data.Excel;

[ResourceEntity("GridFightTutorialStage.json")]
[MemoryPackable]
public partial class GridFightTutorialStageExcel : ExcelResource
{
    public uint DivisionID { get; set; }

    public override int GetId() => (int)DivisionID;

    public override void Loaded()
    {
        GameData.GridFightTutorialStageData[DivisionID] = this;
    }
}

[ResourceEntity("GridFightTutorialStageNode.json")]
[MemoryPackable]
public partial class GridFightTutorialStageNodeExcel : ExcelResource
{
    public uint DivisionID { get; set; }
    public uint ChapterID { get; set; }
    public uint SectionID { get; set; }
    public uint Unlock { get; set; }

    public override int GetId() => HashCode.Combine(DivisionID, ChapterID, SectionID, Unlock);

    public override void Loaded()
    {
        GameData.GridFightTutorialStageNodeData.Add(this);
    }
}
