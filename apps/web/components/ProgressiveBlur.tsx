import styles from "./progressive-blur.module.css";

export default function ProgressiveBlur({
  desktopOnly = false,
}: {
  desktopOnly?: boolean;
}) {
  return (
    <div
      className={`${styles.edge}${desktopOnly ? ` ${styles.desktopOnly}` : ""}`}
      aria-hidden="true"
      data-progressive-blur=""
    >
      {Array.from({ length: 7 }, (_, index) => {
        return <div key={index} />;
      })}
    </div>
  );
}
