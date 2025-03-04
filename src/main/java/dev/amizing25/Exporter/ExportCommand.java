package dev.amizing25.Exporter;

import emu.lunarcore.command.Command;
import emu.lunarcore.command.CommandArgs;
import emu.lunarcore.command.CommandHandler;
import emu.lunarcore.data.GameData;
import emu.lunarcore.game.avatar.GameAvatar;
import emu.lunarcore.game.enums.ItemMainType;
import emu.lunarcore.game.player.Player;
import emu.lunarcore.util.FileUtils;
import emu.lunarcore.util.JsonUtils;
import emu.lunarcore.game.inventory.GameItem;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

@Command(
    label = "json-export", 
    permission = "player.export",
    requireTarget = true,
    desc = "/json-export [filename] - export data to a srtools JSON file"
)
public class ExportCommand implements CommandHandler {
    
    @Override
    public void execute(CommandArgs args) {
        Player player = args.getTarget();
        JsonData data = generateJsonFromPlayer(player);
        
        // default filename
        String fileName = args.get(0);
        if (fileName == null || fileName.isEmpty()) {
            fileName = "freesr-data";
        }
        if (!fileName.endsWith(".json")) {
            fileName += ".json";
        }
        
        try {
            String json = JsonUtils.encode(data);
            FileUtils.write("./data/" + fileName, json.getBytes());
            player.sendMessage("Successfully exported data to " + fileName);
        } catch (Exception e) {
            player.sendMessage("Failed to export data: " + e.getMessage());
        }
    }

    private JsonData generateJsonFromPlayer(Player player) {
        var data = new JsonData();

        // order by avatar_id
        data.avatars = player.getAvatars().getAvatars().values().stream()
            .sorted(Comparator.comparingInt(GameAvatar::getAvatarId))
            .collect(Collectors.toMap(
                avatar -> avatar.getAvatarId(),
                avatar -> {
                    var avatarJson = new JsonData.AvatarJson();
                    avatarJson.avatar_id = avatar.getAvatarId();
                    avatarJson.level = avatar.getLevel();
                    avatarJson.promotion = avatar.getPromotion();
                    
                    var extraData = new JsonData.AvatarJson.AvatarJsonExtraData();
                    extraData.rank = avatar.getRank();
                    extraData.skills = avatar.getSkills().entrySet().stream()
                        .sorted(Map.Entry.comparingByKey())
                        .collect(Collectors.toMap(
                            Map.Entry::getKey,
                            Map.Entry::getValue,
                            (oldValue, newValue) -> oldValue,
                            LinkedHashMap::new
                        ));
                    
                    avatarJson.data = extraData;
                    return avatarJson;
                },
                (oldValue, newValue) -> oldValue,
                LinkedHashMap::new
            ));

        // modify lightcone export part
        List<JsonData.LightconeJson> equippedLightcones = new ArrayList<>();
        List<JsonData.LightconeJson> unequippedLightcones = new ArrayList<>();

        // order by avatar_id
        data.avatars.keySet().forEach(avatarId -> {
            player.getAvatars().getAvatars().values().stream()
                .filter(avatar -> avatar.getAvatarId() == avatarId)
                .findFirst()
                .ifPresent(avatar -> {
                    GameItem equipment = avatar.getEquipment();
                    if (equipment != null) {
                        var lightcone = createLightconeJson(equipment);
                        lightcone.equip_avatar = avatarId;
                        equippedLightcones.add(lightcone);
                    }
                });
        });

        // collect unequipped lightcones and order by item_id
        StreamSupport.stream(player.getInventory().getTabByItemType(ItemMainType.Equipment).spliterator(), false)
            .filter(item -> !item.isEquipped())
            .sorted(Comparator.comparingInt(GameItem::getItemId))
            .map(this::createLightconeJson)
            .forEach(unequippedLightcones::add);

        data.lightcones = new ArrayList<>();
        data.lightcones.addAll(equippedLightcones);
        data.lightcones.addAll(unequippedLightcones);

        // export relics and order by relic_id
        data.relics = StreamSupport.stream(player.getInventory().getTabByItemType(ItemMainType.Relic).spliterator(), false)
            .sorted(Comparator.comparingInt(GameItem::getItemId))
            .map(item -> {
                var relic = new JsonData.RelicJson();
                relic.relic_id = item.getItemId();
                relic.internal_uid = item.getInternalUid();
                relic.level = item.getLevel();
                relic.main_affix_id = item.getMainAffix();
                relic.relic_set_id = GameData.getRelicSetFromId(item.getItemId());
                
                // ObjectId Find AvatarId
                relic.equip_avatar = 0;
                if (item.getEquipAvatarId() != null) {
                    for (GameAvatar avatar : player.getAvatars().getAvatars().values()) {
                        if (avatar.getId().equals(item.getEquipAvatarId())) {
                            relic.equip_avatar = avatar.getAvatarId();
                            break;
                        }
                    }
                }

                relic.sub_affixes = item.getSubAffixes().stream()
                    .map(subAffix -> {
                        var sub = new JsonData.RelicJson.RelicSubAffixData();
                        sub.sub_affix_id = subAffix.getId();
                        sub.count = subAffix.getCount();
                        sub.step = subAffix.getStep();
                        return sub;
                    })
                    .collect(Collectors.toList());
                
                return relic;
            })
            .collect(Collectors.toList());

        return data;
    }

    private JsonData.LightconeJson createLightconeJson(GameItem item) {
        var lightcone = new JsonData.LightconeJson();
        lightcone.item_id = item.getItemId();
        lightcone.internal_uid = item.getInternalUid();
        lightcone.level = item.getLevel();
        lightcone.rank = item.getRank();
        lightcone.promotion = item.getPromotion();
        
        return lightcone;
    }

    // Json Data
    public static class JsonData {
        public Map<Integer, AvatarJson> avatars = new LinkedHashMap<>();
        public List<LightconeJson> lightcones = new ArrayList<>();
        public List<RelicJson> relics = new ArrayList<>();
        
        public static class RelicJson {
            public int level;
            public int relic_id;
            public int relic_set_id;
            public int main_affix_id;
            public int internal_uid;
            public int equip_avatar;
            public List<RelicSubAffixData> sub_affixes;
            
            public static class RelicSubAffixData {
                public int sub_affix_id;
                public int count;
                public int step;
            }
        }
        
        public static class LightconeJson {
            public int level;
            public int internal_uid;
            public int equip_avatar;
            public int item_id;
            public int rank;
            public int promotion;
        }
        
        public static class AvatarJson {
            public int avatar_id;
            public int level;
            public int promotion;
            public AvatarJsonExtraData data;
            
            public static class AvatarJsonExtraData {
                public int rank;
                public LinkedHashMap<Integer, Integer> skills = new LinkedHashMap<>();
            }
        }
        
        public static int getPromotion(int level) {
            return  level > 80 ?
                6 :
                (int) (level <= 20
                    ? 0 :
                    Math.ceil((double) level / 10) - 2);
        }
    }
}

