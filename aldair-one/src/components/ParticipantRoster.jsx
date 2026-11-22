
import { useEffect, useState } from "react";
import {
  useParticipants,
  useLocalParticipant
} from "@livekit/components-react";

import { livekitAPI } from "../services/api";

function ParticipantRoster({ sessionId, canManage = false }) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const [isOpen, setIsOpen] = useState(false);
  const [serverParticipants, setServerParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionIdentity, setActionIdentity] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadManagedParticipants() {
    if (!canManage || !sessionId) return;

    try {
      setLoading(true);
      setError("");

      const response = await livekitAPI.getParticipants(sessionId);

      setServerParticipants(response.participants || []);
    } catch (err) {
      setError(err.message || "Não foi possível carregar os participantes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !canManage) return;

    loadManagedParticipants();

    const interval = window.setInterval(() => {
      loadManagedParticipants();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [isOpen, canManage, sessionId]);

  async function handleMute(participant, track, muted) {
    try {
      setActionIdentity(participant.identity);
      setError("");
      setNotice("");

      await livekitAPI.muteParticipant(
        sessionId,
        participant.identity,
        track.sid,
        muted
      );

      setNotice(
        muted
          ? "Microfone silenciado com sucesso."
          : "Pedido de reativação enviado."
      );

      await loadManagedParticipants();
    } catch (err) {
      setError(err.message || "Não foi possível alterar o microfone.");
    } finally {
      setActionIdentity("");
    }
  }

  async function handleRemove(participant) {
    const confirmed = window.confirm(
      `Tens a certeza de que pretendes remover ${participant.name || participant.identity} desta aula?`
    );

    if (!confirmed) return;

    try {
      setActionIdentity(participant.identity);
      setError("");
      setNotice("");

      await livekitAPI.removeParticipant(
        sessionId,
        participant.identity
      );

      setNotice("Participante removido da aula.");

      await loadManagedParticipants();
    } catch (err) {
      setError(err.message || "Não foi possível remover o participante.");
    } finally {
      setActionIdentity("");
    }
  }

  function isAudioTrack(track) {
    return (
      track.type === 0 ||
      String(track.type).toUpperCase() === "AUDIO" ||
      String(track.source).toUpperCase() === "MICROPHONE"
    );
  }

  const participantCount = participants.length;

  return (
    <div className="participant-roster">
      <button
        type="button"
        className="participant-roster-toggle"
        onClick={() => {
          setIsOpen((current) => !current);
          setError("");
          setNotice("");
        }}
      >
        <span>Participantes</span>
        <strong>{participantCount}</strong>
        <span>{isOpen ? "Fechar" : "Ver lista"}</span>
      </button>

      {isOpen && (
        <div className="participant-roster-panel">
          <div className="participant-roster-heading">
            <h3>Pessoas na aula</h3>
            <span>{participantCount} presentes</span>
          </div>

          {canManage && (
            <div className="participant-roster-management">
              <span>Gestão da aula</span>

              <button
                type="button"
                onClick={loadManagedParticipants}
                disabled={loading}
              >
                {loading ? "A atualizar..." : "Atualizar lista"}
              </button>
            </div>
          )}

          {error && (
            <p className="participant-roster-error">
              {error}
            </p>
          )}

          {notice && (
            <p className="participant-roster-notice">
              {notice}
            </p>
          )}

          {participants.length === 0 ? (
            <p className="participant-roster-empty">
              Ainda não existem participantes.
            </p>
          ) : (
            <ul>
              {participants.map((participant) => {
                const isLocal =
                  participant.identity === localParticipant.identity;

                const managedParticipant = serverParticipants.find(
                  (item) => item.identity === participant.identity
                );

                const audioTracks = (
                  managedParticipant?.tracks || []
                ).filter(isAudioTrack);

                const busy =
                  actionIdentity === participant.identity;

                return (
                  <li key={participant.identity}>
                    <div className="participant-avatar">
                      {(participant.name ||
                        participant.identity ||
                        "?").charAt(0).toUpperCase()}
                    </div>

                    <div className="participant-details">
                      <strong>
                        {participant.name || participant.identity}
                      </strong>

                      <span>
                        {isLocal ? "Tu" : "Participante"}
                      </span>
                    </div>

                    {isLocal && (
                      <span className="participant-you">
                        Tu
                      </span>
                    )}

                    {canManage && !isLocal && (
                      <div className="participant-actions">
                        {audioTracks.map((track) => (
                          <button
                            key={track.sid}
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              handleMute(
                                managedParticipant,
                                track,
                                !track.muted
                              )
                            }
                          >
                            {track.muted
                              ? "Reativar"
                              : "Silenciar"}
                          </button>
                        ))}

                        <button
                          type="button"
                          className="participant-remove-button"
                          disabled={busy}
                          onClick={() =>
                            handleRemove(participant)
                          }
                        >
                          {busy ? "Aguarda..." : "Remover"}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default ParticipantRoster;
