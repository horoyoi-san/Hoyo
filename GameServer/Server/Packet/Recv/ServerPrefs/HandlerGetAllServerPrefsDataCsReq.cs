using March7thHoney.GameServer.Server.Packet.Send.ServerPrefs;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.ServerPrefs;

[Opcode(CmdIds.GetAllServerPrefsDataCsReq)]
public class HandlerGetAllServerPrefsDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        var infos = player?.ServerPrefsData?.ServerPrefsDict.Values.ToList() ?? [];
        await connection.SendPacket(new PacketGetAllServerPrefsDataScRsp(infos));
    }
}
