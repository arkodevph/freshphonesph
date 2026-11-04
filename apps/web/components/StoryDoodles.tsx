import DoodleIcon from "./DoodleIcon";
import styles from "./StoryDoodles.module.css";

const artwork = {
  choose: ["phone-heart", "shield-heart", "chat-heart"],
  rhythm: ["calendar-heart", "wallet-heart", "phone-heart"],
  finale: ["package-check", "phone-heart", "shield-heart"],
} as const;

export default function StoryDoodles({
  stage,
}: {
  stage: keyof typeof artwork;
}) {
  const positions = [styles.one, styles.two, styles.three];

  return (
    <div
      className={`${styles.group} ${styles[stage]}`}
      aria-hidden="true"
      data-story-doodles={stage}
    >
      {artwork[stage].map((name, index) => {
        return (
          <span key={name} className={positions[index]}>
            <DoodleIcon name={name} size={64} className={styles.icon} />
          </span>
        );
      })}
    </div>
  );
}
