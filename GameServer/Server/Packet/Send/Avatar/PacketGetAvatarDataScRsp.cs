using March7thHoney.Data;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.Kcp;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Server.Packet.Send.Avatar;

public class PacketGetAvatarDataScRsp : BasePacket
{
    public PacketGetAvatarDataScRsp(PlayerInstance player) : base(CmdIds.GetAvatarDataScRsp)
    {
        var proto = new GetAvatarDataScRsp
        {
            DHKFCDAGHDM = player.Data.ToPlayerOutfitProto(),
            IsGetAll = true
        };

        player.PlayerUnlockData!.Skins.Values.ToList().ForEach(skin =>
            proto.SkinList.AddRange(skin.Select(x => (uint)x)));

        var basicTypeIds = new HashSet<uint>();

        foreach (var avatar in player.AvatarManager?.Data?.FormalAvatars ?? Enumerable.Empty<March7thHoney.Database.Avatar.FormalAvatarInfo>())
        {
            proto.AvatarList.Add(avatar.ToProto());
            var pathProtos = avatar.ToAvatarPathDataProto();
            proto.AvatarPathDataInfoList.AddRange(pathProtos);

            foreach (var path in pathProtos)
                if (GameData.MultiplePathAvatarConfigData.ContainsKey((int)path.AvatarId))
                    basicTypeIds.Add(path.AvatarId);
        }

        proto.BasicTypeIdList.AddRange(basicTypeIds);

        SetData(proto);
    }
}

