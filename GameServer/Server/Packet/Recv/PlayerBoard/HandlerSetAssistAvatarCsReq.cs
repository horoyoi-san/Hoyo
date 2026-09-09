using March7thHoney.GameServer.Server.Packet.Send.PlayerBoard;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.PlayerBoard;

[Opcode(CmdIds.SetAssistAvatarCsReq)]
public class HandlerSetAssistAvatarCsReq : Handler<SetAssistAvatarCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetAssistAvatarCsReq req)
    {
        var avatars = player.AvatarManager!.Data!.AssistAvatars;
        avatars.Clear();
        foreach (var id in req.AvatarIdList)
        {
            if (id == 0) continue;

            var avatarData = player.AvatarManager!.Data.FormalAvatars.FirstOrDefault(x =>
                x.BaseAvatarId == (int)id);
            if (avatarData != null) avatars.Add(avatarData.BaseAvatarId);
        }

        await connection.SendPacket(new PacketSetAssistAvatarScRsp(req.AvatarIdList));
    }
}
