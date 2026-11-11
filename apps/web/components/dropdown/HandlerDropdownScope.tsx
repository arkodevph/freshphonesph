"use client";

import { createContext, useContext, type ReactNode } from "react";

const HandlerDropdownContext = createContext(false);

export function HandlerDropdownScope({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  return (
    <HandlerDropdownContext.Provider value={enabled}>
      {children}
    </HandlerDropdownContext.Provider>
  );
}

export function useHandlerDropdowns() {
  return useContext(HandlerDropdownContext);
}
