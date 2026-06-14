import { motion } from "motion/react";
import { useState } from "react";
import CharacterTab from "./tabs/character.tab";
import RelicTab from "./tabs/relic.tab";

const TABS: Record<string, { name: string; render: React.ReactNode }> = {
  character: {
    name: "character",
    render: <CharacterTab />,
  },
  relic: {
    name: "relic",
    render: <RelicTab />,
  },
};

const EditCard = () => {
  const [activeTab, setActiveTab] = useState("character");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="flex-1 flex flex-col"
    >
      {/* TAB HEADERS */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, type: "keyframes" }}
        className="flex relative"
      >
        {Object.keys(TABS).map((item, index) => {
          const isActive = activeTab === item;

          return (
            <motion.div
              key={item}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index }}
              className={`
                  relative p-4 cursor-pointer flex-1 flex justify-center 
                  tracking-widest transition-colors duration-300 z-10
                  ${isActive ? "text-white" : "text-gray-400 hover:text-white"}
                `}
              onClick={() => setActiveTab(item)}
            >
              <p className="uppercase relative z-20 text-sm font-bold">
                {item}
              </p>

              {/* BACKGROUND ACTIVE TAB */}
              {isActive && (
                <motion.div
                  layoutId="activeTabBackground"
                  initial={false}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 bg-white/10 rounded-t-lg"
                  transition={{
                    type: "spring",
                    bounce: 0.1,
                    duration: 0.5,
                  }}
                >
                  {/* INVERTED ROUNDED FOR CHARACTER TAB */}
                  {index < Object.keys(TABS).length - 1 && (
                    <div className="absolute -right-5 bottom-0 w-5 h-5 overflow-hidden pointer-events-none">
                      <div className="absolute top-0 left-0 w-5 h-5 rounded-bl-xl shadow-[-10px_10px_0_10px_rgba(255,255,255,0.1)]" />
                    </div>
                  )}

                  {/* INVERTED ROUNDED FOR RELIC TAB */}
                  {index > 0 && (
                    <div className="absolute -left-5 bottom-0 w-5 h-5 overflow-hidden pointer-events-none">
                      <div className="absolute top-0 right-0 w-5 h-5 rounded-br-xl shadow-[10px_10px_0_10px_rgba(255,255,255,0.1)]" />
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </motion.div>

      {/* TAB CONTENT */}
      <div
        className={`p-4 bg-white/10 rounded-b-lg flex-1 flex gap-2 ${activeTab === "character" ? "rounded-tr-lg" : "rounded-tl-lg"} transition-all duration-200`}
      >
        {TABS[activeTab].render || <p>No component</p>}
      </div>
    </motion.div>
  );
};

export default EditCard;
