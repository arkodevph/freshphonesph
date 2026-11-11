# Navbar content clearance

The user's local screenshot is the controlling visual reference. Preserve its
sky blue background, navy text, pink action, glass navigation pill and footer
scene. This is a spacing correction to that existing design.

The fixed navbar occupied no layout space. At1728×990, the verification card
began at65.94px while the navigation pill ended at78px, creating a12px overlap.
The navbar now occupies a sticky sky-backed band. Its opaque existing sky
color prevents scrolling text and card edges showing through the pill. Public
pages no longer add a second fixed-header spacer, and the homepage hero
subtracts the header allowance from its viewport height. Anchor targets retain
clearance. Compact desktop verification-card padding keeps the whole card
visible above the footer at the reported size.

Chromium checks at1728×990,1280×720,768×1024,390×844 and320×740 pass initial
content clearance, sticky header, anchor clearance for units/how/join, and no
horizontal overflow. At1728×990 the card starts at118.94px, below the94px header
band and78px navigation pill. The mobile About page also clears the navbar.
Inspected desktop footer, mobile verification-card and mobile About screenshots
against the supplied composition; existing colors, typography and glass card
treatment remain. Smaller screens scroll to view the full footer.

Evidence: `/tmp/freshphones-navbar-check.py`, `/tmp/fresh-navbar-results.json`,
`/tmp/fresh-navbar-after-1728.png`, `/tmp/fresh-navbar-join-390.png`, and
`/tmp/fresh-navbar-about-390.png`. Protected optimized build (including
TypeScript), scoped formatting and whitespace checks pass. Changes remain
local. Firefox/Safari and physical-display verification remain unknown.

Session memory sync is unavailable because the Obsidian vault's `/mnt/storage`
device is disconnected. This document preserves the verified local handoff.
