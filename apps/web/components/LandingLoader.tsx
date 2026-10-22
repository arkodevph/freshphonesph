export default function LandingLoader() {
  return (
    <div className="landing-loader" aria-hidden="true">
      <div className="landing-loader-panels">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="landing-loader-content">
        <div className="landing-loader-wordmark-mask">
          <span className="landing-loader-brand">
            Fresh Phones <span>PH.</span>
          </span>
        </div>
        <span className="landing-loader-caption">Gadget Center</span>
        <span className="landing-loader-line" />
      </div>
    </div>
  );
}
