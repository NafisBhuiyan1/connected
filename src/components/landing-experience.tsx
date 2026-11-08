"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { ArrowDown, ArrowUpRight, Check, Code2, Lightbulb, MessageCircle, Palette } from "lucide-react";
import { useRef } from "react";
import { Starfield } from "@/components/constellation";
import { PhoneMock } from "@/components/landing-visuals";
import styles from "./landing-experience.module.css";

/** An illustrated product scene, with transform-only scroll depth and no live-data claims. */
export function LandingHeroScene() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, -45]);
  const cardY = useTransform(scrollYProgress, [0, 1], [0, 24]);

  return (
    <div ref={ref} className={styles.scene}>
      <div className={styles.sky} aria-hidden="true">
        <Starfield />
        <svg className={styles.orbits} viewBox="0 0 520 680" fill="none">
          <ellipse cx="260" cy="340" rx="226" ry="238" transform="rotate(-28 260 340)" />
          <ellipse cx="260" cy="340" rx="288" ry="126" transform="rotate(-28 260 340)" />
          <circle cx="67" cy="309" r="4" fill="#c4b5fd" />
          <circle cx="452" cy="366" r="3" fill="#ddd6fe" />
        </svg>
      </div>
      <div className={styles.sceneHeading}>
        <span className={styles.sceneDot} /> One idea. A world of possibility.
      </div>
      <motion.div className={styles.phone} style={{ y: reduce ? 0 : phoneY }} initial={reduce ? false : { opacity: 0, rotate: 4 }} animate={{ opacity: 1, rotate: 0 }} transition={{ duration: 0.8, ease: [0.2, 0.7, 0.2, 1] }}>
        <PhoneMock />
      </motion.div>
      <motion.div className={styles.ideaCard} style={{ y: reduce ? 0 : cardY }} initial={reduce ? false : { opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, duration: 0.6 }}>
        <span className={styles.cardIcon}><Lightbulb size={17} /></span>
        <div><span className={styles.eyebrow}>Start with an idea</span><p>“I want to build<br />something useful.”</p></div>
      </motion.div>
      <motion.div className={styles.matchCard} initial={reduce ? false : { opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55, duration: 0.6 }}>
        <div className={styles.matchTitle}><Palette size={15} /> A skill you need <Check size={14} /></div>
        <div className={styles.matchPerson}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/avatars/u_maya.jpg" alt="" width={34} height={34} />
          <div><strong>Maya</strong><span>Product design</span></div>
          <ArrowUpRight size={17} />
        </div>
      </motion.div>
      <p className={styles.sceneCaption}>Illustrated preview · fictional profiles</p>
    </div>
  );
}

export function LandingConnectionTrail() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 95%", "center 55%"] });
  const steps = [
    { icon: Lightbulb, label: "Your idea", detail: "Something worth building" },
    { icon: Code2, label: "Your people", detail: "Skills that complement yours" },
    { icon: MessageCircle, label: "Your next step", detail: "A conversation with purpose" },
  ];
  return (
    <div ref={ref} className={styles.trail}>
      <div className={styles.trailTrack} aria-hidden="true"><motion.div style={{ scaleX: reduce ? 1 : scrollYProgress }} /></div>
      {steps.map((step, i) => (
        <motion.div key={step.label} className={styles.trailStep} initial={reduce ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.55, delay: i * 0.09 }}>
          <span className={styles.trailIcon}><step.icon size={18} /></span>
          <div><h3>{step.label}</h3><p>{step.detail}</p></div>
        </motion.div>
      ))}
    </div>
  );
}

export function LandingScrollCue() {
  return <a href="#how-it-works" className={styles.scrollCue}>See how connections happen <ArrowDown size={15} /></a>;
}

export function LandingFeatureReveal({ children, index }: { children: React.ReactNode; index: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.65, delay: index * 0.1, ease: [0.2, 0.7, 0.2, 1] }} className={styles.feature}>
      {children}
    </motion.div>
  );
}
