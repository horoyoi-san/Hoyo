using MemoryPack;

namespace March7thHoney.Data.Excel;

[MemoryPackable]
public partial class GridFightDynamicValue
{
    public long? IntValue { get; set; }
    public double? DoubleValue { get; set; }
    public bool? BoolValue { get; set; }
    public string? StringValue { get; set; }
    public List<GridFightDynamicValue>? ArrayValue { get; set; }
    public Dictionary<string, GridFightDynamicValue>? MapValue { get; set; }

    public uint AsUInt32(uint fallback = 0)
    {
        return IntValue is >= 0 and <= uint.MaxValue ? (uint)IntValue.Value : fallback;
    }

    public IReadOnlyList<uint> AsUInt32List()
    {
        return ArrayValue?.Select(value => value.AsUInt32()).ToList() ?? [];
    }
}

[ResourceEntity("GridFightConstCommon.json,GridFightConstValueCommonV2.json", true)]
[MemoryPackable]
public partial class GridFightConstValueExcel : ExcelResource
{
    public string ConstValueName { get; set; } = string.Empty;
    public GridFightDynamicValue Value { get; set; } = new();

    public override int GetId()
    {
        return StringComparer.Ordinal.GetHashCode(ConstValueName);
    }

    public override void Loaded()
    {
        GameData.GridFightConstValueData[ConstValueName] = Value;
    }
}
