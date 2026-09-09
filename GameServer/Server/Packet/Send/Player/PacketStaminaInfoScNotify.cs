using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Player;

public class PacketStaminaInfoScNotify : BasePacket
{
    public PacketStaminaInfoScNotify(PlayerInstance player) : base(CmdIds.StaminaInfoScNotify)
    {
        var proto = new StaminaInfoScNotify
        {
            Stamina = (uint)player.Data.Stamina,
            ReserveStamina = (uint)player.Data.StaminaReserve,
            NextRecoverTime = player.Data.NextStaminaRecover
        };

        SetData(proto);
    }
}
