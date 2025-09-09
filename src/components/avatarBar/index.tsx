"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import CharacterCard from "../card/characterCard";
import useLocaleStore from "@/stores/localeStore";
import useAvatarStore from "@/stores/avatarStore";
import { useTranslations } from "next-intl";

export default function AvatarBar() {
    const [listElement, setListElement] = useState<Record<string, boolean>>({
        fire: false, ice: false, imaginary: false, physical: false,
        quantum: false, thunder: false, wind: false
    });

    const [listPath, setListPath] = useState<Record<string, boolean>>({
        knight: false, mage: false, priest: false, rogue: false,
        shaman: false, warlock: false, warrior: false, memory: false
    });

    const { listAvatar, setAvatarSelected, setSkillSelected, setFilter, filter } = useAvatarStore();
    const transI18n = useTranslations("DataPage");
    const { locale } = useLocaleStore();

    useEffect(() => {
        setFilter({
            ...filter,
            locale: locale,
            element: Object.keys(listElement).filter((key) => listElement[key]),
            path: Object.keys(listPath).filter((key) => listPath[key])
        });
    }, [locale, listElement, listPath]);

    return (
        <div className="flex flex-col gap-2">
            {/* Input Search */}
            <div className="flex justify-center">
                <input
                    type="text"
                    placeholder={transI18n("placeholderCharacter")}
                    className="input input-bordered input-primary w-full max-w-xs"
                    value={filter.name}
                    onChange={(e) => setFilter({ ...filter, name: e.target.value, locale })}
                />
            </div>

            {/* Elements */}
            <div className="grid grid-cols-3 px-1 gap-1 overflow-y-auto max-h-[10vh]">
                {Object.keys(listElement).map((key, index) => (
                    <div
                        key={index}
                        onClick={() => setListElement(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`bg-[#7f7a80] shadow flex px-2 py-1 justify-between items-center gap-2 hover:shadow-[inset_0_0_0_1px_black]`}
                    >
                        <div><Image src={`/icon/${key}.webp`} alt={key} width={32} height={32} className="w-8"/></div>
                        <div className="flex-1 font-bold leading-tight">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                        <div>
                            <button className={`h-5 w-5 rounded border ${listElement[key] ? "bg-yellow-500" : ""}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Paths */}
            <div className="grid grid-cols-3 px-1 gap-1 overflow-y-auto max-h-[10vh] mt-2">
                {Object.keys(listPath).map((key, index) => (
                    <div
                        key={index}
                        onClick={() => setListPath(prev => ({ ...prev, [key]: !prev[key] }))}
                        className={`bg-[#7f7a80] shadow flex px-2 py-1 justify-between items-center gap-2 hover:shadow-[inset_0_0_0_1px_black] cursor-pointer`}
                    >
                        <div><Image src={`/icon/${key}.webp`} alt={key} width={32} height={32} className="w-8"/></div>
                        <div className="flex-1 font-bold leading-tight">{key.charAt(0).toUpperCase() + key.slice(1)}</div>
                        <div>
                            <button className={`h-5 w-5 rounded border ${listPath[key] ? "bg-yellow-500" : ""}`} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Avatar List */}
            <ul className="grid grid-cols-1 md:grid-cols-4 gap-3 w-full h-[60vh] overflow-y-scroll">
                {listAvatar.map((item, index) => (
                    <div key={index} onClick={() => { setAvatarSelected(item); setSkillSelected(null); }}>
                        <CharacterCard data={item} />
                    </div>
                ))}
            </ul>
        </div>
    );
}
