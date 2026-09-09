using March7thHoney.Proto;
using Google.Protobuf;

namespace March7thHoney.Kcp;

public class HandshakePacket : BasePacket
{
    private static long VersionCounter = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

    public HandshakePacket(byte[] data) : base(CmdIds.ClientDownloadDataScNotify)
    {
        var downloadData = new ClientDownloadData
        {
            Data = ByteString.CopyFrom(data),
            Version = unchecked((uint)System.Threading.Interlocked.Increment(ref VersionCounter)),
            Time = DateTimeOffset.UtcNow.ToUnixTimeSeconds()
        };
        var notify = new ClientDownloadDataScNotify
        {
            DownloadData = downloadData
        };

        SetData(notify);
    }

    public HandshakePacket(string base64) : base(CmdIds.ClientDownloadDataScNotify)
    {
        SetData(Convert.FromBase64String(base64));
    }
}
