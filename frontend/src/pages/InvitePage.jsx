import { useParams } from "react-router-dom";

export default function InvitePage() {
  const { token } = useParams();

  return (
    <div>
      <h1>Mafia Invitation</h1>

      <p>You've been invited to join the Mafia!</p>

      <p>Invite Token: {token}</p>

      <button>
        Accept Invitation
      </button>
    </div>
  );
}