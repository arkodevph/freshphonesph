"use client";

import { useEffect, useId, useRef, type SVGProps } from "react";
import icons from "@/generated/jiggicons/icons.json";
import {
  bindTrigger,
  markupOf,
  stop,
  type JiggiconData,
} from "@/generated/jiggicons/src/index.js";
import styles from "./jiggicons.module.css";
import { creativeIcon, playCreativeIcon } from "./jiggicons-motion";

// Original free Jiggicons glass artwork by Adrian Abelarde.
// Freshphones choreography: jiggicons-choreography.json.
// Copied source and licence: generated/jiggicons/.
const glassIcons: Record<string, JiggiconData> = icons;

function glassIcon(name: string) {
  const icon = creativeIcon(glassIcons[name]);

  return function GlassIcon({ className, ...props }: SVGProps<SVGSVGElement>) {
    const ref = useRef<SVGSVGElement>(null);

    const uid = useId();

    useEffect(() => {
      const element = ref.current;

      if (!element) {
        return;
      }

      const unbind = bindTrigger(element, "hover", () => {
        // Preserve the current motion on rapid re-entry instead of snapping back.
        if (
          element.getAnimations({ subtree: true }).some((animation) => {
            return animation.playState === "running";
          })
        ) {
          return;
        }

        playCreativeIcon(element, icon);
      });

      const preference = window.matchMedia("(prefers-reduced-motion: reduce)");

      const respectMotion = () => {
        if (preference.matches) {
          stop(element);
        }
      };

      preference.addEventListener("change", respectMotion);

      return () => {
        unbind();

        stop(element);

        preference.removeEventListener("change", respectMotion);
      };
    }, []);

    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={24}
        height={24}
        fill="currentColor"
        aria-hidden="true"
        focusable="false"
        className={`${styles.icon}${className ? ` ${className}` : ""}`}
        data-jigg-icon={name}
        data-variant="glass"
        {...props}
        ref={ref}
        dangerouslySetInnerHTML={{ __html: markupOf(icon, "glass", uid) }}
      />
    );
  };
}

export const Home = glassIcon("home");

export const Calendar = glassIcon("calendar");

export const Reports = glassIcon("receipt");

export const Assistant = glassIcon("bot");

export const Personnel = glassIcon("briefcase");

export const Clients = glassIcon("emoji");

export const Agents = glassIcon("handshake");

export const Network = glassIcon("globe");

export const Recruitment = glassIcon("megaphone");

export const Lock = glassIcon("lock");

export const Monitor = glassIcon("eye");

export const Phone = glassIcon("phone");

export const Enrollment = glassIcon("send");

export const Records = glassIcon("folder");

export const Money = glassIcon("money");

export const Clock = glassIcon("clock");

export const Download = glassIcon("download");

export const Message = glassIcon("message");

export const Support = glassIcon("headset");

export const Users = glassIcon("key");

export const Bell = glassIcon("bell");

export const Retention = glassIcon("broom");

export const Package = glassIcon("cube");

export const Settings = glassIcon("toggle-left");

export const Logout = glassIcon("door");
