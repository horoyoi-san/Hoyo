package emu.lunarcore.util;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import emu.lunarcore.GameConstants;
import emu.lunarcore.LunarCore;
import emu.lunarcore.command.Command;
import emu.lunarcore.data.GameData;
import emu.lunarcore.data.excel.*;

public class Handbook {

    public static void generate() {
        // Load text map
        Map<Long, String> textMap = new HashMap<>();
        List<Integer> list = null;
        String language = LunarCore.getConfig().getServerOptions().language;

        String textMapPath = LunarCore.getConfig().getResourceDir() + "/TextMap/TextMap" + language + ".json";
        File textMapFile = new File(textMapPath);
        if (!textMapFile.exists()) {
            LunarCore.getLogger().error("TextMap file not found: {}", textMapPath);
            return;
        }

        try (var fileReader = new InputStreamReader(new FileInputStream(textMapFile), StandardCharsets.UTF_8)) {
            com.google.gson.JsonElement json = com.google.gson.JsonParser.parseReader(fileReader);
            if (json.isJsonObject()) {
                for (var entry : json.getAsJsonObject().entrySet()) {
                    textMap.put(Long.parseUnsignedLong(entry.getKey()), entry.getValue().getAsString());
                }
            } else if (json.isJsonArray()) {
                for (var element : json.getAsJsonArray()) {
                    if (!element.isJsonObject()) continue;
                    var obj = element.getAsJsonObject();
                    if (!obj.has("Text") || !obj.has("ID")) continue;
                    String text = obj.get("Text").getAsString();
                    var idElem = obj.get("ID");
                    if (idElem.isJsonObject()) {
                        var idObj = idElem.getAsJsonObject();
                        if (idObj.has("Hash")) {
                            textMap.put(idObj.get("Hash").getAsLong(), text);
                        }
                        if (idObj.has("Hash64")) {
                            textMap.put(idObj.get("Hash64").getAsLong(), text);
                        }
                    } else if (idElem.isJsonPrimitive()) {
                        textMap.put(idElem.getAsLong(), text);
                    }
                }
            }
        } catch (Exception e) {
            LunarCore.getLogger().error("Error loading text map: " + language, e);
            return;
        }

        // Save to file
        String file = "./Lunar Core Handbook.txt";

        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(new FileOutputStream(file), StandardCharsets.UTF_8), true)) {
            // Format date for header
            DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm:ss");
            var time = Instant.ofEpochMilli(System.currentTimeMillis()).atZone(ZoneId.systemDefault()).format(dtf);
            
            // Header
            writer.println("# Lunar Core " + GameConstants.VERSION + " Handbook");
            writer.println("# Created " + time);

            // Dump commands
            writer.println(System.lineSeparator());
            writer.println("# Commands");
            var labels = LunarCore.getCommandManager().getLabels().keySet().stream().sorted().toList();
            for (var label : labels) {
                Command command = LunarCore.getCommandManager().getLabels().get(label).getClass().getAnnotation(Command.class);
                if (command == null) continue;

                writer.println(command.desc());
            }

            // Dump avatars
            writer.println(System.lineSeparator());
            writer.println("# Avatars");
            list = GameData.getAvatarExcelMap().keySet().intStream().sorted().boxed().toList();
            for (int id : list) {
                AvatarExcel excel = GameData.getAvatarExcelMap().get(id);
                writer.print(excel.getId());
                writer.print(" : ");
                writer.println(textMap.getOrDefault(excel.getAvatarName(), "null"));
            }

            // Dump items
            writer.println(System.lineSeparator());
            writer.println("# Items");
            list = GameData.getItemExcelMap().keySet().intStream().sorted().boxed().toList();
            for (int id : list) {
                ItemExcel excel = GameData.getItemExcelMap().get(id);
                writer.print(excel.getId());
                writer.print(" : ");
                writer.println(textMap.getOrDefault(excel.getItemName(), "null"));
            }

            // Dump props
            writer.println(System.lineSeparator());
            writer.println("# Props (Spawnable)");
            list = GameData.getPropExcelMap().keySet().intStream().sorted().boxed().toList();
            for (int id : list) {
                PropExcel excel = GameData.getPropExcelMap().get(id);
                writer.print(excel.getId());
                writer.print(" : ");
                writer.println(textMap.getOrDefault(excel.getPropName(), "null"));
            }

            // Dump npc monsters
            writer.println(System.lineSeparator());
            writer.println("# NPC Monsters (Spawnable)");
            list = GameData.getNpcMonsterExcelMap().keySet().intStream().sorted().boxed().toList();
            for (int id : list) {
                NpcMonsterExcel excel = GameData.getNpcMonsterExcelMap().get(id);
                writer.print(excel.getId());
                writer.print(" : ");
                writer.println(textMap.getOrDefault(excel.getNPCName(), "null"));
            }

            // Dump stages
            writer.println(System.lineSeparator());
            writer.println("# Battle Stages");
            list = GameData.getStageExcelMap().keySet().intStream().sorted().boxed().toList();
            for (int id : list) {
                StageExcel excel = GameData.getStageExcelMap().get(id);
                writer.print(excel.getId());
                writer.print(" : ");
                writer.print("[Level " + excel.getLevel() + "] ");
                writer.println(textMap.getOrDefault(excel.getStageName(), "null"));
            }
            
            // Dump monsters
            writer.println(System.lineSeparator());
            writer.println("# Battle Monsters");
            list = GameData.getMonsterExcelMap().keySet().intStream().sorted().boxed().toList();
            for (int id : list) {
                MonsterExcel excel = GameData.getMonsterExcelMap().get(id);
                writer.print(excel.getId());
                writer.print(" : ");
                writer.println(textMap.getOrDefault(excel.getMonsterName(), "null"));
            }

            // Dump stages
            writer.println(System.lineSeparator());
            writer.println("# Mazes");
            list = GameData.getMazePlaneExcelMap().keySet().intStream().sorted().boxed().toList();
            for (int id : list) {
                MazePlaneExcel excel = GameData.getMazePlaneExcelMap().get(id);
                writer.print(excel.getId());
                writer.print(" : ");
                writer.print("[" + excel.getPlaneType() + "] ");
                writer.println(textMap.getOrDefault(excel.getPlaneName(), "null"));
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

}
