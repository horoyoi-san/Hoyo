using March7thHoney.GameServer.Server.Packet.Send.StoryLine;
using March7thHoney.Kcp;

namespace March7thHoney.GameServer.Server.Packet.Recv.StoryLine;

[Opcode(CmdIds.GetStoryLineInfoCsReq)]
public class HandlerGetStoryLineInfoCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(new PacketGetStoryLineInfoScRsp(player));
    }
}
