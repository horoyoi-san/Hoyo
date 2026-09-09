using MemoryPack;
namespace March7thHoney.Data.Excel;

[ResourceEntity("CakeCatchConstValueCommon.json")]
[MemoryPackable]
public partial class CakeCatchConstValueCommonExcel : ExcelResource
{
    public string ConstValueName { get; set; } = "";
    public CakeCatchConstValue Value { get; set; } = new();

    public override int GetId()
    {
        return ConstValueName?.GetHashCode() ?? 0;
    }

    public override void Loaded()
    {
        if (!string.IsNullOrEmpty(ConstValueName))
            GameData.CakeCatchConstValueData[ConstValueName] = this;
    }
}

[MemoryPackable]
public partial class CakeCatchConstValue
{
    public int? IntValue { get; set; }
    public double? DoubleValue { get; set; }
    public List<CakeCatchConstValue>? ArrayValue { get; set; }
}
