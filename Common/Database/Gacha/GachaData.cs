using MemoryPack;
using March7thHoney.Enums;

namespace March7thHoney.Database.Gacha;

[DbTable("Gacha")]
public class GachaData : BaseDatabaseDataHelper
{
    public List<GachaInfo> GachaHistory { get; set; } = [];

    // Deprecated legacy fields. Keep them around so older databases can migrate
    // their best-effort pity state into PityStates.
    public bool LastAvatarGachaFailed { get; set; } = false;
    public bool LastWeaponGachaFailed { get; set; } = false;
    public int LastGachaFailedCount { get; set; } = 0;
    public int LastGachaPurpleFailedCount { get; set; } = 0;

    public List<int> GachaDecideOrder { get; set; } = [];
    public List<int> CharacterEventNonFeaturedPool { get; set; } = [];
    public int CharacterEventDecideItemType { get; set; } = 1;
    public Dictionary<string, GachaPityState> PityStates { get; set; } = [];

    public GachaPityState GetPityState(GachaPityFamilyEnum family)
    {
        PityStates ??= [];
        var key = ((int)family).ToString();
        if (!PityStates.TryGetValue(key, out var state))
        {
            state = new GachaPityState();
            PityStates[key] = state;
        }

        return state;
    }

    public void EnsurePityStateMigrated()
    {
        PityStates ??= [];
        if (PityStates.Count > 0) return;

        PityStates[((int)GachaPityFamilyEnum.AvatarUp).ToString()] = new GachaPityState
        {
            PullsSinceFiveStar = Math.Max(0, LastGachaFailedCount),
            PullsSinceFourStarOrHigher = Math.Max(0, LastGachaPurpleFailedCount),
            NextFiveStarGuaranteedFeatured = LastAvatarGachaFailed
        };

        PityStates[((int)GachaPityFamilyEnum.WeaponUp).ToString()] = new GachaPityState
        {
            PullsSinceFiveStar = Math.Max(0, LastGachaFailedCount),
            PullsSinceFourStarOrHigher = Math.Max(0, LastGachaPurpleFailedCount),
            NextFiveStarGuaranteedFeatured = LastWeaponGachaFailed
        };

        PityStates[((int)GachaPityFamilyEnum.Normal).ToString()] = new GachaPityState();
        PityStates[((int)GachaPityFamilyEnum.Newbie).ToString()] = new GachaPityState();
    }
}

[MemoryPackable]
public partial class GachaInfo
{
    public int GachaId { get; set; }
    public long Time { get; set; }
    public int ItemId { get; set; }
}

[MemoryPackable]
public partial class GachaPityState
{
    public int PullsSinceFiveStar { get; set; }
    public int PullsSinceFourStarOrHigher { get; set; }
    public bool NextFiveStarGuaranteedFeatured { get; set; }
    public bool NextFourStarGuaranteedFeatured { get; set; }
    public int TotalPulls { get; set; }
    public bool NewbieFiveStarClaimed { get; set; }

    public void RecordFiveStar()
    {
        PullsSinceFiveStar = 0;
        PullsSinceFourStarOrHigher = 0;
        TotalPulls++;
    }

    public void RecordFourStar()
    {
        PullsSinceFiveStar++;
        PullsSinceFourStarOrHigher = 0;
        TotalPulls++;
    }

    public void RecordThreeStar()
    {
        PullsSinceFiveStar++;
        PullsSinceFourStarOrHigher++;
        TotalPulls++;
    }
}
