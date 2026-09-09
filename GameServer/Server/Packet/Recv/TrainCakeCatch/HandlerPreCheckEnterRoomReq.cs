using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.TrainCakeCatch;

[Opcode(CmdIds.SocialPlayPreCheckEnterRoomCsReq)]
public class HandlerPreCheckEnterRoomReq : Handler
{
    public override async Task OnHandle(Connection connection, byte[] header, byte[] data)
    {
        var req = SocialPlayPreCheckEnterRoomCsReq.Parser.ParseFrom(data);
        var player = connection.Player!;
        var roomOwnerUid = ResolveRoomOwnerUid(player.Uid, req.TeleportId);
        player.TrainCakeCatchManager!.PrepareSocialPlayRoom(roomOwnerUid);

        var preCheckPacket = new BasePacket(CmdIds.SocialPlayPreCheckEnterRoomScRsp);
        preCheckPacket.SetData(new SocialPlayPreCheckEnterRoomScRsp
        {
            CMHKFNFKGOI = player.TrainCakeCatchManager.GetRoomRefreshTime(roomOwnerUid)
        });
        await connection.SendPacket(preCheckPacket);
    }

    private static uint ResolveRoomOwnerUid(int playerUid, uint teleportId)
    {
        if (teleportId == 0)
            return (uint)playerUid;

        var serverProfileUid = (uint)ConfigManager.Config.ServerOption.ServerProfile.Uid;
        if (teleportId == serverProfileUid)
            // The Hyacine-style shared server profile uid is used like a social-play
            // entry point in some flows. Mapping it to the caller's own uid keeps the
            // player in a stable self-room until we have a fuller server-profile room
            // model that won't bounce each user into conflicting ownership state.
            return (uint)playerUid;

        return teleportId;
    }
}
