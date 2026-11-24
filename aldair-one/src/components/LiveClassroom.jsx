
import { useEffect, useRef, useState } from "react";
import {
  Track,
} from "livekit-client";
import {
  TrackToggle,
  VideoTrack,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useLocalParticipant,
  useChat,
} from "@livekit/components-react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MessageSquare,
  Users,
  Send,
  X,
  Wifi,
  ScreenShare,
} from "lucide-react";

import ParticipantRoster from "./ParticipantRoster";
import "./LiveClassroom.css";

function ParticipantTile({ participant, track, featured = false }) {
  const name =
    participant?.name ||
    participant?.identity ||
    "Participante";

  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={`ao-video-tile ${featured ? "is-featured" : ""}`}
    >
      {track ? (
        <VideoTrack
          trackRef={track}
          className="ao-video-element"
        />
      ) : (
        <div className="ao-video-placeholder">
          <div className="ao-avatar-large">{initial}</div>
          <span>Câmara desligada</span>
        </div>
      )}

      <div className="ao-video-name">
        <span>{name}</span>
        {participant?.isLocal && (
          <small>Tu</small>
        )}
      </div>

      {participant?.isSpeaking && (
        <span className="ao-speaking-indicator">
          A falar
        </span>
      )}
    </div>
  );
}

