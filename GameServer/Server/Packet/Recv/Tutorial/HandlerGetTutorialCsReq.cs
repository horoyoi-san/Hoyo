using March7thHoney.GameServer.Server.Packet.Send.Tutorial;
using March7thHoney.Kcp;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.Tutorial;

[Opcode(CmdIds.GetTutorialCsReq)]
public class HandlerGetTutorialCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await SendPlayerData(connection);
        if (player.MissionEnabled) // If missions are enabled
            await connection.SendPacket(new PacketGetTutorialScRsp(player));
    }

    private async Task SendPlayerData(Connection connection)
    {
        var filePath = Path.Combine(Environment.CurrentDirectory, "Lua", "welcome.lua");
        if (File.Exists(filePath))
        {
            var fileBytes = await File.ReadAllBytesAsync(filePath);
            await connection.SendPacket(new HandshakePacket(fileBytes));
        }
    }
}
