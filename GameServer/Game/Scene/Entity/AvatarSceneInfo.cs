using March7thHoney.Data;
using March7thHoney.Data.Config;
using March7thHoney.Data.Config.AdventureAbility;
using March7thHoney.Data.Config.Scene;
using March7thHoney.Data.Excel;
using March7thHoney.Database.Avatar;
using March7thHoney.Enums.Avatar;
using March7thHoney.Enums.Mission;
using March7thHoney.Enums.Scene;
using March7thHoney.GameServer.Game.Activity.Loaders;
using March7thHoney.GameServer.Game.Battle;
using March7thHoney.GameServer.Game.Mission;
using March7thHoney.GameServer.Game.Player;
using March7thHoney.GameServer.Game.Scene.Component;
using March7thHoney.GameServer.Game.Scene.Entity;
using March7thHoney.GameServer.Server.Packet.Send.Scene;
using March7thHoney.Proto;
using March7thHoney.Util;

namespace March7thHoney.GameServer.Game.Scene;

public class AvatarSceneInfo : BaseGameEntity, IGameModifier
{
    public AvatarSceneInfo(BaseAvatarInfo avatarInfo, AvatarType avatarType, PlayerInstance player)
    {
        AvatarInfo = avatarInfo;
        AvatarType = avatarType;
        Player = player;

        // initialize enter ability
        if (!GameData.AvatarConfigData.TryGetValue(avatarInfo.AvatarId, out var excel)) return;
        var configInfo = GameData.CharacterConfigInfoData.GetValueOrDefault(excel.AdventurePlayerID);
        if (configInfo == null) return;

        foreach (var info in configInfo.SkillList.Where(x => x.UseType == SkillUseTypeEnum.Passive))
        {
            if (!TryResolveAbility(excel.AdventurePlayerID, info.EntryAbility, out var avatarAbility, out var ability))
                continue;

            _ = Player.TaskManager!.AbilityLevelTask.TriggerTasks(avatarAbility, ability.OnStart, this, [],
                new SceneCastSkillCsReq());
        }
    }

    public BaseAvatarInfo AvatarInfo { get; set; }
    public AvatarType AvatarType { get; set; }
    public PlayerInstance Player { get; set; }

    public override int EntityId { get; set; }

    public override int GroupId { get; set; } = 0;

    public List<string> Modifiers { get; set; } = [];

    private static bool TryResolveAbility(int preferredAdventurePlayerId, string abilityName,
        out AdventureAbilityConfigListInfo abilityList, out AdventureAbilityConfigInfo ability)
    {
        if (GameData.AdventureAbilityConfigListData.TryGetValue(preferredAdventurePlayerId, out abilityList!))
        {
            ability = abilityList.AbilityList.FirstOrDefault(x => x.Name == abilityName)!;
            if (ability != null) return true;
        }

        foreach (var entry in GameData.AdventureAbilityConfigListData.OrderBy(x => x.Key))
        {
            ability = entry.Value.AbilityList.FirstOrDefault(x => x.Name == abilityName)!;
            if (ability == null) continue;

            abilityList = entry.Value;
            return true;
        }

        abilityList = null!;
        ability = null!;
        return false;
    }

    public bool TryResolveModifier(string modifierName, out AdventureAbilityConfigListInfo abilityList,
        out AdventureModifierConfig modifier)
    {
        var preferredAdventurePlayerId = AvatarInfo.AvatarId;
        if (GameData.AvatarConfigData.TryGetValue(AvatarInfo.AvatarId, out var avatarConfig))
            preferredAdventurePlayerId = avatarConfig.AdventurePlayerID;

        if (GameData.AdventureAbilityConfigListData.TryGetValue(preferredAdventurePlayerId, out abilityList!) &&
            abilityList.GlobalModifiers?.TryGetValue(modifierName, out modifier!) == true)
            return true;

        foreach (var entry in GameData.AdventureAbilityConfigListData.OrderBy(x => x.Key))
        {
            if (entry.Value.GlobalModifiers?.TryGetValue(modifierName, out modifier!) != true) continue;

            abilityList = entry.Value;
            return true;
        }

        abilityList = null!;
        modifier = null!;
        return false;
    }

