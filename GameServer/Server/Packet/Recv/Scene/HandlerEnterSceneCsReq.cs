using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.GameServer.Server.Packet.Send.TrainParty;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Recv.Scene;

[Opcode(CmdIds.EnterSceneCsReq)]
public class HandlerEnterSceneCsReq : Handler<EnterSceneCsReq>
{
    protected override async Task OnHandle(Connection connection, PlayerInstance player, EnterSceneCsReq req)
    {
        var storyLineId = (int)(req.SceneIdentifier?.GameStoryLineId ?? 0);
        var socialTeleportId = (uint)(req.SceneIdentifier?.TeleportInfo?.TeleportId ?? 0u);
        var socialTeleportReason = (int)(req.SceneIdentifier?.TeleportInfo?.Reason ?? 0);
        var roomOwnerUid = socialTeleportId != 0
            ? ResolveRoomOwnerUid(player.Uid, socialTeleportId)
            : 0;
        var isSocialPlayEnter = roomOwnerUid != 0 && socialTeleportReason is 2 or 3 or 4 or 5;
        var isOwnerSocialEnter = isSocialPlayEnter && roomOwnerUid == (uint)player.Uid;
        var isJoinedSocialEnter = isSocialPlayEnter && roomOwnerUid != (uint)player.Uid;
        var previousRoomOwnerUid = player.TrainCakeCatchManager?.CurrentRoomOwnerUid;
        var socialSceneContext = isSocialPlayEnter
            ? player.TrainCakeCatchManager?.GetRoomSceneContext(roomOwnerUid)
            : null;
        var shouldLeaveSocialPlay = player.TrainCakeCatchManager?.CurrentRoomOwnerUid != null
                                    && (req.SceneIdentifier?.TeleportInfo == null
                                        || req.SceneIdentifier.TeleportInfo.TeleportId == 0);

        if (shouldLeaveSocialPlay)
        {
            var overMapReturn = await player.TrainCakeCatchManager!.ReturnToBookedSceneAsync(true);
            await connection.SendPacket(new PacketEnterSceneScRsp(overMapReturn, req.IsCloseMap, storyLineId,
                (uint)player.Data.FloorId));
            return;
        }

        var teleportId = req.TeleportId != 0 ? (int)req.TeleportId : 0;
        var sceneEntryId = (int)req.EntryId;
        if (isSocialPlayEnter)
        {
            player.TrainCakeCatchManager!.PrepareSocialPlayRoom(roomOwnerUid);

            // Social-play uses the room owner uid as an identifier, not a real map teleport id.
            // Private-server uids like 10001 can collide with actual teleport mapping ids, which
            // sends the player to the wrong anchor if we pass them through Player.EnterScene(...).
            teleportId = 0;

            // Once a social room is active, reuse its already-loaded entry so later greets/switches
            // land in the same scene instance instead of rebuilding a parallel copy of the room.
            if (socialSceneContext != null)
                sceneEntryId = socialSceneContext.EntryId;

            if (previousRoomOwnerUid.HasValue && previousRoomOwnerUid.Value != roomOwnerUid)
            {
                var leavePacket = new BasePacket(CmdIds.SocialPlayGameplayOperationScNotify);
                leavePacket.SetData(new SocialPlayGameplayOperationScNotify
                {
                    RoomOwnerUid = previousRoomOwnerUid.Value,
                    OpUid = (uint)player.Uid,
                    BJLCBAAKPDI = (uint)player.Uid
                });
                await connection.SendPacket(leavePacket);
            }

            if (isJoinedSocialEnter)
            {
                var gameplayTypePacket = new BasePacket(CmdIds.SocialPlayGameplayOperationScNotify);
                gameplayTypePacket.SetData(new SocialPlayGameplayOperationScNotify
                {
                    RoomOwnerUid = roomOwnerUid,
                    OpUid = (uint)player.Uid,
                    DLKOEIANIMK = player.TrainCakeCatchManager.GetGameplayType(roomOwnerUid, (uint)player.Uid)
                });
                await connection.SendPacket(gameplayTypePacket);
            }
            else if (isOwnerSocialEnter)
            {
                var arrivalHistoryNotify = player.TrainCakeCatchManager.BuildArrivalHistoryNotify(roomOwnerUid);
                if (arrivalHistoryNotify != null)
                {
                    var arrivalHistoryPacket = new BasePacket(CmdIds.SocialPlayGameplayOperationScNotify);
                    arrivalHistoryPacket.SetData(arrivalHistoryNotify);
                    await connection.SendPacket(arrivalHistoryPacket);
                }
            }

            await connection.SendPacket(new PacketTrainPartyBuildRoomScNotify(player));
        }

        var overMapTp = await player.EnterScene(sceneEntryId, teleportId, true,
            storyLineId, req.IsCloseMap);
        await connection.SendPacket(new PacketEnterSceneScRsp(overMapTp, req.IsCloseMap, storyLineId,
            (uint)player.Data.FloorId, isSocialPlayEnter ? roomOwnerUid : 0));

        await player.TrySendWelcomeAnnounce();

        if (!isSocialPlayEnter)
            return;

        var roomData = isOwnerSocialEnter
            ? await player.TrainCakeCatchManager!.AttachToSocialPlayRoomAsync(roomOwnerUid)
            : await player.TrainCakeCatchManager!.EnterSocialPlayRoomAsync(roomOwnerUid);

        var roomSnapshotPacket = new BasePacket(CmdIds.SocialPlayGameplayOperationScNotify);
        roomSnapshotPacket.SetData(new SocialPlayGameplayOperationScNotify
        {
            RoomOwnerUid = roomOwnerUid,
            OpUid = (uint)player.Uid,
            LABNNEGJNHO = roomData
        });
        player.TrainCakeCatchManager.UpdateCurrentRoomSceneContext();
        await connection.SendPacket(roomSnapshotPacket);

        // When the room owner greets a visitor, the existing visitor previously only received the
        // owner join notify. Send a refreshed room snapshot as well so the visitor's room state
        // upgrades from the placeholder-owner view to the fully attached owner view.
        if (isOwnerSocialEnter)
            await player.TrainCakeCatchManager.BroadcastRoomSnapshotAsync();

        foreach (var notify in player.TrainCakeCatchManager.BuildInitialRoomMoveNotifies(roomOwnerUid))
        {
            var roomMovePacket = new BasePacket(CmdIds.SocialPlayRoomPlayerMoveScNotify);
            roomMovePacket.SetData(notify);
            await connection.SendPacket(roomMovePacket);
        }
    }

    private static uint ResolveRoomOwnerUid(int playerUid, uint teleportId)
    {
        if (teleportId == 0)
            return (uint)playerUid;

        var serverProfileUid = (uint)ConfigManager.Config.ServerOption.ServerProfile.Uid;
        if (teleportId == serverProfileUid)
            // The shared server-profile uid is used like a social-play entry point in some flows.
            // Mapping it to the caller's own uid keeps the player in a stable self-room.
            return (uint)playerUid;

        return teleportId;
    }
}
