import "./Disclaimer.css";

export function Disclaimer() {
  return (
    <footer className="disclaimer">
      <p className="disclaimer__line">
        Educational information only &middot; Not legal or medical advice.
      </p>
      <p className="disclaimer__line disclaimer__line--crisis">
        Crisis: Women Helpline <strong className="disclaimer__accent">181</strong> &middot; iCall{" "}
        <strong className="disclaimer__accent">9152987821</strong>
      </p>
    </footer>
  );
}
