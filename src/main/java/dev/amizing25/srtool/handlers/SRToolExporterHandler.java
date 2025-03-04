package dev.amizing25.srtool.handlers;

import dev.amizing25.srtool.objects.SRToolData;
import dev.amizing25.srtool.objects.SRToolDataRsp;
import emu.lunarcore.LunarCore;
import emu.lunarcore.game.avatar.GameAvatar;
import emu.lunarcore.game.enums.ItemMainType;
import emu.lunarcore.game.inventory.GameItem;
import emu.lunarcore.game.player.Player;
import emu.lunarcore.util.JsonUtils;
import io.javalin.http.Context;
import io.javalin.http.Handler;
import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.Objects;

import static java.lang.Integer.parseInt;

public class SRToolExporterHandler implements Handler {
    @Override
    public void handle(@NotNull Context ctx) throws Exception {
        int uid = 0;
        try {
            uid = parseInt(Objects.requireNonNull(ctx.queryParam("uid")));
        } catch (Exception ignored) {
        }

        SRToolDataRsp rsp = new SRToolDataRsp();

        if (uid == 0) {
            rsp.setStatus(400);
            rsp.setMessage("uid query param is missing");
            ctx.status(400);
            ctx.result(JsonUtils.encode(rsp));
            return;
        }

        Player player = LunarCore.getGameServer().getPlayerByUid(uid, true);
        if (player == null) {
            rsp.setStatus(401);
            rsp.setMessage("player with uid: " + uid + " not found on the server");
            ctx.status(401);
            ctx.result(JsonUtils.encode(rsp));
            return;
        }

        try {
            ctx.header("Content-Type", "application/json");
            ctx.header("Content-Disposition", "attachment; filename=freesr-data.json");
            ctx.result(JsonUtils.encode(exportData(player)));
        } catch (Exception e) {
            LunarCore.getLogger().error("[SRToolExporterHandler] Failed to export data");
            e.printStackTrace();
            rsp.setMessage("Internal Server Error");
            rsp.setStatus(500);
            ctx.status(500);
            ctx.result(JsonUtils.encode(rsp));
        }
    }

    private static SRToolData exportData(Player player) {
        var avatars = new HashMap<Integer, SRToolData.AvatarData>();
        var relics = new LinkedList<SRToolData.RelicData>();
        var lightcones = new LinkedList<SRToolData.LightconeData>();

        for (var avatar : player.getAvatars()) {
            SRToolData.AvatarData avatarData = new SRToolData.AvatarData();
            var inner = new SRToolData.AvatarInnerData();
            inner.setRank(avatar.getRank());
            inner.setSkills(avatar.getSkills());

            avatarData.setData(inner);
            avatarData.setAvatarID(avatar.getAvatarId());
            avatarData.setLevel(avatar.getLevel());
            avatarData.setPromotion(avatar.getPromotion());
            avatarData.setSpValue(avatar.getMaxSp() / 2);
            avatarData.setSpMax(avatar.getMaxSp());
            avatarData.setTechniques(new ArrayList<>());

            avatars.put(avatar.getAvatarId(), avatarData);
        }

        for (var item : player.getInventory().getItems().values()) {
            if (item.getItemMainType() != ItemMainType.Equipment && item.getItemMainType() != ItemMainType.Relic) {
                continue;
            }
            if (item.getItemMainType() == ItemMainType.Equipment) {
                SRToolData.LightconeData lightconeData = getLightconeData(player, item);
                lightcones.add(lightconeData);
            } else {
                SRToolData.RelicData relicData = getRelicData(player, item);
                if (relicData != null) {
                    relics.add(relicData);
                }
            }
        }

        SRToolData data = new SRToolData();
        data.setLightcones(lightcones);
        data.setRelics(relics);
        data.setAvatars(avatars);
        data.setBattleConfig(getDefaultBattleConfig());

        return data;
    }

    private static SRToolData.LightconeData getLightconeData(Player player, GameItem item) {
        SRToolData.LightconeData lightconeData = new SRToolData.LightconeData();
        lightconeData.setInternalUID(item.getInternalUid());
        lightconeData.setLevel(item.getLevel());
        try {
            if (item.getEquipAvatarId() != null) {
                for (GameAvatar avatar : player.getAvatars().getAvatars().values()) {
                    if (avatar.getId().equals(item.getEquipAvatarId())) {
                        lightconeData.setEquipAvatar(avatar.getAvatarId());
                        break;
                    }
                }
            }
        } catch (Exception ignored) {
        }
        lightconeData.setItemID(item.getItemId());
        lightconeData.setRank(item.getRank());
        lightconeData.setPromotion(item.getPromotion());
        return lightconeData;
    }

    private static SRToolData.RelicData getRelicData(Player player, GameItem item) {
        SRToolData.RelicData relicData = new SRToolData.RelicData();

        relicData.setLevel(item.getLevel());
        try {
            relicData.setRelicID(item.getExcel().getRelicExcel().getId());
            relicData.setRelicSetID(item.getExcel().getRelicExcel().getSetId());
        } catch (Exception ignored) {
            return null;
        }
        relicData.setMainAffixID(item.getMainAffix());
        relicData.setInternalUID(item.getInternalUid());
        try {
            if (item.getEquipAvatarId() != null) {
                for (GameAvatar avatar : player.getAvatars().getAvatars().values()) {
                    if (avatar.getId().equals(item.getEquipAvatarId())) {
                        relicData.setEquipAvatar(avatar.getAvatarId());
                        break;
                    }
                }
            }
        } catch (Exception ignored) {
        }

        var subAffixes = new ArrayList<SRToolData.RelicSubAffixData>();
        for (var subAffix : item.getSubAffixes()) {
            SRToolData.RelicSubAffixData subAffixData = new SRToolData.RelicSubAffixData();
            subAffixData.setSubAffixId(subAffix.getId());
            subAffixData.setStep(subAffix.getStep());
            subAffixData.setCount(subAffix.getCount());

            subAffixes.add(subAffixData);
        }
        relicData.setSubAffixes(subAffixes);

        return relicData;
    }

    private static SRToolData.BattleConfigData getDefaultBattleConfig() {
        SRToolData.BattleConfigData battleConfig = new SRToolData.BattleConfigData();

        battleConfig.setBattleType("MOC");
        battleConfig.setCycleCount(30);
        battleConfig.setStageID(30107121);
        battleConfig.setBlessings(new SRToolData.BlessingData[] {});
        battleConfig.setCustomStats(new SRToolData.RelicSubAffixData[] {});
        battleConfig.setMonsters(new SRToolData.MonsterData[][]{
                {
                        new SRToolData.MonsterData(95, 2033010, 0),
                        new SRToolData.MonsterData(95, 8013010, 0),
                        new SRToolData.MonsterData(95, 2032020, 0),
                },
                {
                        new SRToolData.MonsterData(95, 200401007, 0),
                        new SRToolData.MonsterData(95, 2033010, 0),
                }
        });


        return battleConfig;
    }
}
