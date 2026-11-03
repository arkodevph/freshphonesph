import styles from "./StoryDepth.module.css";

export default function StoryDepth() {
  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.light} />
      <div className={styles.distantClouds} />
      <div className={styles.shadow} />
      <div className={styles.nearClouds} />
    </div>
  );
}
