"use client";

import { Children, isValidElement, type ComponentProps } from "react";
import AnimatedDisclosure from "@/app/system/_role-designs/analytics/components/AnimatedDisclosure";

type Props = ComponentProps<"details"> & {
  onExpandedChange?: (open: boolean) => void;
};

/** Retains existing summary content, attributes and lazy-load toggle handlers. */
export default function WorkspaceDetails({
  children,
  className,
  open,
  onExpandedChange,
  ...props
}: Props) {
  const elements = Children.toArray(children);

  const summary = elements.find((child) => {
    return isValidElement(child) && child.type === "summary";
  });

  if (!isValidElement<ComponentProps<"summary">>(summary)) {
    return (
      <details {...props} className={className} open={open}>
        {children}
      </details>
    );
  }

  const { children: title, ...summaryProps } = summary.props;

  return (
    <AnimatedDisclosure
      className={className}
      title={title}
      open={open}
      onExpandedChange={onExpandedChange}
      detailsProps={props}
      summaryProps={summaryProps}
      indicator={
        (typeof title === "string" && title.trim() !== "•••") ||
        typeof title === "number"
      }
    >
      {elements.filter((child) => {
        return child !== summary;
      })}
    </AnimatedDisclosure>
  );
}
