using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Multiplayer;

[Opcode(CmdIds.GetMatchPlayDataCsReq)]
public class HandlerGetMatchPlayDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(CmdIds.MultiplayerGetMatchPlayDataScRsp);
    }
}
