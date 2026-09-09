using March7thHoney.GameServer.Game.MultiPlayer.DiceCombat;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.DiceCombat;

public class PacketUpgradeAvatarRsp : BasePacket
{
    public PacketUpgradeAvatarRsp(DiceCombatActivityInstance instance, uint avatarId) : base(CmdIds.UpgradeAvatarRsp)
    {
        SetData(new UpgradeAvatarRsp
        {
            Retcode = 0,
            Avatar = instance.FindAvatar(avatarId) ?? new DiceCombatAvatar { DiceAvatarId = avatarId }
        });
    }
}
