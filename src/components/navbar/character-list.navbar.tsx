"use client";

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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data } = useCharacters();
  const dataCharacter = Object.values(data ?? {}).reverse();
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
    <div className="wrapper flex gap-4 items-center overflow-hidden">
      <Sheet
        open={open}
        onOpenChange={(val) => {
          setOpen(val);
          setSearch("");
        }}
      >
        <SheetTrigger asChild>
          <button className="flex py-2 flex-col items-center justify-center size-16 rounded-full border-2 border-dashed border-secondary hover:border-primary hover:bg-white/10 transition-all shrink-0">
            <Search size={24} />
            <span className="text-[10px] uppercase font-bold">Search</span>
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className="z-60 flex flex-col h-screen data-[side=left]:sm:max-w-lg"
        >
          <SheetHeader>
            <SheetTitle>Search Character</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            <div className="px-4">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
              />
            </div>
            <ScrollArea className="flex-1 h-[50vh]">
              <div className="grid grid-cols-4 gap-4 h-full px-4 pb-4">
                {filteredData &&
                  filteredData.map((item) => {
                    return (
                      <Link
                        onClick={() => setOpen(false)}
                        href={`/character/${item.id}`}
                        prefetch={false}
                        key={item.id}
                        className="group relative flex flex-col items-center justify-end rounded-xl border border-secondary/50 bg-white/5 transition-all hover:border-primary hover:bg-white/15 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] overflow-hidden"
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
                        <div className="absolute inset-x-0 p-2 bottom-0 flex flex-col items-center justify-end">
                          <p
                            className="text-xs font-semibold uppercase tracking-wider transition-colors group-hover:text-foreground text-center line-clamp-2"
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
        <div className="flex gap-4 w-max p-4">
          {dataCharacter?.map((item) => {
            return (
              <Link
                href={`/character/${item.id}`}
                key={item.id}
                prefetch={false}
                className="rounded-full border-2 border-secondary overflow-hidden size-16 bg-white/5 hover:bg-white/50 transition-colors duration-300 p-px"
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
