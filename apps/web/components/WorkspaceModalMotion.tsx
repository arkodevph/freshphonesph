"use client";

import { useEffect } from "react";
import { advanceMenuSpring } from "@/lib/menu-spring";

/** Native dialogs retain focus trapping and existing cancel/draft guards. */
function attachMotion(dialog: HTMLDialogElement) {
  const show = dialog.showModal.bind(dialog);
  const close = dialog.close.bind(dialog);
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  let motion = { position: dialog.open ? 1 : 0, velocity: 0 };
  let target = dialog.open ? 1 : 0;
  let frame = 0;
  let previous: number | null = null;
  let closing = false;
  let returnValue: string | undefined;

  dialog.dataset.modalSpring = "";

  function paint() {
    dialog.style.setProperty(
      "--dialog-progress",
      String(Math.max(0, Math.min(1, motion.position))),
    );
  }

  function settle() {
    cancelAnimationFrame(frame);
    frame = 0;
    motion = { position: target, velocity: 0 };
    paint();
    if (closing) {
      closing = false;
      close(returnValue);
    }
  }

  function tick(time: number) {
    motion = advanceMenuSpring(
      motion,
      target,
      previous === null ? 1 / 120 : (time - previous) / 1000,
    );
    previous = time;
    paint();
    if (
      Math.abs(motion.position - target) < 0.001 &&
      Math.abs(motion.velocity) < 0.01
    ) {
      settle();
    } else {
      frame = requestAnimationFrame(tick);
    }
  }

  function animate() {
    cancelAnimationFrame(frame);
    previous = null;
    if (preference.matches || document.hidden) {
      settle();
    } else {
      frame = requestAnimationFrame(tick);
    }
  }

  dialog.showModal = () => {
    closing = false;
    target = 1;
    paint();
    show();
    animate();
  };

  dialog.close = (value?: string) => {
    if (!dialog.open) {
      return;
    }
    closing = true;
    returnValue = value;
    target = 0;
    animate();
  };

  function onClose() {
    cancelAnimationFrame(frame);
    closing = false;
    motion = { position: 0, velocity: 0 };
    target = 0;
    paint();
  }

  function onPreference() {
    if (preference.matches) {
      settle();
    }
  }
  function onVisibility() {
    if (document.hidden) {
      settle();
    }
  }
  dialog.addEventListener("close", onClose);
  preference.addEventListener("change", onPreference);
  document.addEventListener("visibilitychange", onVisibility);
  paint();

  return () => {
    cancelAnimationFrame(frame);
    dialog.showModal = show;
    dialog.close = close;
    dialog.removeEventListener("close", onClose);
    preference.removeEventListener("change", onPreference);
    document.removeEventListener("visibilitychange", onVisibility);
    delete dialog.dataset.modalSpring;
    dialog.style.removeProperty("--dialog-progress");
  };
}

export default function WorkspaceModalMotion() {
  useEffect(() => {
    const attached = new Map<HTMLDialogElement, () => void>();

    function scan() {
      document
        .querySelectorAll<HTMLDialogElement>(
          ".system-shell dialog[data-workspace-modal]:not([data-modal-spring]), dialog[data-handler-modal]:not([data-modal-spring])",
        )
        .forEach((dialog) => {
          if (!attached.has(dialog)) {
            attached.set(dialog, attachMotion(dialog));
          }
        });
      for (const [dialog, dispose] of attached) {
        if (!dialog.isConnected) {
          dispose();
          attached.delete(dialog);
        }
      }
    }

    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    scan();

    return () => {
      observer.disconnect();
      attached.forEach((dispose) => dispose());
    };
  }, []);

  return null;
}
