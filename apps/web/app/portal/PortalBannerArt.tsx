import Image from "next/image";
import styles from "./portal-banner.module.css";

export default function PortalBannerArt({ variant }: { variant: "plan" | "balance" }) {
  return <div className={`${styles.art} ${styles[variant]}`} aria-hidden="true">
    <Image src="/brand/doodles/cloud-soft.png" alt="" width={1024} height={1024} sizes="(max-width: 700px) 120px, 220px" className={`${styles.cloud} ${styles.cloudOne}`} />
    <Image src="/brand/doodles/cloud-round.png" alt="" width={1024} height={1024} sizes="(max-width: 700px) 144px, 210px" className={`${styles.cloud} ${styles.cloudTwo}`} />
    <Image src="/about/glossy-heart.webp" alt="" width={1248} height={1248} sizes="(max-width: 700px) 28px, 48px" className={styles.heart} />
    <Image src="/about/glass-bubble.webp" alt="" width={1248} height={1248} sizes="(max-width: 700px) 22px, 34px" className={styles.bubble} />
    <Image src="/brand/doodles/bird-flight.png" alt="" width={1024} height={1024} sizes="(max-width: 700px) 44px, 62px" className={styles.bird} />
  </div>;
}
