"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCharacters } from "./hooks/use-characters.hook";
import Image from "next/image";
import { Button } from "@/src/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import PathIcon from "@/src/components/icons/path.icon";
import ElementIcon from "@/src/components/icons/element.icon";
import EditCard from "./components/edit-card.character";
import { useCharacterStore } from "./store/use-character.store";
import { useLightcones } from "./hooks/use-lightcones.hook";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";
import ShowcaseCard from "./components/showcase-card.character";
import { useUserStore } from "@/src/store/use-user.store";
import { DEFAULT_CHAR_CONFIG } from "@/src/utils/constants";
import { toast } from "sonner";
import { domToPng } from "modern-screenshot";
import EidolonShowcase from "./components/showcase/eidolon.showcase";
import { CHARACTER_OFFSETS } from "./utils/constants";
import { imgUrl } from "@/src/utils/helpers";

const CharacterPage = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const charData = useCharacterStore((state) => state.charData);

  const saveImage = async () => {
    const node = document.getElementById("card");
    if (!node) return;

    const toastId = toast.loading("Generating image...");

    try {
      const dataUrl = await domToPng(node, {
        scale: 2,
        filter: (domNode: any) => {
          return !domNode.classList?.contains("z-51");
        },
      });

      const link = document.createElement("a");
      link.download = `${charData?.name}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Image saved!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate image", { id: toastId });
    }
  };

  const params = useParams();
  const id = params.id as string;
  const { data: allCharacters, isPending } = useCharacters();
  useLightcones();
  const parseDesc = useParsedDesc();
  const [isEdit, setIsEdit] = useState(false);

  // INITIATE STORE VALUE
  const setId = useCharacterStore((state) => state.setId);
  const setCharData = useCharacterStore((state) => state.setCharData);
  const charConfig = useUserStore(
    (state) => state.characters[id as string] ?? DEFAULT_CHAR_CONFIG,
  );

  useEffect(() => {
    if (id) {
      setId(id);
    }
  }, [id, setId]);

  const char = useMemo(() => {
    return allCharacters?.[id];
  }, [allCharacters, id]);

  useEffect(() => {
    if (char) {
      setCharData(char);
    }
  }, [char, setCharData]);

  if (isPending || !char) {
    return;
  }

  return (
    <div className="wrapper my-8" id="card" ref={cardRef}>
      <div className="rounded-xl h-170 flex relative">
        <div className="flex gap-4 absolute top-2 left-2 z-51">
          <Button onClick={() => setIsEdit((prev) => !prev)} size={"lg"}>
            {isEdit ? "Close" : "Edit"}
          </Button>
          {!isEdit && (
            <Button onClick={saveImage} size={"lg"}>
              Save Image
            </Button>
          )}
        </div>

        {/* BACKDROP BLUR CARD */}
        <div className="absolute inset-0 -z-20 overflow-hidden rounded-xl bg-background">
          <div className="absolute inset-0 bg-primary/25 z-10" />

          <div className="absolute inset-0 scale-110">
            <Image
              unoptimized
              src={imgUrl(id, "avatardrawcard", false)}
              alt="bg"
              fill
              className="object-cover opacity-50"
              style={{ filter: "blur(0px)" }}
            />
          </div>

          <div className="absolute inset-0 bg-linear-to-br from-black/10 via-transparent to-black/75 z-20" />
        </div>

        <AnimatePresence>
          {!isEdit && <EidolonShowcase key="eidolon-layer" />}
        </AnimatePresence>

        {/* LEFT IMAGE */}
        <div className="w-72 h-full overflow-hidden rounded-xl relative z-10">
          <div className="bg-[url(/space.webp)] bg-cover bg-center size-full absolute left-0 top-0 -z-50 opacity-75" />
          <Image
            unoptimized
            src={imgUrl(id, "avatardrawcard", false)}
            alt={String(char?.name) ?? ""}
            width={2048}
            height={2048}
            className="absolute top-1/2 left-1/2 min-w-[200%] min-h-[200%] max-w-none object-contain"
            style={{
              transform:
                CHARACTER_OFFSETS[Number(id)]?.transform ??
                "translate(-50%, -50%) scale(0.6)",
            }}
          />
        </div>

        {/* RIGHT CARD */}
        <motion.div
          layout
          transition={{
            layout: { duration: 0.5, ease: "backOut" },
            opacity: { duration: 0.3 },
          }}
          className={`
                      ${
                        isEdit
                          ? "absolute inset-0 z-50 w-full ml-0"
                          : "relative flex-1 -ml-4 z-20"
                      }
                      card flex flex-col
                    `}
        >
          <motion.div
            layout
            transition={{ duration: 0.5, ease: "circOut" }}
            className={isEdit ? "pl-15 transition-all" : "pt-0 transition-all"}
          >
            <div className="flex items-center gap-2">
              <p
                className="text-3xl font-bold tracking-widest font-didact"
                dangerouslySetInnerHTML={{
                  __html: parseDesc(char.name, []) ?? "Character Name",
                }}
              />
              <PathIcon src={char?.path ?? ""} />
              <ElementIcon src={char?.element ?? ""} />
              {!isEdit && (
                <p className="bg-secondary text-secondary-foreground rounded-md px-1 font-medium">
                  Lv. {charConfig.level}
                </p>
              )}
            </div>
          </motion.div>

          {isEdit ? <EditCard /> : <ShowcaseCard />}
        </motion.div>
      </div>
    </div>
  );
};

export default CharacterPage;
