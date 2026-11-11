"use client";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
} from "react";
import { CalendarBlank, CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import {
  calendarDate,
  calendarDays,
  localToday,
  moveCalendarDate,
  moveCalendarMonth,
} from "@/lib/calendar-date";
import { useSpringDialog } from "@/lib/useSpringDialog";
import styles from "./date-input.module.css";
import FormSelect from "./FormSelect";

type Props = Omit<ComponentProps<"input">, "type"> & {
  type?: "date" | "datetime-local";
};

const monthNames = Array.from({ length: 12 }, (_, month) => {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, month, 1)));
});

export default function DateInput({
  type = "date",
  ref,
  onKeyDown,
  className = "",
  ...props
}: Props) {
  const input = useRef<HTMLInputElement>(null);

  const trigger = useRef<HTMLButtonElement>(null);

  const dialog = useRef<HTMLDialogElement>(null);

  const focusRequested = useRef(false);

  const id = useId();

  const [open, setOpen] = useState(false);

  const [selected, setSelected] = useState("");

  const [active, setActive] = useState("");

  const [month, setMonth] = useState("");

  const [time, setTime] = useState({ hour: "09", minute: "00" });

  const [error, setError] = useState("");

  useSpringDialog(dialog, open, () => {
    trigger.current?.focus();
  });

  function allowed(day: string) {
    return (
      Boolean(day) &&
      (!props.min || day >= String(props.min).slice(0, 10)) &&
      (!props.max || day <= String(props.max).slice(0, 10))
    );
  }

  function begin() {
    if (input.current?.matches(":disabled") || input.current?.readOnly) {
      return;
    }

    const current = input.current?.value ?? "";

    const saved = current.slice(0, 10);

    let day = calendarDate(saved) ? saved : localToday();

    if (props.min && day < String(props.min).slice(0, 10)) {
      day = String(props.min).slice(0, 10);
    }

    if (props.max && day > String(props.max).slice(0, 10)) {
      day = String(props.max).slice(0, 10);
    }

    setSelected(calendarDate(saved) ? saved : day);

    setActive(day);

    setMonth(day);

    setTime({
      hour: current.slice(11, 13) || "09",
      minute: current.slice(14, 16) || "00",
    });

    setError("");

    focusRequested.current = true;

    setOpen(true);
  }

  function commit(value: string) {
    const element = input.current;

    if (!element || element.matches(":disabled") || element.readOnly) {
      return;
    }

    const previous = element.value;

    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;

    setter.call(element, value);

    if (value && !element.checkValidity()) {
      const message = element.validationMessage;

      setter.call(element, previous);

      setError(message);

      return;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));

    element.dispatchEvent(new Event("change", { bubbles: true }));

    setOpen(false);
  }

  function choose(day: string) {
    setSelected(day);

    setActive(day);

    setError("");

    if (type === "date") {
      commit(day);
    }
  }

  function focusDay(day: string) {
    if (!allowed(day)) {
      return;
    }

    focusRequested.current = true;

    setActive(day);

    setMonth(day);
  }

  function dayKey(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const weekday = calendarDate(day)!.getUTCDay();

    const next = {
      ArrowLeft: moveCalendarDate(day, -1),
      ArrowRight: moveCalendarDate(day, 1),
      ArrowUp: moveCalendarDate(day, -7),
      ArrowDown: moveCalendarDate(day, 7),
      Home: moveCalendarDate(day, -weekday),
      End: moveCalendarDate(day, 6 - weekday),
      PageUp: moveCalendarMonth(day, event.shiftKey ? -12 : -1),
      PageDown: moveCalendarMonth(day, event.shiftKey ? 12 : 1),
    }[event.key];

    if (next) {
      event.preventDefault();

      focusDay(next);
    }
  }

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function position() {
      const anchor = input.current?.getBoundingClientRect();

      const panel = dialog.current;

      if (!anchor || !panel) {
        return;
      }

      const width = panel.offsetWidth;

      const height = panel.offsetHeight;

      panel.style.left = `${Math.max(12, Math.min(anchor.right - width, innerWidth - width - 12))}px`;

      const below = anchor.bottom + 8;

      const above = anchor.top - height - 8;

      panel.style.top = `${Math.max(12, Math.min(below + height <= innerHeight - 12 ? below : above, innerHeight - height - 12))}px`;
    }

    position();

    const frame = requestAnimationFrame(() => {
      if (focusRequested.current) {
        dialog.current
          ?.querySelector<HTMLButtonElement>(
            "[data-calendar-day][tabindex='0']",
          )
          ?.focus();

        focusRequested.current = false;
      }
    });

    window.addEventListener("resize", position);

    return () => {
      cancelAnimationFrame(frame);

      window.removeEventListener("resize", position);
    };
  }, [open, active, month, error]);

  const days = month ? calendarDays(month) : [];

  const year = Number(month.slice(0, 4));

  return (
    <span className={styles.root} data-date-input>
      <input
        {...props}
        type={type}
        className={`${className} ${styles.input}`}
        ref={(element) => {
          input.current = element;

          if (typeof ref === "function") {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event);

          if (
            !event.defaultPrevented &&
            ((event.altKey && event.key === "ArrowDown") || event.key === "F4")
          ) {
            event.preventDefault();

            begin();
          }
        }}
      />
      <button
        className={styles.trigger}
        ref={trigger}
        type="button"
        aria-label={
          type === "datetime-local" ? "Choose date and time" : "Choose date"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        disabled={props.disabled || props.readOnly}
        onClick={(event) => {
          event.preventDefault();

          begin();
        }}
      >
        <CalendarBlank aria-hidden="true" />
      </button>
      <dialog
        ref={dialog}
        id={id}
        data-calendar
        className={styles.dialog}
        aria-label={
          type === "datetime-local" ? "Choose date and time" : "Choose date"
        }
        onCancel={(event) => {
          event.preventDefault();

          event.stopPropagation();

          setOpen(false);
        }}
        onClose={(event) => {
          event.stopPropagation();

          if (!dialog.current?.open) {
            setOpen(false);

            trigger.current?.focus();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();

            event.stopPropagation();

            setOpen(false);

            return;
          }

          if (
            event.key === "Enter" &&
            event.target instanceof HTMLInputElement
          ) {
            event.preventDefault();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const rect = event.currentTarget.getBoundingClientRect();

            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            ) {
              setOpen(false);
            }
          }
        }}
      >
        <fieldset className={styles.calendarFields} disabled={!open}>
          <header className={styles.header}>
            <button
              type="button"
              className={styles.nav}
              aria-label="Previous month"
              disabled={
                !month ||
                moveCalendarMonth(month, -1) === month ||
                (!allowed(`${moveCalendarMonth(month, -1).slice(0, 7)}-31`) &&
                  Boolean(props.min) &&
                  moveCalendarMonth(month, -1).slice(0, 7) <
                    String(props.min).slice(0, 7))
              }
              onClick={() => {
                return focusDay(
                  moveCalendarMonth(`${month.slice(0, 7)}-01`, -1),
                );
              }}
            >
              <CaretLeft aria-hidden="true" />
            </button>
            <div className={styles.monthControls}>
              <FormSelect
                label="Month"
                value={month.slice(5, 7)}
                options={monthNames.map((label, index) => {
                  return {
                    label,
                    value: String(index + 1).padStart(2, "0"),
                  };
                })}
                onValueChange={(next) => {
                  const day = `${year}-${next}-01`;

                  setMonth(day);

                  setActive(day);
                }}
              />
              <input
                aria-label="Year"
                inputMode="numeric"
                type="number"
                min="1"
                max="9999"
                value={year || ""}
                onChange={(event) => {
                  const next = Number(event.target.value);

                  if (Number.isInteger(next) && next >= 1 && next <= 9999) {
                    const day = `${String(next).padStart(4, "0")}-${month.slice(5, 7)}-01`;

                    setMonth(day);

                    setActive(day);
                  }
                }}
              />
            </div>
            <button
              type="button"
              className={styles.nav}
              aria-label="Next month"
              disabled={
                !month ||
                moveCalendarMonth(month, 1) === month ||
                (Boolean(props.max) &&
                  moveCalendarMonth(month, 1).slice(0, 7) >
                    String(props.max).slice(0, 7))
              }
              onClick={() => {
                return focusDay(
                  moveCalendarMonth(`${month.slice(0, 7)}-01`, 1),
                );
              }}
            >
              <CaretRight aria-hidden="true" />
            </button>
          </header>
          <span className={styles.srOnly} aria-live="polite">
            {monthNames[Number(month.slice(5, 7)) - 1]} {year}
          </span>
          <table
            className={styles.grid}
            role="grid"
            aria-label="Calendar"
            aria-multiselectable="false"
          >
            <thead>
              <tr>
                {[
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((day) => {
                  return (
                    <th key={day} scope="col">
                      <abbr title={day}>{day.slice(0, 2)}</abbr>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }, (_, week) => {
                return (
                  <tr key={week}>
                    {days.slice(week * 7, week * 7 + 7).map((day, index) => {
                      return (
                        <td key={day || index} aria-selected={day === selected}>
                          <button
                            type="button"
                            data-calendar-day={day}
                            className={styles.day}
                            data-outside={day.slice(0, 7) !== month.slice(0, 7)}
                            data-selected={day === selected}
                            aria-label={
                              day
                                ? new Intl.DateTimeFormat("en", {
                                    dateStyle: "full",
                                    timeZone: "UTC",
                                  }).format(calendarDate(day)!)
                                : "Unavailable"
                            }
                            aria-current={
                              day === localToday() ? "date" : undefined
                            }
                            disabled={!allowed(day)}
                            tabIndex={day === active ? 0 : -1}
                            onFocus={() => {
                              return setActive(day);
                            }}
                            onKeyDown={(event) => {
                              return dayKey(event, day);
                            }}
                            onClick={() => {
                              return choose(day);
                            }}
                          >
                            {day ? Number(day.slice(8, 10)) : ""}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          {type === "datetime-local" && (
            <div className={styles.time}>
              <span>Time · 24h</span>
              <label className={styles.srOnly} htmlFor={`${id}-hour`}>
                Hour
              </label>
              <input
                id={`${id}-hour`}
                type="number"
                inputMode="numeric"
                min="0"
                max="23"
                value={time.hour}
                onChange={(event) => {
                  return setTime({ ...time, hour: event.target.value });
                }}
              />
              <span aria-hidden="true">:</span>
              <label className={styles.srOnly} htmlFor={`${id}-minute`}>
                Minute
              </label>
              <input
                id={`${id}-minute`}
                type="number"
                inputMode="numeric"
                min="0"
                max="59"
                value={time.minute}
                onChange={(event) => {
                  return setTime({ ...time, minute: event.target.value });
                }}
              />
            </div>
          )}
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <footer className={styles.footer}>
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                return commit("");
              }}
            >
              Clear
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={() => {
                const today = localToday();

                if (allowed(today)) {
                  focusDay(today);

                  choose(today);
                }
              }}
              disabled={!allowed(localToday())}
            >
              Today
            </button>
            {type === "datetime-local" ? (
              <button
                type="button"
                className={`${styles.action} ${styles.apply}`}
                disabled={
                  !allowed(selected) ||
                  time.hour === "" ||
                  time.minute === "" ||
                  Number(time.hour) < 0 ||
                  Number(time.hour) > 23 ||
                  Number(time.minute) < 0 ||
                  Number(time.minute) > 59
                }
                onClick={() => {
                  return commit(
                    `${selected}T${time.hour.padStart(2, "0")}:${time.minute.padStart(2, "0")}${input.current?.value.slice(16) ?? ""}`,
                  );
                }}
              >
                Apply
              </button>
            ) : (
              <button
                type="button"
                className={styles.action}
                aria-label="Close calendar"
                onClick={() => {
                  return setOpen(false);
                }}
              >
                <X aria-hidden="true" />
              </button>
            )}
          </footer>
        </fieldset>
      </dialog>
    </span>
  );
}
