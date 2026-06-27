import Reveal from "./Reveal";

type Props = {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  center?: boolean;
};

export default function SectionHeading({
  eyebrow,
  title,
  subtitle,
  center = true,
}: Props) {
  return (
    <Reveal
      className={`max-w-2xl ${center ? "mx-auto text-center" : ""}`}
    >
      {eyebrow && (
        <span className="pill mb-3 inline-block rounded-full px-3.5 py-1 text-xs font-700 uppercase tracking-wider text-blue">
          {eyebrow}
        </span>
      )}
      <h2 className="font-display text-3xl font-700 leading-tight tracking-tight text-blue-ink sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base font-500 text-ink-soft sm:text-lg">
          {subtitle}
        </p>
      )}
    </Reveal>
  );
}
