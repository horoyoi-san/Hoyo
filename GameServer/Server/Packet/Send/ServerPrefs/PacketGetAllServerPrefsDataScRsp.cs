using March7thHoney.Database.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.ServerPrefs;

public class PacketGetAllServerPrefsDataScRsp : BasePacket
{
    public PacketGetAllServerPrefsDataScRsp(List<ServerPrefsInfo> infos) : base(CmdIds.GetAllServerPrefsDataScRsp)
    {
        var proto = new GetAllServerPrefsDataScRsp();

        foreach (var info in infos) proto.ServerPrefsList.Add(info.ToProto());

        SetData(proto);
    }
}
