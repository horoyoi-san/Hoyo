"use client";

import { useTranslation } from "@/src/hooks/use-translation.hook";
export default function Character() {
  const { t } = useTranslation();
  return (
    <div>
      <p>{t("characterPage")}</p>
    </div>
  );
}
