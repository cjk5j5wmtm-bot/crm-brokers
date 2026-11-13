import { Logo, Wordmark } from "@/lib/view";

export default function CuentaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-card">
        <div className="brand"><Logo size={44} /> <Wordmark /></div>
        {children}
      </div>
    </div>
  );
}
