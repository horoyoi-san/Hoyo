using March7thHoney.GameServer.Server.Packet.Send.PlayerSync;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.SetNicknameCsReq)]
public class HandlerSetNicknameCsReq : Handler<SetNicknameCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, SetNicknameCsReq req)
    {
        if (req == null) return;
        player.Data.Name = req.Nickname;

        await connection.SendPacket(CmdIds.SetNicknameScRsp);
        await connection.SendPacket(new PacketPlayerSyncScNotify(player.ToProto()));
        await connection.SendWatermarkLuaAsync();
    }
}
