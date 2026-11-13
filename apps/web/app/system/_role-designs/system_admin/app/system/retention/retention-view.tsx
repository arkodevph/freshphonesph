"use client";

import { type Page } from "@freshphones/contracts";

export const date = (value: string | null) => {
  return value
    ? new Date(value).toLocaleString("en-PH")
    : "Awaiting an approved policy";
};

export const emptyPage = <T,>(): Page<T> => {
  return { items: [], total: 0, page: 1, pageSize: 20 };
};
