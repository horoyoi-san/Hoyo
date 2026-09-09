using System.Text;
using March7thHoney.Data;
using March7thHoney.Data.Custom;
using March7thHoney.Enums.TournRogue;
using March7thHoney.Util;
using Newtonsoft.Json;

namespace March7thHoney.Program.Generator;

public static class TournRoomGenerator
{
    public static List<int> AllowedFloorIdList { get; set; } = [80601001, 80602001, 80603001, 80604001];
    public static List<RogueTournRoomConfig> SavedRoomInstanceList { get; set; } = [];

    #region Prefix

    public static Dictionary<RogueTournRoomTypeEnum, List<int>> RoomPrefix { get; set; } = new()
    {
        { RogueTournRoomTypeEnum.Battle, [0, 120300000, 1120300000] },
        { RogueTournRoomTypeEnum.Event, [620500000, 320500000, 1120500000] },
        { RogueTournRoomTypeEnum.Encounter, [420400000, 120400000, 0] },
        { RogueTournRoomTypeEnum.Reward, [420800000, 120800000, 0] },
        { RogueTournRoomTypeEnum.Coin, [620600000, 0, 0] }  // 20
    };

    public static Dictionary<RogueTournRoomTypeEnum, List<int>> RoomFloorDiffPrefix { get; set; } = new()
    {
        { RogueTournRoomTypeEnum.Boss, [320100000, 320100000, 220100000, 220100000] },
        { RogueTournRoomTypeEnum.Respite, [321000000, 321000000, 221000000, 221000000] },  // 20
        { RogueTournRoomTypeEnum.Elite, [320200000, 320200000, 220200000, 220200000] },
        { RogueTournRoomTypeEnum.Shop, [320700000, 320700000, 220700000, 220700000] }  // 20
    };

    #endregion
    public static void GenerateFile(string path)
    {
        // get floor info
        foreach (var floorId in AllowedFloorIdList)
        {
            var areaGroupId = 0;
            var baseModuleId = 0;
            var roomType = RogueTournRoomTypeEnum.Unknown;
            var isCommon = false;
            Dictionary<RogueTournRoomTypeEnum, List<int>> contentGroupId = [];

            var info = GameData.FloorInfoData.Values.First(x => x.FloorID == floorId);
            foreach (var groupInfo in info.GroupInstanceList.Where(x =>
                         !x.IsDelete && x.Name.Contains("RogueModule_Tournament") && !x.Name.Contains("Tpl_")))
            {
                if (groupInfo.Name.Contains("_Area"))
                {
                    if (areaGroupId > 0 && baseModuleId > 0 && contentGroupId.Count > 0)
                        foreach (var group in contentGroupId)
                            FlushRoom(GameData.MapEntranceData.First(x => x.Value.FloorID == floorId).Key, floorId, areaGroupId,
                                baseModuleId, group.Value, group.Key);

                    contentGroupId.Clear();

                    areaGroupId = groupInfo.ID;
                    continue;
                }

                if (groupInfo.Name.Contains("_Base"))
                {
                    if (areaGroupId > 0 && baseModuleId > 0 && contentGroupId.Count > 0)
                        foreach (var group in contentGroupId)
                            FlushRoom(GameData.MapEntranceData.First(x => x.Value.FloorID == floorId).Key, floorId, areaGroupId,
                                baseModuleId, group.Value, group.Key);

                    contentGroupId.Clear();

                    baseModuleId = groupInfo.ID;
                    isCommon = false;
                    if (groupInfo.Name.Contains("_Common"))
                        isCommon = true;
                    else if (groupInfo.Name.Contains("_Boss"))
                        roomType = RogueTournRoomTypeEnum.Boss;
                    else if (groupInfo.Name.Contains("_Elite"))
                        roomType = RogueTournRoomTypeEnum.Elite;
                    else if (groupInfo.Name.Contains("_Shop"))
                        roomType = RogueTournRoomTypeEnum.Shop;
                    else if (groupInfo.Name.Contains("_Rest"))
                        roomType = RogueTournRoomTypeEnum.Respite;
                    else if (groupInfo.Name.Contains("_Adventure"))
                        roomType = RogueTournRoomTypeEnum.Adventure;
                    else if (groupInfo.Name.Contains("_Secret"))
                        roomType = RogueTournRoomTypeEnum.Hidden;

                    continue;
                }

                if (areaGroupId == 0 || baseModuleId == 0) continue;

                if (isCommon)
                {
                    // contain Battle Event Coin
                    if (groupInfo.Name.Contains("Monster"))
                    {
                        contentGroupId.TryAdd(RogueTournRoomTypeEnum.Battle, []);
                        contentGroupId[RogueTournRoomTypeEnum.Battle].Add(groupInfo.ID);
                    }
                    else if (groupInfo.Name.Contains("Event"))
                    {
                        contentGroupId.TryAdd(RogueTournRoomTypeEnum.Event, []);
                        contentGroupId[RogueTournRoomTypeEnum.Event].Add(groupInfo.ID);
                    }
                    else if (groupInfo.Name.Contains("Coin"))
                    {
                        contentGroupId.TryAdd(RogueTournRoomTypeEnum.Coin, []);
                        contentGroupId[RogueTournRoomTypeEnum.Coin].Add(groupInfo.ID);
                    }
                }
                else
                {
                    contentGroupId.TryAdd(roomType, []);
                    contentGroupId[roomType].Add(groupInfo.ID);
                }
            }
        }

        // clear old file
        if (File.Exists(path))
            File.WriteAllText(path, "", Encoding.UTF8);

        // save
        File.AppendAllText(path, JsonConvert.SerializeObject(SavedRoomInstanceList, Formatting.Indented),
            Encoding.UTF8);

        // log
        Logger.GetByClassName().Info($"Generated in {path} Successfully!");
    }

    public static void FlushRoom(int entranceId, int floorId, int areaGroupId, int baseGroupId, List<int> contentGroupIds,
        RogueTournRoomTypeEnum type)
    {
        var prefix = RoomPrefix.GetValueOrDefault(type)?.LastOrDefault(x => x != 0);
        if (prefix == null)
            prefix = RoomFloorDiffPrefix.GetValueOrDefault(type)?[AllowedFloorIdList.IndexOf(floorId)];

        var entryIdSuffix = entranceId % 1000;
        var roomId = prefix + entryIdSuffix * 100 + 20;
        if (roomId == null)
        {
            roomId = 0;
            Logger.GetByClassName().Error(
                $"Cannot find prefix for RoomType {type} at Floor {floorId} (EntranceId {entranceId})");
        } 

        SavedRoomInstanceList.Add(new RogueTournRoomConfig
        {
            AnchorGroup = baseGroupId,
            AnchorId = 1,
            DefaultLoadBasicGroup = { areaGroupId, baseGroupId },
            DefaultLoadGroup = contentGroupIds,
            EntranceId = entranceId,
            RoomType = type,
            //RoomId = (uint)roomId
        });
    }
}