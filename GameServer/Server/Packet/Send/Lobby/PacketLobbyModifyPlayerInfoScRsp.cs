using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Lobby;

public class PacketLobbyModifyPlayerInfoScRsp : BasePacket
{
    public PacketLobbyModifyPlayerInfoScRsp(Retcode code) : base(CmdIds.LobbyModifyPlayerInfoScRsp)
    {
        var proto = new GHGECAINBLA
        {
            PLDKENJLKME = (uint)code
        };

        SetData(proto);
    }
}
