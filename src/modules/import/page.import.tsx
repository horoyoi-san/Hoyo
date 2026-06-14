"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import Mihomo from "./components/mihomo.import";
import ReversedRoom from "./components/reversedroom.import";
import Hoyolab from "./components/hoyolab.import";
import FreesrImport from "./components/freesr.import";

const TABS: Record<string, { label: string; render: React.ReactNode }> = {
  mihomo: {
    label: "mihomo",
    render: <Mihomo />,
  },
  freesr: {
    label: "Freesr",
    render: <FreesrImport />,
  },
  hoyolab: {
    label: "Hoyolab",
    render: <Hoyolab />,
  },
  rr: {
    label: "Reversed Rooms",
    render: <ReversedRoom />,
  },
};

const ImportPage = () => {
  const [activeTab, setActiveTab] = useState(Object.keys(TABS)[0]);
  const tabKeys = Object.keys(TABS);
  const activeIndex = tabKeys.indexOf(activeTab);

  return (
    <div className="wrapper card">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex-1 flex flex-col min-h-0"
      >
        {/* TAB HEADERS */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, type: "keyframes" }}
          className="flex relative"
        >
          {Object.entries(TABS).map(([key, value], index) => {
            const isActive = activeTab === key;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`
                  relative p-4 cursor-pointer flex-1 flex justify-center 
                  tracking-widest transition-colors duration-300 z-10
                  ${isActive ? "text-white" : "text-white/40 hover:text-white/70"}
                `}
                onClick={() => setActiveTab(key)}
              >
                <p className="relative z-20 text-sm font-bold">{value.label}</p>

                {/* BACKGROUND ACTIVE TAB */}
                {isActive && (
                  <motion.div
                    layoutId="activeTabBackground"
                    initial={false}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-white/[0.05] rounded-t-xl"
                    transition={{
                      type: "spring",
                      bounce: 0.1,
                      duration: 0.5,
                    }}
                  >
                    {index < Object.keys(TABS).length - 1 && (
                      <div className="absolute -right-5 bottom-0 w-5 h-5 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 w-5 h-5 rounded-bl-xl shadow-[-10px_10px_0_10px_rgba(255,255,255,0.05)]" />
                      </div>
                    )}

                    {index > 0 && (
                      <div className="absolute -left-5 bottom-0 w-5 h-5 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-5 h-5 rounded-br-xl shadow-[10px_10px_0_10px_rgba(255,255,255,0.05)]" />
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </motion.div>

        {/* TAB CONTENT CONTAINER */}
        <div
          className={`
            p-6 bg-white/[0.04] flex-1 flex flex-col min-h-0 relative overflow-hidden transition-all duration-300
            rounded-b-xl
            /* Logic Rounded Top: Hilangkan rounded di area yang ada tab aktifnya */
            ${activeIndex === 0 ? "rounded-tr-xl rounded-tl-none" : ""}
            ${activeIndex === tabKeys.length - 1 ? "rounded-tl-xl rounded-tr-none" : ""}
            ${activeIndex > 0 && activeIndex < tabKeys.length - 1 ? "rounded-t-xl" : ""}
          `}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -5 }}
              transition={{ duration: 0.2 }}
            >
              {TABS[activeTab].render}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ImportPage;
