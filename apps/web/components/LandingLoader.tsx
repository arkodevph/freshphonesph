export default function LandingLoader() {
  return (
    <div className="landing-loader" aria-hidden="true">
      <div className="landing-loader-brand">
        <div className="landing-loader-heading">
          <p className="landing-loader-wordmark">
            <span>Fresh</span>
            <span>
              Phones<span className="landing-loader-period">.</span>
            </span>
          </p>
          <span className="landing-loader-country">PH</span>
        </div>
        <div className="landing-loader-caption">
          <span>Gadget center</span>
          <span className="landing-loader-line" />
        </div>
      </div>
      <span className="landing-loader-footer">A fresh start.</span>
    </div>
  );
}
