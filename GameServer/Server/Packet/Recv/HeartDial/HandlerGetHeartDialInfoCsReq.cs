using March7thHoney.GameServer.Server.Packet.Send.HeartDial;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.HeartDial;

[Opcode(CmdIds.GetHeartDialInfoCsReq)]
public class HandlerGetHeartDialInfoCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetHeartDialInfoScRsp(player));
    }
}
