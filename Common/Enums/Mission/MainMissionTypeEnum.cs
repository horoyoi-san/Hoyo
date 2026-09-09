namespace March7thHoney.Enums.Mission;

/// <summary>
///     MainMission.json "Type" column. Unknown / absent values deserialize to <see cref="Unknown" />
///     (which is also what an older Resource.bin without the column restores to), so every consumer
///     must treat Unknown as "no information" and fall back to the pre-existing behaviour.
/// </summary>
public enum MainMissionTypeEnum
{
    Unknown = 0,
    Main,
    Branch,
    Gap,
    Daily,
    Companion
}
