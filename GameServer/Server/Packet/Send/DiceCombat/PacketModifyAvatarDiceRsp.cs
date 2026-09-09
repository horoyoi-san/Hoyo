using March7thHoney.GameServer.Game.MultiPlayer.DiceCombat;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.DiceCombat;

public class PacketModifyAvatarDiceRsp : BasePacket
{
    public PacketModifyAvatarDiceRsp(DiceCombatActivityInstance instance, uint avatarId) : base(CmdIds.ModifyAvatarDiceRsp)
    {
        SetData(new ModifyAvatarDiceRsp
        {
            Retcode = 0,
            Avatar = instance.FindAvatar(avatarId) ?? new DiceCombatAvatar { DiceAvatarId = avatarId }
        });
    }
}
