import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Users } from "lucide-react";
import AuthBrandPanel from "../components/site/AuthBrandPanel";
import { acceptInvitation, getInvitation } from "../api/team";
import { apiError } from "../api/traceability";
import { getMe } from "../api/auth";
import { useAuth } from "../context/AuthContext";
import { T } from "../styles/tokens";
import { CS } from "../styles/components";

/** Landing page for a team invitation link. */
export default function InviteAccept() {
  const { token = "" } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { data, isLoading, error } = useQuery({ queryKey: ["invite", token], queryFn: () => getInvitation(token), retry: false });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const here = encodeURIComponent(`/invite/${token}`);
  const sameUser = isAuthenticated && user?.email?.toLowerCase() === data?.email.toLowerCase();

  const accept = async () => {
    setBusy(true); setMessage("");
    try {
      await acceptInvitation(token);
      const me = await getMe();
      localStorage.setItem("user_data", JSON.stringify(me));
      window.location.href = "/dashboard";
    } catch (e) {
      setMessage(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bb-auth" style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.05fr 1fr", background: T.color.paper }}>
      <AuthBrandPanel />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: "440px" }}>
          <Users size={28} color={T.color.forest} />
          {isLoading && <p style={{ fontFamily: T.font.sans }}>Checking your invitation…</p>}
          {error && (
            <>
              <h1 style={title}>Invitation not valid</h1>
              <p style={body}>This invitation has expired or was already used. Ask your team administrator for a new link.</p>
            </>
          )}
          {data && (
            <>
              <h1 style={title}>Join {data.organization}</h1>
              <p style={body}>You have been invited as <b>{data.role_label}</b> using {data.email}.</p>
              {message && <div style={{ ...CS.errorBanner, marginBottom: "14px" }}>{message}</div>}
              {sameUser ? (
                <button style={{ ...CS.btnPrimary, width: "100%" }} disabled={busy} onClick={accept}>
                  {busy ? "Joining…" : <>Join the team <ArrowRight size={16} /></>}
                </button>
              ) : isAuthenticated ? (
                <p style={body}>You are signed in as {user?.email}. Sign out and sign in as {data.email} to accept.</p>
              ) : data.has_account ? (
                <button style={{ ...CS.btnPrimary, width: "100%" }} onClick={() => navigate(`/login?next=${here}`)}>
                  Sign in to accept <ArrowRight size={16} />
                </button>
              ) : (
                <button style={{ ...CS.btnPrimary, width: "100%" }}
                  onClick={() => navigate(`/register?invite=${token}&email=${encodeURIComponent(data.email)}&org=${encodeURIComponent(data.organization)}`)}>
                  Create your account <ArrowRight size={16} />
                </button>
              )}
              <p style={{ ...body, marginTop: "18px" }}><Link to="/" style={{ color: T.color.forest }}>Back home</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const title = { fontFamily: T.font.display, fontSize: "2rem", fontWeight: 700, color: T.color.ink, margin: "14px 0 8px", letterSpacing: "-0.03em" } as const;
const body = { fontFamily: T.font.sans, fontSize: "0.95rem", color: T.color.textMuted, margin: "0 0 18px", lineHeight: 1.5 } as const;
