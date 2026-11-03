import styles from "./Halftone.module.css";

export default function Halftone() {
  return (
    <span aria-hidden="true" data-halftone="true" className={styles.pattern} />
  );
}
