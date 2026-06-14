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
  const id = useCharacterStore((state) => state.id);

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [path, setPath] = useState("");
  const { data, isPending } = useLightcones();

  const filteredData = useMemo(() => {
    const allItems = Object.values(data ?? {}).reverse();

    if (!search && !path) return allItems;

    const searchLower = search.toLowerCase();

    return allItems.filter((item) => {
      const nameText = item.name;

      const filterSearch = nameText?.toLowerCase().includes(searchLower);
      const filterPath = item.path.includes(path);

      return filterSearch && filterPath;
    });
  }, [data, search, path]);

  const charConfig = useUserStore(
    (state) => state.characters[id!] ?? DEFAULT_CHAR_CONFIG,
  );
  const updateChar = useUserStore((state) => state.updateCharacter);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        disabled={isPending}
        className="h-[245.3px] w-[176px] shrink-0 border-2 cursor-pointer border-foreground relative flex justify-center items-end"
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
              className="absolute top-2 right-2 bg-red-600/75 hover:bg-red-700/75 p-1.5"
              onClick={(e) => {
                e.preventDefault();
                updateChar(Number(id), {
                  lightcone: {
                    ...charConfig.lightcone,
                    id: null,
                  },
                });
              }}
              asChild
            >
              <X color="white" />
            </Button>
          </>
        ) : (
          <>
            <Plus className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            <p className="mb-2">Select Lightcone</p>
          </>
        )}
      </DialogTrigger>

      <DialogContent showCloseButton={false} className="h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <VisuallyHidden.Root>
            <DialogTitle>Lightcone</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </VisuallyHidden.Root>
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2">
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
                                    ? "bg-primary/20 ring-2 ring-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                                    : "bg-background/40 hover:bg-background/60"
                                }
                              `}
                  >
                    {isSelected && (
                      <motion.div
                        layoutId="active-dot"
                        className="absolute -top-1 -right-1 size-2 bg-primary rounded-full"
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
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="h-3" />
          <div className="grid grid-cols-6 gap-8 px-4 justify-items-center">
            {filteredData.map((item) => (
              <motion.div
                key={item.id}
                className="relative cursor-pointer group"
                initial="rest"
                whileHover="hover"
                animate="rest"
                onClick={() => {
                  updateChar(Number(id), {
                    lightcone: { ...charConfig.lightcone, id: item.id },
                  });
                  setIsOpen(false);
                }}
              >
                {/* FRONT */}
                <motion.div
                  variants={{
                    rest: { top: 0, left: 0, opacity: 1 },
                    hover: { top: -8, left: -8, opacity: 1 },
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="size-full absolute z-50 border-3 border-foreground pointer-events-none"
                >
                  <PathIcon
                    src={item.path}
                    className="size-8 absolute top-2 right-2 bg-background/50 rounded-full p-1 backdrop-blur-xs"
                  />
                  <div className="absolute bottom-0 left-0 bg-background/50 p-2 w-full rounded-t-lg backdrop-blur-xs">
                    <p
                      className={`text-center font-semibold ${item.rarity === 5 ? "text-secondary" : "text-blue-200"}`}
                    >
                      {item.name}
                    </p>
                  </div>
                </motion.div>

                {/* BACK */}
                <motion.div
                  variants={{
                    rest: { bottom: 0, right: 0, opacity: 0 },
                    hover: { bottom: -8, right: -8, opacity: 1 },
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={`size-full absolute -z-10 border border-foreground ${item.rarity === 5 ? "bg-secondary/25" : "bg-primary/75"} pointer-events-none`}
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
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default LightconeDialog;
