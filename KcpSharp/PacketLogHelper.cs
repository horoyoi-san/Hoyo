using System.Collections.Concurrent;
using System.Reflection;
using March7thHoney.Proto;
using Google.Protobuf;
using Google.Protobuf.Reflection;

namespace March7thHoney.Kcp;

public static class PacketLogHelper
{
    private static ConcurrentDictionary<ushort, ParseIMessage> CachedParsers { get; } = [];

    public static string ConvertPacketToJson(ushort opcode, byte[] payload)
    {
        var descriptor = GetParser(opcode);
        if (descriptor == null) throw new Exception();

        var message = descriptor(payload);
        var formatter = JsonFormatter.Default;
        var asJson = formatter.Format(message);
        return asJson ?? throw new Exception();
    }

    private static ParseIMessage? GetParser(ushort opcode)
    {
        if (CachedParsers.TryGetValue(opcode, out var parser)) return parser;

        lock (CachedParsers)
        {
            // try to find the descriptor by opcode
            var asbly = Assembly.GetAssembly(typeof(PlayerGetTokenCsReq));
            if (asbly == null) return null;

            var typ = asbly.GetType($"March7thHoney.Proto.{March7thHoneyConnection.LogMap[opcode]}");
            if (typ == null) return null;
            var desc = typ.GetProperty("Descriptor", BindingFlags.Public | BindingFlags.Static);
            if (desc?.GetMethod == null) return null;

            // get parser
            if (desc.GetValue(null) is not MessageDescriptor parserProperty) return null;

            var parserMethod = parserProperty.Parser.GetType().GetMethod("ParseFrom", [typeof(byte[])]);
            if (parserMethod == null) return null;

            parser = (ParseIMessage)Delegate.CreateDelegate(
                typeof(ParseIMessage),
                parserProperty.Parser,
                parserMethod
            );

            CachedParsers[opcode] = parser;

            return parser;
        }
    }

    private delegate IMessage ParseIMessage(byte[] data);
}