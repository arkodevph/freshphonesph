import styles from "./HeroDeviceWord.module.css";

export default function HeroDeviceWord() {
  return (
    <span className={styles.slot} aria-hidden="true">
      <span className={styles.word}>phone,</span>
      <span className={styles.word}>iPhone,</span>
      <span className={styles.word}>iPad,</span>
    </span>
  );
}
