using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Lineup;

public class PacketGetLineupAvatarDataScRsp : BasePacket
{
    public PacketGetLineupAvatarDataScRsp(PlayerInstance player) : base(CmdIds.GetLineupAvatarDataScRsp)
    {
        var rsp = new GetLineupAvatarDataScRsp();

        player.AvatarManager?.Data?.FormalAvatars?.ForEach(avatar =>
        {
            var data = new LineupAvatarData
            {
                Id = (uint)avatar.AvatarId,
                Hp = (uint)avatar.CurrentHp,
                AvatarType = AvatarType.AvatarFormalType
            };
            rsp.AvatarDataList.Add(data);
        });

        SetData(rsp);
    }
}
