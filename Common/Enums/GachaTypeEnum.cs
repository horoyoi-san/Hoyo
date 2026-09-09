namespace March7thHoney.Enums;

public enum GachaTypeEnum
{
    Unknown = 0,
    Newbie = 1,
    Normal = 2,
    AvatarUp = 11,
    WeaponUp = 12,

    // GachaBasicInfo.json ships two more pool types. Without them Newtonsoft throws on
    // "gachaType": "CollaborationAvatarUp" and the WHOLE Banners.json fails to deserialize, so the
    // client receives no banners at all - not even the standard one.
    CollaborationAvatarUp = 5,
    CollaborationWeaponUp = 6
}

public static class GachaTypeEnumExtensions
{
    public static int GetCostItemId(this GachaTypeEnum type)
    {
        return type switch
        {
            GachaTypeEnum.Newbie or GachaTypeEnum.Normal => 101,
            GachaTypeEnum.AvatarUp or GachaTypeEnum.WeaponUp or GachaTypeEnum.CollaborationAvatarUp
                or GachaTypeEnum.CollaborationWeaponUp => 102,
            _ => 0
        };
    }
}
