using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketGetBasicInfoScRsp : BasePacket
{
    public PacketGetBasicInfoScRsp(PlayerInstance player) : base(CmdIds.GetBasicInfoScRsp)
    {
        var proto = new GetBasicInfoScRsp
        {
            CurDay = 1,
            NextRecoverTime = player.Data.NextStaminaRecover / 1000,
            GameplayBirthday = (uint)player.Data.Birthday,
            PlayerSettingInfo = player.Data.PrivacySettings.ToSettingProto(),
            Gender = (uint)player.Data.CurrentGender
        };

        if (player.MissionEnabled)
        {
            if (player.AvatarManager!.GetHero()!.PathInfos.Count > 0) player.Data.IsGenderSet = true;
            proto.Gender = (uint)player.Data.CurrentGender;
            proto.IsGenderSet = player.Data.IsGenderSet;
        }
        else
        {
            proto.Gender = (uint)player.Data.CurrentGender;
            proto.IsGenderSet = true;
        }

        SetData(proto);
    }
}
