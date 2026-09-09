using March7thHoney.GameServer.Server.Packet.Send.PlayerBoard;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.PlayerBoard;

[Opcode(CmdIds.GetPlayerBoardDataCsReq)]
public class HandlerGetPlayerBoardDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetPlayerBoardDataScRsp(player));
    }
}
