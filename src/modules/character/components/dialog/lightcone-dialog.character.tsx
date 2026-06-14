
import { useTranslation } from "@/src/hooks/use-translation.hook";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { useLightcones } from "../../hooks/use-lightcones.hook";
import { Plus, X } from "lucide-react";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Input } from "@/src/components/ui/input";
import { useMemo, useState } from "react";
import { VisuallyHidden } from "radix-ui";
import Image from "next/image";
import PathIcon from "@/src/components/icons/path.icon";
import { DEFAULT_CHAR_CONFIG, PATHS } from "@/src/utils/constants";
import { motion } from "motion/react";
import { useUserStore } from "@/src/store/use-user.store";
import { useCharacterStore } from "../../store/use-character.store";
import { Button } from "@/src/components/ui/button";

const LightconeDialog = () => {
  const { t } = useTranslation();
  const id = useCharacterStore((state) => state.id);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [path, setPath] = useState("");
  const [rarity, setRarity] = useState<number | null>(null);
  const { data, isPending } = useLightcones();

  const filteredData = useMemo(() => {
    const allItems = Object.values(data ?? {}).reverse();

    if (!search && !path && !rarity) return allItems;

    const searchLower = search.toLowerCase();

    return allItems.filter((item) => {
      const nameText = item.name;

      const filterSearch = nameText?.toLowerCase().includes(searchLower);
      const filterPath = path ? item.path.includes(path) : true;
      const filterRarity = rarity ? item.rarity === rarity : true;

      return filterSearch && filterPath && filterRarity;
    });
  }, [data, search, path, rarity]);

  const charConfig = useUserStore(
    (state) => state.characters[id!] ?? DEFAULT_CHAR_CONFIG,
  );
  const updateChar = useUserStore((state) => state.updateCharacter);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild disabled={isPending}>
        <div
          role="button"
          tabIndex={0}
          className={
            charConfig.lightcone.id
              ? "h-[245.3px] w-[176px] shrink-0 border border-white/[0.08] rounded-xl cursor-pointer relative flex justify-center items-end bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden"
              : "h-[245.3px] w-full shrink-0 border border-white/[0.08] rounded-xl cursor-pointer relative flex flex-col justify-center items-center bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden"
          }
        >
          {charConfig.lightcone.id &&
          data?.[charConfig.lightcone.id]?.portrait ? (
            <>
              <Image
                unoptimized
                width={200}
                height={200}
                src={data?.[charConfig.lightcone.id]?.portrait}
                alt={"tes"}
                className="h-full object-cover"
              />
              <Button
                size={"icon"}
                variant={"destructive"}
                className="absolute top-2 right-2 bg-red-600/75 hover:bg-red-700/75 p-1.5 z-10"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updateChar(Number(id), {
                    lightcone: {
                      ...charConfig.lightcone,
                      id: null,
                    },
                  });
                }}
              >
                <X color="white" />
              </Button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 p-6 text-center">
              <div className="size-16 rounded-full bg-white/[0.05] flex items-center justify-center mb-2">
                <Plus size={32} className="opacity-50" />
              </div>
              <p className="text-xl font-bold">{t("noLightconeEquipped")}</p>
              <p className="text-sm opacity-50 mb-4">{t("equipLightconeDesc")}</p>
              <div className="bg-[#00c3ff]/20 text-[#00c3ff] hover:bg-[#00c3ff]/30 font-bold border border-[#00c3ff]/30 rounded-lg px-8 py-2 inline-flex items-center justify-center whitespace-nowrap text-sm transition-colors">
                <Plus size={16} className="mr-2" /> {t("equipLightcone")}
              </div>
            </div>
          )}
        </div>
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="h-[90vh] flex flex-col bg-card/95 backdrop-blur-2xl border-white/[0.06]">
        <DialogHeader className="shrink-0">
          <VisuallyHidden.Root>
            <DialogTitle>{t("lightcone")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </VisuallyHidden.Root>
          <Input
            placeholder={t("search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-white/[0.04] border-white/[0.08]"
          />
          <div className="flex gap-2 justify-between items-center w-full">
            <div className="flex flex-wrap gap-2">
              {PATHS.map((item) => {
                const isSelected = path === item;

                return (
                  <motion.div
                    key={item}
                    layout
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      if (path === item) {
                        setPath("");
                      } else {
                        setPath(item);
                      }
                    }}
                    className={`
                                cursor-pointer p-1 rounded-md transition-colors duration-300
                                relative flex items-center justify-center
                                ${
                                  isSelected
                                    ? "bg-white/[0.08] ring-2 ring-white/20 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                                    : "bg-white/[0.03] hover:bg-white/[0.06]"
                                }
                              `}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="active-dot"
                        className="absolute -top-1 -right-1 size-2 bg-white rounded-full"
                      />
                    )}

                    <PathIcon
                      src={item}
                      className={`size-8 transition-opacity ${isSelected ? "opacity-100" : "opacity-50"}`}
                    />
                  </motion.div>
                );
              })}
            </div>
            
            <div className="flex gap-2 items-center shrink-0">
              {[3, 4, 5].map((star) => (
                <Button
                  key={star}
                  variant={rarity === star ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRarity(rarity === star ? null : star)}
                  className={`px-3 py-1 ${rarity === star ? "bg-white text-black hover:bg-white/90" : "border-white/20 text-white bg-transparent hover:bg-white/10"}`}
                >
                  {star}*
                </Button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="h-3" />
          <div className="grid grid-cols-6 gap-8 px-4 justify-items-center">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="relative cursor-pointer group"
                onClick={() => {
                  updateChar(Number(id), {
                    lightcone: { ...charConfig.lightcone, id: item.id },
                  });
                  setIsOpen(false);
                }}
              >
                {/* FRONT */}
                <div
                  className="size-full absolute z-50 border-2 border-transparent group-hover:border-white/20 pointer-events-none transition-all duration-300 group-hover:-top-2 group-hover:-left-2 top-0 left-0"
                >
                  <PathIcon
                    src={item.path}
                    className="size-8 absolute top-2 right-2 bg-background/50 rounded-full p-1 backdrop-blur-xs"
                  />
                  <div className="absolute bottom-0 left-0 bg-black/60 p-2 w-full rounded-t-lg backdrop-blur-sm">
                    <p
                      className={`text-center font-semibold ${item.rarity === 5 ? "text-amber-200/80" : "text-blue-200/80"}`}
                    >
                      {item.name}
                    </p>
                  </div>
                </div>

                {/* BACK */}
                <div
                  className={`size-full absolute -z-10 border border-transparent group-hover:border-white/[0.08] ${item.rarity === 5 ? "bg-amber-200/5" : "bg-blue-200/10"} pointer-events-none transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:-bottom-2 group-hover:-right-2 bottom-0 right-0`}
                />

                {/* IMAGE LIGHTCONE */}
                <Image
                  unoptimized
                  width={200}
                  height={200}
                  src={item.portrait}
                  alt={String(item.name)}
                  className="w-full"
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LightconeDialog;
