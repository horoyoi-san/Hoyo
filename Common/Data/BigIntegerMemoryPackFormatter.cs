using System.Numerics;
using MemoryPack;

namespace March7thHoney.Data;

/// <summary>
///     MemoryPack has no built-in formatter for <see cref="BigInteger" />. Without one, the source-generated
///     formatters that hold a BigInteger member (e.g. <c>HashName.Hash</c>, used by every Excel name hash) fall
///     back to reflection-based formatter creation. Under JIT that fallback silently round-trips the value to 0 —
///     BigInteger exposes no settable members — and under NativeAOT it throws ("dynamic code"). That zeroing is
///     why every name hash came back as "[0]" once data was loaded from the binary cache, breaking handbook and
///     in-game avatar/item names. Round-trip the value as its raw two's-complement bytes to preserve it exactly.
/// </summary>
public sealed class BigIntegerMemoryPackFormatter : MemoryPackFormatter<BigInteger>
{
    public override void Serialize<TBufferWriter>(ref MemoryPackWriter<TBufferWriter> writer,
        scoped ref BigInteger value)
    {
        writer.WriteValue(value.ToByteArray());
    }

    public override void Deserialize(ref MemoryPackReader reader, scoped ref BigInteger value)
    {
        var bytes = reader.ReadValue<byte[]>();
        value = bytes is null || bytes.Length == 0 ? BigInteger.Zero : new BigInteger(bytes);
    }
}
