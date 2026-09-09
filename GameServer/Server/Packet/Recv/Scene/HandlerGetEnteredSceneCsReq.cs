using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.GetEnteredSceneCsReq)]
public class HandlerGetEnteredSceneCsReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        await connection.SendPacket(new PacketGetEnteredSceneScRsp());
    }
}
