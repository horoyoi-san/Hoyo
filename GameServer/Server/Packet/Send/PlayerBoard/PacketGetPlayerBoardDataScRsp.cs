using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.PlayerBoard;

public class PacketGetPlayerBoardDataScRsp : BasePacket
{
    public PacketGetPlayerBoardDataScRsp(PlayerInstance player) : base(CmdIds.GetPlayerBoardDataScRsp)
    {
        var proto = new GetPlayerBoardDataScRsp
        {
            Signature = player.Data.Signature,
            CurrentHeadIconId = (uint)player.Data.HeadIcon,
            CurrentPersonalCardId = (uint)player.Data.PersonalCard,
            UnlockedPersonalCardList = { player.PlayerUnlockData!.PersonalCards.Select(x => (uint)x) },
            UnlockedHeadIconList =
                { player.PlayerUnlockData!.HeadIcons.Select(x => new HeadIconData { Id = (uint)x }) },
            AssistAvatarIdList = { player.AvatarManager!.Data.AssistAvatars.Select(x => (uint)x) },
            DisplayAvatarVec = new DisplayAvatarVec(),
            HeadFrameInfo = player.Data.HeadFrame.ToProto()
        };

        var pos = 0;
        player.AvatarManager?.Data!.DisplayAvatars.ForEach(avatar =>
        {
            proto.DisplayAvatarVec.DisplayAvatarList.Add(new DisplayAvatarData
            {
                AvatarId = (uint)avatar,
                Pos = (uint)pos++
            });
        });

        SetData(proto);
    }
}
