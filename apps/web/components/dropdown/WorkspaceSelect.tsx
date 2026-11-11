"use client";

import {
  Children,
  isValidElement,
  useId,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { useHandlerDropdowns } from "./HandlerDropdownScope";
import { HandlerSelect } from "./HandlerSelect";
import type { DropdownOption } from "./useDropdownSelect";

type Props = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  onValueChange: (value: string) => void;
};

function optionText(children: ReactNode): string {
  return Children.toArray(children)
    .map((child): string => {
      if (isValidElement<{ children?: ReactNode }>(child)) {
        return optionText(child.props.children);
      }

      return String(child);
    })
    .join("");
}

function collectOptions(children: ReactNode): DropdownOption[] {
  return Children.toArray(children).flatMap((child): DropdownOption[] => {
    if (
      !isValidElement<{
        value?: string | number;
        label?: string;
        disabled?: boolean;
        children?: ReactNode;
      }>(child)
    ) {
      return [];
    }

    if (child.type !== "option") {
      return collectOptions(child.props.children);
    }

    const label = child.props.label ?? optionText(child.props.children);

    return [
      {
        value: String(child.props.value ?? label),
        label,
        disabled: child.props.disabled,
      },
    ];
  });
}

/** Keep native controls for other roles; Handler labels use the shared searchable dropdown. */
export function WorkspaceSelect({ onValueChange, children, ...props }: Props) {
  const enabled = useHandlerDropdowns();

  const generated = useId();

  if (!enabled) {
    return (
      <select
        {...props}
        onChange={(event) => {
          onValueChange(event.target.value);
        }}
      >
        {children}
      </select>
    );
  }

  return (
    <HandlerSelect
      id={props.id ?? generated}
      labelId={props["aria-labelledby"]}
      label={props["aria-label"]}
      value={String(props.value ?? "")}
      options={collectOptions(children)}
      onValueChange={onValueChange}
      disabled={props.disabled}
      required={props.required}
      name={props.name}
      form={props.form}
      className={props.className}
    />
  );
}
