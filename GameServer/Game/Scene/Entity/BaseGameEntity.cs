using March7thHoney.GameServer.Game.Battle;
using March7thHoney.Proto;

namespace March7thHoney.GameServer.Game.Scene.Entity;

public abstract class BaseGameEntity
{
    public abstract int EntityId { get; set; }
    public abstract int GroupId { get; set; }

    public List<SceneBuff> BuffList { get; set; } = [];

    public virtual ValueTask AddBuff(SceneBuff buff)
    {
        return ValueTask.CompletedTask;
    }

    public virtual ValueTask ApplyBuff(BattleInstance instance)
    {
        return ValueTask.CompletedTask;
    }


    public abstract SceneEntityInfo ToProto();
}