    public async ValueTask AddModifier(string modifierName)
    {
        if (Modifiers.Contains(modifierName)) return;
        Modifiers.Add(modifierName);

        if (!TryResolveModifier(modifierName, out var avatarAbility, out var modifier)) return;

        await Player.TaskManager!.AbilityLevelTask.TriggerTasks(avatarAbility, modifier.OnCreate, this, [],
            new SceneCastSkillCsReq
            {
                TargetMotion = new MotionInfo
                {
                    Pos = Player.Data.Pos?.ToProto() ?? new Vector(),
                    Rot = Player.Data.Rot?.ToProto() ?? new Vector()
                }
            });

        await Player.TaskManager!.AbilityLevelTask.TriggerTasks(avatarAbility, modifier.OnStack, this, [],
            new SceneCastSkillCsReq
            {
                TargetMotion = new MotionInfo
                {
                    Pos = Player.Data.Pos?.ToProto() ?? new Vector(),
                    Rot = Player.Data.Rot?.ToProto() ?? new Vector()
                }
            });
    }

    public async ValueTask RemoveModifier(string modifierName)
    {
        if (!Modifiers.Contains(modifierName)) return;

        Modifiers.Remove(modifierName);
        if (!TryResolveModifier(modifierName, out var avatarAbility, out var modifier)) return;

        await Player.TaskManager!.AbilityLevelTask.TriggerTasks(avatarAbility, modifier.OnDestroy, this, [],
            new SceneCastSkillCsReq());
    }

    public override async ValueTask AddBuff(SceneBuff buff)
    {
        if (!GameData.MazeBuffData.TryGetValue(buff.BuffId * 10 + buff.BuffLevel, out var buffExcel)) return;

        var oldBuff = BuffList.Find(x => x.BuffId == buff.BuffId);
        if (oldBuff != null)
        {
            if (oldBuff.IsExpired())
            {
                BuffList.Remove(oldBuff);
            }
            else
            {
                oldBuff.CreatedTime = Extensions.GetUnixMs();
                oldBuff.Duration = buff.Duration;

                await Player.SendPacket(new PacketSyncEntityBuffChangeListScNotify(this, oldBuff));
                await AddModifier(buffExcel.ModifierName);
                return;
            }
        }

        BuffList.Add(buff);
        await Player.SendPacket(new PacketSyncEntityBuffChangeListScNotify(this, buff));
        await AddModifier(buffExcel.ModifierName);
    }

    public override async ValueTask ApplyBuff(BattleInstance instance)
    {
        if (BuffList.Count == 0) return;
        foreach (var buff in BuffList.Where(buff => !buff.IsExpired())) instance.Buffs.Add(new MazeBuff(buff));

        await Player.SendPacket(new PacketSyncEntityBuffChangeListScNotify(this, BuffList));

        foreach (var sceneBuff in BuffList)
        {
            if (!GameData.MazeBuffData.TryGetValue(sceneBuff.BuffId * 10 + sceneBuff.BuffLevel, out var buffExcel))
                continue;

            await RemoveModifier(buffExcel.ModifierName);
        }

        BuffList.Clear();
    }

    public override SceneEntityInfo ToProto()
    {
        return new SceneEntityInfo
        {
            EntityId = (uint)EntityId,
            Motion = new MotionInfo
            {
                Pos = Player.Data.Pos?.ToProto() ?? new Vector(),
                Rot = Player.Data.Rot?.ToProto() ?? new Vector()
            },
            Actor = new SceneActorInfo
            {
                BaseAvatarId = (uint)AvatarInfo.BaseAvatarId,
                AvatarType = AvatarType
            }
        };
    }

    public async ValueTask RemoveBuff(int buffId)
    {
        if (!GameData.MazeBuffData.TryGetValue(buffId * 10 + 1, out var buffExcel)) return;

        var buff = BuffList.Find(x => x.BuffId == buffId);
        if (buff == null) return;

        BuffList.Remove(buff);
        await Player.SendPacket(new PacketSyncEntityBuffChangeListScNotify(this, [buff]));

        await RemoveModifier(buffExcel.ModifierName);
    }

    public async ValueTask ClearAllBuff()
    {
        if (BuffList.Count == 0) return;
        await Player.SendPacket(new PacketSyncEntityBuffChangeListScNotify(this, BuffList));

        foreach (var sceneBuff in BuffList)
        {
            if (!GameData.MazeBuffData.TryGetValue(sceneBuff.BuffId * 10 + sceneBuff.BuffLevel, out var buffExcel))
                continue;

            await RemoveModifier(buffExcel.ModifierName);
        }

        BuffList.Clear();
    }

    public async ValueTask OnDestroyInstance()
    {
        foreach (var modifier in Modifiers.ToArray()) await RemoveModifier(modifier);

        foreach (var monsterInfo in Player.SceneInstance!.Entities.Values.OfType<EntityMonster>().ToArray())
        foreach (var buff in monsterInfo.BuffList.Where(x => x.OwnerAvatarId == AvatarInfo.BaseAvatarId).ToArray())
            await monsterInfo.RemoveBuff(buff.BuffId);
    }
}
