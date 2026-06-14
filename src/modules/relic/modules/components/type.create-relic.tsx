import {
  DEFAULT_CREATE_RELIC,
  useCreateRelicStore,
} from "../store/use-create-relic.store";
import { ORNAMENTS, RELIC_PART } from "../utils/constants";
import { motion, LayoutGroup } from "motion/react";

const TypeCreateRelic = () => {
  const relic = useCreateRelicStore((state) => state.relic);
  const updateRelic = useCreateRelicStore((state) => state.updateRelic);

  const handleChangeType = (item: string) => {
    if (relic.type === item) return;

    updateRelic({
      ...DEFAULT_CREATE_RELIC,
      type: item,
    });
  };

  return (
    <div className="rounded-lg bg-primary w-fit overflow-hidden h-fit">
      <LayoutGroup id="relic-parts-group">
        {/* RELIC PART */}
        <div className="flex border-b border-primary/20">
          {RELIC_PART.map((item) => {
            const isActive = relic.type === item;
            return (
              <div
                key={item}
                onClick={() => handleChangeType(item)}
                className="relative p-1.5 cursor-pointer group"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-bg"
                    className="absolute inset-0 bg-background"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}

                <motion.img
                  src={`/icons/part/part${item}.webp`}
                  alt={item}
                  className="relative z-10 size-8 transition-transform group-hover:scale-110 active:scale-95"
                  style={{
                    filter: isActive
                      ? "none"
                      : "brightness(0.8) grayscale(0.2)",
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* ORNAMENTS */}
        <div className="flex">
          {ORNAMENTS.map((item) => {
            const isActive = relic.type === item;
            return (
              <div
                key={item}
                onClick={() => handleChangeType(item)}
                className="relative p-1.5 cursor-pointer flex-1 group"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-bg"
                    className="absolute inset-0 bg-background"
                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                  />
                )}

                <motion.img
                  src={`/icons/part/part${item}.webp`}
                  alt={item}
                  className="relative z-10 size-8 mx-auto transition-transform group-hover:scale-110 active:scale-95"
                  style={{
                    filter: isActive
                      ? "none"
                      : "brightness(0.8) grayscale(0.2)",
                  }}
                />
              </div>
            );
          })}
        </div>
      </LayoutGroup>
    </div>
  );
};

export default TypeCreateRelic;
