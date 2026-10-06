"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { List, X, SignIn } from "@phosphor-icons/react";

const links = [
  { href: "/#top", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/#units", label: "Units" },
  { href: "/#how", label: "How it Works" },
  { href: "/#careers", label: "Careers" },
  { href: "/#contact", label: "Contact" },
];

export default function Navbar({ immersive = false }: { immersive?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const sentinel = useRef<HTMLSpanElement | null>(null);

  // IntersectionObserver instead of a per-frame scroll listener
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const io = new IntersectionObserver(
      ([entry]) => setScrolled(!entry.isIntersecting),
      { rootMargin: "-16px 0px 0px 0px", threshold: 0 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <span
        ref={sentinel}
        aria-hidden
        className="absolute left-0 top-0 h-px w-px"
        style={immersive ? { top: "calc(100svh - 5rem)" } : undefined}
      />
      <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
        <nav
          className={`mx-auto flex h-16 max-w-7xl items-center justify-between rounded-full px-3 transition-all duration-300 sm:px-4 ${
            scrolled ? "glass !bg-white" : immersive ? "bg-transparent" : "bg-white/30 backdrop-blur-sm"
          }`}
        >
          <a href="/#top" className="flex items-center gap-2.5 pl-1">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-2xl chrome">
              <Image
                src="/brand/fresh-phones-logo.png"
                alt="Fresh Phones PH logo"
                width={40}
                height={40}
                className="h-9 w-9 scale-150 object-cover"
              />
            </span>
            <span className="font-display text-lg font-700 leading-none tracking-tight text-blue-ink">
              Fresh Phones <span className="holo-text">PH</span>
            </span>
          </a>

          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="rounded-full px-3.5 py-2 text-sm font-700 text-ink-soft transition-colors hover:bg-white/60 hover:text-blue"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="btn-candy hidden items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-700 sm:inline-flex"
            >
              <SignIn weight="bold" className="h-4 w-4" />
              Login Portal
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              className="grid h-10 w-10 place-items-center rounded-full bg-white/70 text-blue-ink lg:hidden"
            >
              {open ? <X className="h-5 w-5" /> : <List className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="glass mx-auto mt-2 max-w-7xl rounded-3xl p-3 lg:hidden">
            <ul className="flex flex-col">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-2xl px-4 py-3 font-600 text-ink-soft hover:bg-white/70 hover:text-blue"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              <li className="mt-1 px-1">
                <a
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="btn-candy flex items-center justify-center gap-1.5 rounded-2xl px-5 py-3 font-700"
                >
                  <SignIn weight="bold" className="h-4 w-4" />
                  Login Portal
                </a>
              </li>
            </ul>
          </div>
        )}
      </header>
    </>
  );
}
