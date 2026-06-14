"use client";

import { useTranslation } from "@/src/hooks/use-translation.hook";

import Link from "next/link";
import { ScrollArea } from "../ui/scroll-area";
import { useCharacters } from "@/src/modules/character/hooks/use-characters.hook";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Search } from "lucide-react";
import { Input } from "../ui/input";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParsedDesc } from "@/src/hooks/use-parsed-desc.hook";

const CharacterNavbar = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data } = useCharacters();
  const dataCharacter = useMemo(
    () => Object.values(data ?? {}).reverse(),
    [data],
  );
  const parseDesc = useParsedDesc();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const filteredData = useMemo(() => {
    if (!dataCharacter) return;
    if (!search) return dataCharacter;
    return dataCharacter.filter((char) => {
      return char.name.toLowerCase().includes(search.toLowerCase());
    });
  }, [search, dataCharacter]);

  return (
    <div className="wrapper flex gap-3 items-center overflow-hidden">
      <Sheet
        open={open}
        onOpenChange={(val) => {
          setOpen(val);
          setSearch("");
        }}
      >
        <SheetTrigger asChild>
          <button className="flex py-2 flex-col items-center justify-center size-14 rounded-2xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-all shrink-0 group">
            <Search size={20} className="text-muted-foreground group-hover:text-foreground transition-colors" />
            <span className="text-[9px] uppercase font-medium text-muted-foreground mt-0.5">{t("search")}</span>
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="z-60 flex flex-col h-screen data-[side=left]:sm:max-w-lg bg-card/95 backdrop-blur-2xl border-white/[0.06]"
        >
          <SheetHeader>
            <SheetTitle className="text-foreground">{t("searchCharacter")}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="px-4">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search")}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <ScrollArea className="flex-1 h-[50vh]">
              <div className="grid grid-cols-4 gap-3 h-full px-4 pb-4">
                {filteredData &&
                  filteredData.map((item) => {
                    return (
                      <Link
                        onClick={() => setOpen(false)}
                        href={`/character/${item.id}`}
                        prefetch={false}
                        key={item.id}
                        className="group relative flex flex-col items-center justify-end rounded-xl border border-white/[0.06] bg-white/[0.02] transition-all hover:border-white/[0.12] hover:bg-white/[0.05] overflow-hidden"
                      >
                        <div
                          className={`absolute top-0 right-0 w-2 h-2 rounded-full group-hover:animate-pulse`}
                        />
                        <Image
                          unoptimized
                          width={128}
                          height={128}
                          src={item.icon}
                          alt={item.tag}
                        />
                        <div className="absolute inset-x-0 p-2 bottom-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 to-transparent">
                          <p
                            className="text-xs font-medium text-center line-clamp-2 tracking-wide text-white/80 group-hover:text-white transition-colors"
                            dangerouslySetInnerHTML={{
                              __html: parseDesc(item.name, []),
                            }}
                          />
                        </div>
                      </Link>
                    );
                  })}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
      <div
        ref={scrollRef}
        className="w-full pr-14 overflow-x-auto character-scroll"
      >
        <div className="flex gap-2.5 w-max py-3 px-1">
          {dataCharacter?.map((item) => {
            return (
              <Link
                href={`/character/${item.id}`}
                key={item.id}
                prefetch={false}
                className="rounded-full border border-white/[0.08] overflow-hidden size-14 bg-white/[0.02] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 p-px"
              >
                <Image
                  unoptimized
                  width={128}
                  height={128}
                  src={`https://fribbels.github.io/hsr-optimizer/assets/icon/avatar/${item.id}.webp`}
                  alt={item.tag}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CharacterNavbar;
