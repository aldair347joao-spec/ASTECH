
import { useEffect, useState } from "react";
import {
  LiveKitRoom,
  VideoConference
} from "@livekit/components-react";
import "@livekit/components-styles";
import ParticipantRoster from "./ParticipantRoster";
import { livekitAPI } from "../services/api";
import "./LiveRoom.css";

function LiveRoom({ session, canManage, onClose, onEnded }) {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState("");
  const [disconnected, setDisconnected] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function connectToRoom() {
      try {
        setLoading(true);
        setError("");
        setDisconnected(false);

        if (canManage && session.status === "scheduled") {
          await livekitAPI.startSession(session._id);
        }

        const response = await livekitAPI.getAccessToken(session._id);

        if (cancelled) return;

        if (
          !response.connection?.token ||
          !response.connection?.serverUrl
        ) {
          throw new Error(
            "O servidor não devolveu os dados de acesso à sala."
          );
        }

        setConnection(response.connection);
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message ||
              "Não foi possível entrar na videoconferência."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    connectToRoom();

    return () => {
      cancelled = true;
    };
  }, [session._id, session.status, canManage, connectionAttempt]);

  function handleRoomError(roomError) {
    console.error("Erro LiveKit:", roomError);

    setError(
      roomError?.message ||
        "O LiveKit encontrou um problema ao estabelecer a ligação."
    );
  }

  function handleDisconnected(reason) {
    console.warn("LiveKit desligado:", reason);

    setDisconnected(true);

    setError(
      reason
        ? `A ligação foi interrompida: ${String(reason)}`
        : "A ligação à sala foi interrompida."
    );
  }

  function handleRetry() {
    setConnection(null);
    setError("");
    setDisconnected(false);
    setConnectionAttempt((current) => current + 1);
  }

  async function handleEndSession() {
    const confirmed = window.confirm(
      "Tens a certeza de que pretendes terminar esta aula para todos?"
    );

    if (!confirmed) return;

    try {
      setEnding(true);
      setError("");

      await livekitAPI.endSession(session._id);

      if (onEnded) {
        await onEnded();
      }

      onClose();
    } catch (err) {
      setError(
        err.message || "Não foi possível terminar a aula."
      );
    } finally {
      setEnding(false);
    }
  }

  if (loading) {
    return (
      <div className="live-room-overlay">
        <div className="live-room-message">
          <div className="live-room-spinner" />
          <h2>A preparar a sala...</h2>
          <p>Estamos a estabelecer a ligação segura.</p>
        </div>
      </div>
    );
  }

  if (error && !connection) {
    return (
      <div className="live-room-overlay">
        <div className="live-room-message">
          <h2>Não foi possível entrar</h2>
          <p>{error}</p>

          <button type="button" onClick={handleRetry}>
            Tentar novamente
          </button>

          <button type="button" onClick={onClose}>
            Voltar à Academia
          </button>
        </div>
      </div>
    );
  }

  if (!connection) return null;

  return (
    <div className="live-room-overlay">
      <header className="live-room-header">
        <div>
          <span>ALDAIR ONE ACADEMY</span>
          <h2>{session.title}</h2>
          <p>
            {session.class?.name || "Sala de videoconferência"}
          </p>
        </div>

        <div className="live-room-header-actions">
          {canManage && (
            <button
              type="button"
              className="live-room-end-button"
              disabled={ending}
              onClick={handleEndSession}
            >
              {ending ? "A terminar..." : "Terminar aula"}
            </button>
          )}

          <button
            type="button"
            className="live-room-exit-button"
            onClick={onClose}
          >
            Sair da sala
          </button>
        </div>
      </header>

      {error && (
        <div className="live-room-error">
          {error}

          {disconnected && (
            <button
              type="button"
              onClick={handleRetry}
              style={{ marginLeft: "12px" }}
            >
              Tentar novamente
            </button>
          )}
        </div>
      )}

      <main className="live-room-content">
        <LiveKitRoom
          key={connectionAttempt}
          serverUrl={connection.serverUrl}
          token={connection.token}
          connect={true}
          audio={true}
          video={true}
          onError={handleRoomError}
          onDisconnected={handleDisconnected}
          options={{
            adaptiveStream: true,
            dynacast: true
          }}
                >
          <VideoConference />
          <ParticipantRoster
  sessionId={session._id}
  canManage={canManage}
/>
        </LiveKitRoom>
      </main>
    </div>
  );
}

export default LiveRoom;
