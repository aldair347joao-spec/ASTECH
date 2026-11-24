
import { useEffect, useRef, useState } from "react";
import { LiveKitRoom } from "@livekit/components-react";
import "@livekit/components-styles";

import LiveClassroom from "./LiveClassroom";
import { livekitAPI } from "../services/api";
import "./LiveRoom.css";

function LiveRoom({ session, canManage, onClose, onEnded }) {
  const [connection, setConnection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState("");
  const [disconnected, setDisconnected] = useState(false);
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [recordingStatus, setRecordingStatus] = useState("");

  const recordingStartedRef = useRef(false);
  const endingHandledRef = useRef(false);

  const recordingEnabled = session.recording?.enabled === true;

  const isRecording = /gravação ativa|gravação já se encontra ativa/i.test(
    recordingStatus
  );

  const isRecordingStarting = /a iniciar a gravação/i.test(
    recordingStatus
  );

  const isRecordingFinalizing =
    finalizing || /a finalizar e guardar/i.test(recordingStatus);

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

  async function handleRoomConnected() {
    setDisconnected(false);
    setError("");

    // Apenas o formador ou administrador pode iniciar a gravação.
    if (!canManage || !recordingEnabled) return;

    // Evita pedidos repetidos durante reconexões.
    if (recordingStartedRef.current) return;

    recordingStartedRef.current = true;
    setRecordingStatus("A iniciar a gravação...");

    try {
      const response = await livekitAPI.startRecording(session._id);

      if (
        response.success === false &&
        !response.message?.toLowerCase().includes("already")
      ) {
        throw new Error(
          response.message || "Não foi possível iniciar a gravação."
        );
      }

      setRecordingStatus("Gravação ativa.");
    } catch (err) {
      const message = err.message || "";

      // Uma gravação já iniciada não deve ser tratada como falha.
      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("in progress") ||
        message.toLowerCase().includes("já está")
      ) {
        setRecordingStatus("Gravação já se encontra ativa.");
        return;
      }

      recordingStartedRef.current = false;

      setRecordingStatus(
        "Não foi possível iniciar a gravação automaticamente."
      );

      console.error("Erro ao iniciar gravação:", err);
    }
  }

  function handleRoomError(roomError) {
    console.error("Erro LiveKit:", roomError);

    setError(
      roomError?.message ||
        "O LiveKit encontrou um problema ao estabelecer a ligação."
    );
  }

  async function handleDisconnected(reason) {
    console.warn("LiveKit desligado:", reason);

    setDisconnected(true);

    // Se o encerramento foi solicitado e o webhook confirmou
    // o fim da gravação, atualiza a Academia.
    if (finalizing && !endingHandledRef.current) {
      endingHandledRef.current = true;

      try {
        if (onEnded) {
          await onEnded();
        }
      } catch (err) {
        console.error("Erro ao atualizar a Academia:", err);
      }

      onClose();
      return;
    }

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

      const response = await livekitAPI.endSession(session._id);

      // A gravação ainda está a ser finalizada no LiveKit.
      // A sala só fecha depois da confirmação do webhook.
      if (response.pending === true) {
        setFinalizing(true);
        setRecordingStatus("A finalizar e guardar a gravação...");
        return;
      }

      if (!endingHandledRef.current) {
        endingHandledRef.current = true;

        if (onEnded) {
          await onEnded();
        }
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
        <div className="live-room-brand">
          <div className="live-room-brand-mark">AO</div>

          <div className="live-room-brand-copy">
            <span>ALDAIR ONE</span>
            <small>ACADEMY · VIRTUAL CLASSROOM</small>
          </div>
        </div>

        <div className="live-room-session-info">
          <h2>{session.title}</h2>
          <p>
            {session.class?.name || "Sala de videoconferência"}
          </p>
        </div>

        <div className="live-room-header-actions">
          <span className="live-room-room-badge">
            <span className="live-room-status-dot" />
            SALA VIRTUAL
          </span>

          {canManage && (
            <button
              type="button"
              className="live-room-end-button"
              disabled={ending || finalizing}
              onClick={handleEndSession}
            >
              {finalizing
                ? "A guardar gravação..."
                : ending
                  ? "A terminar..."
                  : "Terminar aula"}
            </button>
          )}

          <button
            type="button"
            className="live-room-exit-button"
            disabled={finalizing}
            onClick={onClose}
          >
            {finalizing ? "A aguardar..." : "Sair da sala"}
          </button>
        </div>
      </header>

      {recordingStatus && (
        <div
          className={`live-room-recording-status ${
            isRecording
              ? "is-recording"
              : isRecordingStarting
                ? "is-starting"
                : isRecordingFinalizing
                  ? "is-finalizing"
                  : "is-warning"
          }`}
          role="status"
        >
          <span className="live-room-recording-indicator" />
          <span>{recordingStatus}</span>
        </div>
      )}

      {error && (
        <div className="live-room-error" role="alert">
          {error}

          {disconnected && !finalizing && (
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
          onConnected={handleRoomConnected}
          onError={handleRoomError}
          onDisconnected={handleDisconnected}
          options={{
            adaptiveStream: true,
            dynacast: true
          }}
        >
          <LiveClassroom
            session={session}
            canManage={canManage}
          />
        </LiveKitRoom>
      </main>
    </div>
  );
}

export default LiveRoom;
