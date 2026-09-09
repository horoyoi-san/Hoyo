using March7thHoney.Database.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using Google.Protobuf;

namespace March7thHoney.GameServer.Server.Packet.Send.ServerPrefs;

public class PacketGetServerPrefsDataScRsp : BasePacket
{
    public PacketGetServerPrefsDataScRsp(ServerPrefsInfo? info, uint id) : base(CmdIds.GetServerPrefsDataScRsp)
    {
        var proto = new GetServerPrefsDataScRsp
        {
            ServerPrefs = info?.ToProto() ?? new Proto.ServerPrefs
            {
                Data = ByteString.Empty,
                ServerPrefsId = id
            }
        };

        SetData(proto);
    }
}
