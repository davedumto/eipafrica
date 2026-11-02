import Link from "next/link";

export default function Footer() {
  return (
    <footer className="ft">
      <div className="in">
        <div className="fcols">
          <div>
            <div className="logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f0b34a" strokeWidth="1.5" aria-hidden="true">
                <rect x="2.75" y="2.75" width="18.5" height="18.5" />
                <path d="M2.75 21.25 21.25 2.75" />
                <path d="M12 12v9.25" />
              </svg>
              <span>EIP Africa</span>
            </div>
            <p>An online marketplace for energy and infrastructure opportunities in Africa.</p>
          </div>
          <div className="fnav">
            <div>
              <span>PLATFORM</span>
              <Link href="/opportunities">Opportunities</Link>
              <Link href="/organizations">Organizations</Link>
              <Link href="/listings/new">Post an opportunity</Link>
              <a href="#how">How it works</a>
            </div>
            <div>
              <span>COMPANY</span>
              <a href="#start">About</a>
              <a href="#start">FAQ</a>
              <a href="#start">Contact</a>
            </div>
            <div>
              <span>LEGAL</span>
              <Link href="/terms">Terms</Link>
              <Link href="/privacy">Privacy</Link>
              <Link href="/credits">Credits</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
