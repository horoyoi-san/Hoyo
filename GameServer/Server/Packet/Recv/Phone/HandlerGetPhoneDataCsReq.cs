using March7thHoney.GameServer.Server.Packet.Send.Phone;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Phone;

[Opcode(CmdIds.GetPhoneDataCsReq)]
public class HandlerGetPhoneDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetPhoneDataScRsp(player));
    }
}