function LiveChatPanel({ onClose }) {
  const { chatMessages, send, isSending } = useChat();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [chatMessages]);

  async function handleSubmit(event) {
    event.preventDefault();

    const value = message.trim();
    if (!value || isSending) return;

    try {
      await send(value);
      setMessage("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    }
  }

  return (
    <aside className="ao-chat-panel">
      <div className="ao-side-panel-header">
        <div>
          <span className="ao-panel-eyebrow">COMUNICAÇÃO</span>
          <h3>Chat da aula</h3>
        </div>

        <button
          type="button"
          className="ao-icon-button"
          onClick={onClose}
          aria-label="Fechar chat"
        >
          <X size={19} />
        </button>
      </div>

      <div className="ao-chat-messages">
        {chatMessages.length === 0 ? (
          <div className="ao-chat-empty">
            <MessageSquare size={28} />
            <strong>A conversa começa aqui</strong>
            <span>
              Envia uma mensagem para os participantes desta aula.
            </span>
          </div>
        ) : (
          chatMessages.map((item, index) => {
            const sender =
              item.from?.name ||
              item.from?.identity ||
              "Participante";

            return (
              <div
                className="ao-chat-message"
                key={`${item.timestamp || "msg"}-${index}`}
              >
                <strong>{sender}</strong>
                <p>{item.message}</p>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      <form
        className="ao-chat-form"
        onSubmit={handleSubmit}
      >
        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Escreve uma mensagem..."
          maxLength={1000}
        />

        <button
          type="submit"
          disabled={!message.trim() || isSending}
          aria-label="Enviar mensagem"
        >
          <Send size={17} />
        </button>
      </form>

      <p className="ao-chat-notice">
        As mensagens são partilhadas em tempo real nesta sala.
      </p>
    </aside>
  );
}

function LiveClassroom({ session, canManage }) {
  const participants = useParticipants();

  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();

  const [chatOpen, setChatOpen] = useState(false);

  const tracks = useTracks([
    Track.Source.Camera,
    Track.Source.ScreenShare,
  ]);

  const screenTrack = tracks.find(
    (item) => item.source === Track.Source.ScreenShare
  );

  const cameraTracks = tracks.filter(
    (item) => item.source === Track.Source.Camera
  );

  const mainTrack =
    screenTrack ||
    cameraTracks.find((item) => item.participant.isLocal) ||
    cameraTracks[0];

  const mainParticipant = mainTrack?.participant;

  const remainingParticipants = participants.filter(
    (participant) =>
      participant.identity !== mainParticipant?.identity
  );

  const participantCount = participants.length;

  const localName =
    localParticipant?.name ||
    localParticipant?.identity ||
    "Participante";

  return (
    <div className="ao-classroom">
      <div className="ao-classroom-topbar">
        <div className="ao-classroom-heading">
          <div className="ao-classroom-icon">AO</div>

          <div>
            <span>ALDAIR ONE ACADEMY</span>
            <h2>{session.title || "Aula online"}</h2>
            <small>
              {session.class?.name || "Sala de formação"}
            </small>
          </div>
        </div>

        <div className="ao-classroom-live">
          <span className="ao-live-dot" />
          EM DIRETO
        </div>

        <div className="ao-classroom-top-actions">
          <span className="ao-participant-total">
            <Users size={15} />
            {participantCount}
          </span>

          <span className="ao-connection-label">
            <Wifi size={15} />
            Ligado
          </span>
        </div>
      </div>

      <div className="ao-classroom-body">
        <main className="ao-classroom-main">
          <div className="ao-stage-heading">
            <div>
              <span className="ao-panel-eyebrow">
                SALA DE APRENDIZAGEM
              </span>
              <h3>
                {screenTrack
                  ? "Partilha de ecrã"
                  : "Sessão em andamento"}
              </h3>
            </div>

            <span className="ao-stage-count">
              {participantCount}{" "}
              {participantCount === 1
                ? "participante"
                : "participantes"}
            </span>
          </div>

          <div className="ao-video-stage">
            {mainTrack ? (
              <ParticipantTile
                participant={mainParticipant}
                track={mainTrack}
                featured
              />
            ) : (
              <div className="ao-stage-waiting">
                <div className="ao-avatar-large">
                  {localName.charAt(0).toUpperCase()}
                </div>
                <h3>A preparar a transmissão</h3>
                <p>
                  A imagem aparecerá aqui quando uma câmara
                  ou partilha de ecrã estiver ativa.
                </p>
              </div>
            )}

            {screenTrack && (
              <div className="ao-screen-share-label">
                <ScreenShare size={14} />
                ECRÃ PARTILHADO
              </div>
            )}
          </div>

          <div className="ao-participants-section">
            <div className="ao-participants-title">
              <div>
                <Users size={17} />
                <strong>Na sala</strong>
              </div>
              <span>{participantCount} presentes</span>
            </div>

            <div className="ao-participants-strip">
              {remainingParticipants.map((participant) => {
                const cameraTrack = cameraTracks.find(
                  (item) =>
                    item.participant.identity === participant.identity
                );

                return (
                  <ParticipantTile
                    key={participant.identity}
                    participant={participant}
                    track={cameraTrack}
                  />
                );
              })}

              {!mainTrack && cameraTracks.length === 0 && (
                <div className="ao-strip-empty">
                  Aguardando vídeo dos participantes.
                </div>
              )}

              {mainParticipant && (
                <div className="ao-local-presence">
                  <span className="ao-local-presence-dot" />
                  {mainParticipant.isLocal
                    ? "A tua transmissão está em destaque"
                    : "Transmissão em destaque"}
                </div>
              )}
            </div>
          </div>

          <div className="ao-classroom-controls">
            <div className="ao-control-group">
              <TrackToggle
                source={Track.Source.Microphone}
                showIcon={false}
                className={`ao-control-button ${
                  isMicrophoneEnabled ? "" : "is-disabled"
                }`}
              >
                {isMicrophoneEnabled ? (
                  <Mic size={19} />
                ) : (
                  <MicOff size={19} />
                )}
                <span>
                  {isMicrophoneEnabled ? "Microfone" : "Silenciado"}
                </span>
              </TrackToggle>

              <TrackToggle
                source={Track.Source.Camera}
                showIcon={false}
                className={`ao-control-button ${
                  isCameraEnabled ? "" : "is-disabled"
                }`}
              >
                {isCameraEnabled ? (
                  <Video size={19} />
                ) : (
                  <VideoOff size={19} />
                )}
                <span>
                  {isCameraEnabled ? "Câmara" : "Câmara desligada"}
                </span>
              </TrackToggle>

              <TrackToggle
                source={Track.Source.ScreenShare}
                showIcon={false}
                className={`ao-control-button ${
                  isScreenShareEnabled ? "is-active" : ""
                }`}
              >
                <MonitorUp size={19} />
                <span>
                  {isScreenShareEnabled
                    ? "Parar partilha"
                    : "Partilhar ecrã"}
                </span>
              </TrackToggle>
            </div>

            <div className="ao-control-group ao-control-secondary">
              <button
                type="button"
                className={`ao-control-button ${
                  chatOpen ? "is-active" : ""
                }`}
                onClick={() => setChatOpen((value) => !value)}
              >
                <MessageSquare size={19} />
                <span>Chat</span>
              </button>

              <button
                type="button"
                className="ao-control-button"
                onClick={() => {
                  document
                    .querySelector(".participant-roster-toggle")
                    ?.click();
                }}
              >
                <Users size={19} />
                <span>Participantes</span>
              </button>
            </div>
          </div>

          <div className="ao-classroom-footer">
            <span>ALDAIR ONE · ONE PLATFORM. MULTIPLE SOLUTIONS.</span>
            <span>Formação online</span>
          </div>
        </main>

        {chatOpen && (
          <LiveChatPanel
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      <div className="ao-roster-layer">
        <ParticipantRoster
          sessionId={session._id}
          canManage={canManage}
        />
      </div>

      <RoomAudioRenderer />
    </div>
  );
}

export default LiveClassroom;
