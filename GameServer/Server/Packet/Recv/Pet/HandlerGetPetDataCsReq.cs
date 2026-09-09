using March7thHoney.GameServer.Server.Packet.Send.Pet;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Pet;

[Opcode(CmdIds.GetPetDataCsReq)]
public class HandlerGetPetDataCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetPetDataScRsp(player));
    }
}
