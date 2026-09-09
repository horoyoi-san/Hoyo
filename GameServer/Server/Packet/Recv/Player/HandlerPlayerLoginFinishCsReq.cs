using March7thHoney.Kcp;
using March7thHoney.GameServer.Server.Packet.Send.DailyActive;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Server.Packet.Send.Mission;
using March7thHoney.GameServer.Server.Packet.Send.Player;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.Player;

[Opcode(CmdIds.PlayerLoginFinishCsReq)]
public class HandlerPlayerLoginFinishCsReq : PlayerHandler
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player)
    {
        await connection.SendPacket(CmdIds.PlayerLoginFinishScRsp);
        if (player?.InventoryManager != null &&
            MonthCardService.TryClaimDailyReward(player.Data, out var monthCardReward))
        {
            await player.InventoryManager.AddItem(monthCardReward.ItemId, monthCardReward.Count, false);
            await connection.SendPacket(new PacketMonthCardRewardNotify([monthCardReward]));
        }

        await connection.SendPacket(new PacketFinishedMissionScNotify(
            player?.MissionManager?.Data.FinishedMainMissionIds ?? []));
        await connection.SendPacket(new PacketDailyActiveInfoNotify(player));
        await SendHoyoToonLuaAutoRun(connection);
    }

    private static async Task SendHoyoToonLuaAutoRun(Connection connection)
    {
        if (connection.Player == null) return;

        var luaRoot = Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, "Lua"));
        var candidates = new[]
        {
            "Auto/default.lua",
            $"Auto/{connection.Player.Uid}.lua"
        };

        foreach (var relativePath in candidates)
        {
            string filePath;
            try
            {
                filePath = HoyoToonLuaPayloadBuilder.ResolveLuaPath(luaRoot, relativePath);
            }
            catch (IOException)
            {
                continue;
            }

            if (!File.Exists(filePath)) continue;

            var bytes = await HoyoToonLuaPayloadBuilder.BuildAsync(luaRoot, relativePath);
            await connection.SendPacket(new HandshakePacket(bytes));
        }
    }
}
