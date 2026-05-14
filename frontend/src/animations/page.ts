import type { HTMLMotionProps } from "framer-motion"

type MotionSectionProps = Pick<HTMLMotionProps<"section">, "initial" | "animate" | "exit" | "transition">

export const pageTransition = {
  initial: { opacity: 0, y: 12, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -8, filter: "blur(8px)" },
  transition: { duration: 0.32, ease: "easeOut" },
} satisfies MotionSectionProps

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.055,
    },
  },
}

export const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
}
