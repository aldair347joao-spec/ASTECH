
import { useState } from "react";
import {
  useParticipants,
  useLocalParticipant
} from "@livekit/components-react";

function ParticipantRoster() {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="participant-roster">
      <button
        type="button"
        className="participant-roster-toggle"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>Participantes</span>
        <strong>{participants.length}</strong>
        <span>{isOpen ? "Fechar" : "Ver lista"}</span>
      </button>

      {isOpen && (
        <div className="participant-roster-panel">
          <div className="participant-roster-heading">
            <h3>Pessoas na aula</h3>
            <span>{participants.length} presentes</span>
          </div>

          {participants.length === 0 ? (
            <p className="participant-roster-empty">
              Ainda não existem participantes.
            </p>
          ) : (
            <ul>
              {participants.map((participant) => {
                const isLocal =
                  participant.identity === localParticipant.identity;

                return (
                  <li key={participant.identity}>
                    <div className="participant-avatar">
                      {(participant.name ||
                        participant.identity ||
                        "?").charAt(0).toUpperCase()}
                    </div>

                    <div className="participant-details">
                      <strong>
                        {participant.name ||
                          participant.identity}
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
