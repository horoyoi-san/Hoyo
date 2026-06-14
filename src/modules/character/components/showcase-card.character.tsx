import LightconeShowcase from "./showcase/lightcone.showcase";
import SkillsShowcase from "./showcase/skills.showcase";
import RelicShowcase from "./showcase/relic.showcase";
import StatsShowcase from "./showcase/stats.showcase";
import { motion } from "motion/react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delay: 0.5,
      duration: 0.2,
      delayChildren: 1.5,
      staggerChildren: 0.6,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      when: "afterChildren",
      staggerChildren: 0.2,
      staggerDirection: -1,
    },
  },
};

const ShowcaseCard = () => {
  return (
    <motion.div
      className="grid grid-cols-2 mt-2 relative flex-1"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {/* RANK/EIDOLON */}
      {/* <EidolonShowcase /> */}

      {/* STAT & LIGHTCONE */}
      <div className="flex flex-col gap-4 justify-between">
        {/* LIGHTCONE SECTION */}
        <LightconeShowcase />

        <SkillsShowcase />

        {/* STAT SECTION */}
        <StatsShowcase />
      </div>

      {/* RELIC */}
      <RelicShowcase />
    </motion.div>
  );
};

export default ShowcaseCard;
