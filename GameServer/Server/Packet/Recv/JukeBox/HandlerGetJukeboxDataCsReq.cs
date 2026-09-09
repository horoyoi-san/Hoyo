using March7thHoney.GameServer.Server.Packet.Send.JukeBox;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.JukeBox;

[Opcode(CmdIds.GetJukeboxDataCsReq)]
public class HandlerGetJukeboxDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetJukeboxDataScRsp(player));
    }
}
