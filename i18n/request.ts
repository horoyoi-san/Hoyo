import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import de from "../messages/de.json";
import en from "../messages/en.json";
import es from "../messages/es.json";
import fr from "../messages/fr.json";
import id from "../messages/id.json";
import ja from "../messages/ja.json";
import ko from "../messages/ko.json";
import pt from "../messages/pt.json";
import ru from "../messages/ru.json";
import th from "../messages/th.json";
import vi from "../messages/vi.json";
import zh from "../messages/zh.json";

const messagesMap: Record<string, typeof en> = {
    de,
    en,
    es,
    fr,
    id,
    ja,
    ko,
    pt,
    ru,
    th,
    vi,
    zh,
};

export default getRequestConfig(async () => {
    const cookieLocale = (await cookies()).get("MYNEXTAPP_LOCALE")?.value;
    const locale = cookieLocale && messagesMap[cookieLocale] ? cookieLocale : "en";
    const messages = messagesMap[locale] || messagesMap.en;

    return {
        locale,
        messages,
    };
});
