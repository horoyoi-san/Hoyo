using March7thHoney.GameServer.Server.Packet.Send.ServerPrefs;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.ServerPrefs;

[Opcode(CmdIds.UpdateServerPrefsCsReq)]
public class HandlerUpdateServerPrefsDataCsReq : Handler<UpdateServerPrefsCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, UpdateServerPrefsCsReq req)
    {
        player?.ServerPrefsData?.SetData((int)req.ServerPrefs.ServerPrefsId,
            req.ServerPrefs.Data.ToBase64());
        await connection.SendPacket(new PacketUpdateServerPrefsDataScRsp(req.ServerPrefs.ServerPrefsId));
    }
}
