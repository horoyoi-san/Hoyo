using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.GetSecretKeyInfoCsReq)]
public class HandlerGetSecretKeyInfoCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        await connection.SendPacket(new PacketGetSecretKeyInfoScRsp());
    }
}
