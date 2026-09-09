using System.Text.Json.Serialization;

namespace March7thHoney.Data.Freesr;

// Source-gen STJ metadata so /json freesr import deserializes under NativeAOT (the [MemoryPackable] types have no reflection-usable ctor after trimming).
[JsonSerializable(typeof(FreesrCalyxData))]
[JsonSerializable(typeof(FreesrBattleConfig))]
[JsonSerializable(typeof(List<FreesrCalyxLightcone>))]
public partial class FreesrJsonContext : JsonSerializerContext;
