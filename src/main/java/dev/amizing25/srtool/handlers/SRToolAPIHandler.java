package dev.amizing25.srtool.handlers;

import dev.amizing25.srtool.SRToolPlugin;
import dev.amizing25.srtool.objects.SRToolDataReq;
import dev.amizing25.srtool.objects.SRToolDataRsp;
import emu.lunarcore.GameConstants;
import emu.lunarcore.LunarCore;
import emu.lunarcore.data.GameData;
import emu.lunarcore.game.account.Account;
import emu.lunarcore.game.avatar.GameAvatar;
import emu.lunarcore.game.enums.ItemMainType;
import emu.lunarcore.game.inventory.GameItem;
import emu.lunarcore.game.inventory.GameItemSubAffix;
import emu.lunarcore.game.player.Player;
import emu.lunarcore.server.packet.send.PacketPlayerSyncScNotify;
import emu.lunarcore.util.JsonUtils;
import io.javalin.http.Context;
import io.javalin.http.Handler;
import org.jetbrains.annotations.NotNull;

import java.lang.reflect.Constructor;
import java.lang.reflect.Method;
import java.util.LinkedList;
import java.util.Objects;

public class SRToolAPIHandler implements Handler {
    @Override
    public void handle(@NotNull Context ctx) throws Exception {
        SRToolDataReq req;
        SRToolDataRsp rsp = new SRToolDataRsp();

        try {
            req = JsonUtils.decode(ctx.body(), SRToolDataReq.class);
        } catch (Exception e) {
            LunarCore.getLogger().error("[SRToolAPIHandler] JSON Parse failed, reason {}", e.getMessage());
            rsp.setStatus(500);
            rsp.setMessage("Internal Server Error");
            ctx.status(500);
            ctx.result(JsonUtils.encode(rsp));
            return;
        }

        if (req == null) {
            rsp.setStatus(400);
            rsp.setMessage("malformed body");
            ctx.status(400);
            ctx.result(JsonUtils.encode(rsp));
            return;
        }

        if (req.getData() == null) {
            rsp.setStatus(200);
            rsp.setMessage("OK");
            ctx.result(JsonUtils.encode(rsp));
            return;
        }

        Account account = LunarCore.getAccountDatabase().getObjectByField(Account.class, "username", req.getUsername());
        if (account == null) {
            rsp.setStatus(401);
            rsp.setMessage("username not found on server " + req.getUsername());
            ctx.status(401);
            ctx.result(JsonUtils.encode(rsp));
            return;
        }

        Player player = LunarCore.getGameServer().getOnlinePlayerByAccountId(account.getUid());
        if (player == null) {
            rsp.setStatus(400);
            rsp.setMessage("player is offline " + req.getUsername());
            ctx.status(400);
            ctx.result(JsonUtils.encode(rsp));
            return;
        }

        // This is not an efficient method, as it requires heavy computation on the server, especially when serving a large number of users.
        try {
            this.clearInventory(player);

            player.sendMessage("Inventory cleared!");

            // Set Avatar
            var changed = new LinkedList<GameAvatar>();

            // add avatar that we don't have
            for (var newAvatar : req.getData().getAvatars().values()) {
                var avatar = getAvatarById(player, newAvatar.getAvatarID());
                if (avatar == null) {
                    var excel = GameData.getAvatarExcelMap().get(newAvatar.getAvatarID());
                    if (excel == null) {
                        player.sendMessage("Avatar with id " + newAvatar.getAvatarID() + " is not found on excel ");
                        continue;
                    }
                    avatar = new GameAvatar(excel);
                    if (avatar.getExcel() == null) continue;
                    player.addAvatar(avatar);
                }
            }

            // set avatar properties
            for (var newAvatar : req.getData().getAvatars().values()) {
                var avatar = getAvatarById(player, newAvatar.getAvatarID());
                if (avatar == null) continue;
                avatar.setLevel(newAvatar.getLevel());
                avatar.setRank(newAvatar.getData().getRank());
                avatar.setPromotion(newAvatar.getPromotion());
                avatar.getSkills().clear();
                for (var entry : newAvatar.getData().getSkills().entrySet()) {
                    avatar.getSkills().put(entry.getKey(), entry.getValue());
                }
                avatar.save();
                changed.push(avatar);
            }

            // sync avatar
            player.sendPacket(createPacketPlayerSyncScNotify((Object) changed.toArray(GameAvatar[]::new)));

            // Add New Relics
            for (var relic : req.getData().getRelics()) {
                var item = new GameItem(relic.getRelicID());
                if (item.getExcel() == null) continue;
                item.setLevel(relic.getLevel());
                item.setMainAffix(relic.getMainAffixID());
                item.resetSubAffixes();

                for (var newSubAffix : relic.getSubAffixes()) {
                    var excel = GameData.getRelicSubAffixExcel(item.getExcel().getRarityNum(), newSubAffix.getSubAffixId());
                    if (excel == null) {
                        continue;
                    }
                    var subAffix = new GameItemSubAffix(excel);
                    subAffix.setCount(newSubAffix.getCount());
                    subAffix.setStep(newSubAffix.getStep());
                    item.getSubAffixes().add(subAffix);
                }

                player.getInventory().addItem(item);

                var avatar = getAvatarById(player, relic.getEquipAvatar());
                if (avatar != null) {
                    avatar.equipItem(item);
                }
            }

            // Add New Lightcones
            for (var lightcone : req.getData().getLightcones()) {
                var item = new GameItem(lightcone.getItemID());
                if (item.getExcel() == null) continue;
                item.setLevel(lightcone.getLevel());
                item.setRank(lightcone.getRank());
                item.setPromotion(lightcone.getPromotion());

                player.getInventory().addItem(item);

                var avatar = getAvatarById(player, lightcone.getEquipAvatar());
                if (avatar != null) {
                    avatar.equipItem(item);
                }
            }

            player.sendMessage("Successfully synced data from website!");
        } catch (Exception e) {
            LunarCore.getLogger().error("[SRToolAPIHandler] Internal Error {}", e.getMessage());
            rsp.setStatus(500);
            rsp.setMessage("Internal Server Error");
            ctx.status(500);
            ctx.result(JsonUtils.encode(rsp));
            return;
        }

        rsp.setStatus(200);
        rsp.setMessage("OK");
        ctx.result(JsonUtils.encode(rsp));
    }


    private void clearInventory(Player player) {
        var toRemove = new LinkedList<GameItem>();
        for (var item : player.getInventory().getItems().values()) {
            if (item.getItemMainType() != ItemMainType.Equipment && item.getItemMainType() != ItemMainType.Relic) {
                continue;
            }

            if (item.isEquipped()) {
                player
                        .getAvatarById(item.getEquipAvatarId())
                        .unequipItem(item.getItemMainType() == ItemMainType.Equipment ? GameConstants.EQUIPMENT_SLOT_ID : item.getEquipSlot());
            }

            toRemove.push(item);
        }
        player.getInventory().removeItems(toRemove);
    }

    public static GameAvatar getAvatarById(Object instance, int avatarId) {
        Object retval = null;
        try {
            Method method;
            try {
                method = instance.getClass().getDeclaredMethod("getAvatarById", int.class, boolean.class); // this is used for RushiaCore
                retval = method.invoke(instance, avatarId, false);
            } catch (NoSuchMethodException e) {
                method = instance.getClass().getDeclaredMethod("getAvatarById", int.class);
                retval = method.invoke(instance, avatarId);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        if (retval instanceof GameAvatar) {
            return (GameAvatar) retval;
        }

        return null;
    }

    public static PacketPlayerSyncScNotify createPacketPlayerSyncScNotify(Object... avatars) {
        Object retval = null;
        try {
            Class<?> packetClass = Class.forName("emu.lunarcore.server.packet.send.PacketPlayerSyncScNotify");
            Class<?> syncableClass = null;
            try {
                syncableClass = Class.forName("emu.lunarcore.server.game.Syncable");
            } catch (ClassNotFoundException ignored) {
            }

            // Newer version uses Syncable[]
            // Older version uses GameAvatar[]
            Constructor<?> constructor = packetClass.getDeclaredConstructor(Objects.requireNonNullElse(syncableClass, GameAvatar.class).arrayType());
            retval = constructor.newInstance(avatars);
        } catch (Exception e) {
            LunarCore.getLogger().error("type casting failed");
            e.printStackTrace();
        }

        if (retval instanceof PacketPlayerSyncScNotify) {
            return (PacketPlayerSyncScNotify) retval;
        }

        return null;
    }
}
