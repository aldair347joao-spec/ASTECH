
import { useEffect, useRef, useState } from "react";
import { Track } from "livekit-client";

import {
  TrackToggle,
  VideoTrack,
  RoomAudioRenderer,
  useTracks,
  useParticipants,
  useLocalParticipant
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
  Paperclip,
  FileText,
  Download
} from "lucide-react";

import ParticipantRoster from "./ParticipantRoster";
import { liveChatAPI } from "../services/api";
import "./LiveClassroom.css";

const MAX_CHAT_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_CHAT_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".txt",
  ".csv"
];

function formatFileSize(bytes) {
  if (!bytes) return "0 KB";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => {
      reject(new Error("Não foi possível ler o documento."));
    };

    reader.readAsDataURL(file);
  });
}

function ParticipantTile({
  participant,
  track,
  featured = false
}) {
  const name =
    participant?.name ||
    participant?.identity ||
    "Participante";

  const initial = name.charAt(0).toUpperCase();

  return (
    <div className={`ao-video-tile ${featured ? "is-featured" : ""}`}>
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
        {participant?.isLocal && <small>Tu</small>}
      </div>

      {participant?.isSpeaking && (
        <span className="ao-speaking-indicator">
          A falar
        </span>
      )}
    </div>
  );
}

/* ==========================================
   CHAT PERSISTENTE
========================================== */

function LiveChatPanel({ sessionId, onClose }) {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Carregar histórico e procurar novas mensagens.
  useEffect(() => {
    let active = true;
    let intervalId;

    async function loadMessages(initial = false) {
      try {
        const response = await liveChatAPI.getMessages(sessionId);

        if (!active) return;

        if (response.success && Array.isArray(response.messages)) {
          setMessages(response.messages);
          setError("");
        }
      } catch (err) {
        if (active && initial) {
          setError(
            err.message || "Não foi possível carregar o chat."
          );
        }
      } finally {
        if (active && initial) {
          setLoading(false);
        }
      }
    }

    loadMessages(true);

    intervalId = window.setInterval(() => {
      loadMessages(false);
    }, 3000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [sessionId]);

  // Descer automaticamente para a mensagem mais recente.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end"
    });
  }, [messages]);

  function handleFileSelection(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");
    setStatus("");

    const extension = file.name
      .toLowerCase()
      .match(/\.[a-z0-9]+$/)?.[0];

    if (!extension || !ALLOWED_CHAT_EXTENSIONS.includes(extension)) {
      setError(
        "Formato não permitido. Podes enviar PDF, Word, Excel, PowerPoint, TXT ou CSV."
      );

      event.target.value = "";
      return;
    }

    if (file.size <= 0 || file.size > MAX_CHAT_FILE_SIZE) {
      setError("O documento deve ter no máximo 5 MB.");

      event.target.value = "";
      return;
    }

    setSelectedFile(file);
  }

  function removeSelectedFile() {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const text = message.trim();

    if ((!text && !selectedFile) || sending) return;

    setSending(true);
    setError("");
    setStatus("A enviar...");

    try {
      let filePayload = null;

      if (selectedFile) {
        const data = await readFileAsDataURL(selectedFile);

        filePayload = {
          originalName: selectedFile.name,
          mimeType:
            selectedFile.type || "application/octet-stream",
          data
        };
      }

      const response = await liveChatAPI.sendMessage(
        sessionId,
        {
          message: text,
          file: filePayload
        }
      );

      if (!response.success || !response.chatMessage) {
        throw new Error(
          response.message || "O servidor não confirmou o envio."
        );
      }

      setMessages((current) => {
        const alreadyExists = current.some(
          (item) => item.id === response.chatMessage.id
        );

        if (alreadyExists) return current;

        return [...current, response.chatMessage];
      });

      setMessage("");
      removeSelectedFile();
      setStatus("Mensagem enviada com sucesso.");

      window.setTimeout(() => {
        setStatus("");
      }, 2500);
    } catch (err) {
      setError(
        err.message || "Não foi possível enviar a mensagem."
      );
      setStatus("");
    } finally {
      setSending(false);
    }
  }

  async function handleDownload(item) {
    if (!item.attachment || downloadingId) return;

    setDownloadingId(item.id);
    setError("");

    try {
      const blob = await liveChatAPI.downloadAttachment(
        sessionId,
        item.id
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = item.attachment.originalName;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1500);
    } catch (err) {
      setError(
        err.message || "Não foi possível descarregar o documento."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <aside className="ao-chat-panel">
      <div className="ao-side-panel-header">
        <div>
          <span className="ao-panel-eyebrow">
            COMUNICAÇÃO
          </span>

          <h3>Chat da aula</h3>

          <small className="ao-chat-live-status">
            <span />
            Mensagens sincronizadas
          </small>
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
        {loading ? (
          <div className="ao-chat-empty">
            <MessageSquare size={28} />
            <strong>A carregar conversa...</strong>
          </div>
        ) : messages.length === 0 ? (
          <div className="ao-chat-empty">
            <MessageSquare size={28} />
            <strong>A conversa começa aqui</strong>

            <span>
              Envia uma mensagem ou partilha um documento
              com os participantes desta aula.
            </span>
          </div>
        ) : (
          messages.map((item) => (
            <div
              className="ao-chat-message"
              key={item.id}
            >
              <div className="ao-chat-message-heading">
                <strong>{item.senderName || "Participante"}</strong>

                <time>
                  {item.createdAt
                    ? new Date(item.createdAt).toLocaleTimeString(
                        "pt-PT",
                        {
                          hour: "2-digit",
                          minute: "2-digit"
                        }
                      )
                    : ""}
                </time>
              </div>

              {item.message && (
                <p>{item.message}</p>
              )}

              {item.attachment && (
                <div className="ao-chat-attachment">
                  <div className="ao-chat-file-icon">
                    <FileText size={20} />
                  </div>

                  <div className="ao-chat-file-info">
                    <strong>
                      {item.attachment.originalName}
                    </strong>

                    <small>
                      {formatFileSize(item.attachment.size)}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="ao-chat-download"
                    onClick={() => handleDownload(item)}
                    disabled={downloadingId === item.id}
                    aria-label="Descarregar documento"
                    title="Descarregar documento"
                  >
                    <Download size={17} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {selectedFile && (
        <div className="ao-chat-selected-file">
          <FileText size={17} />

          <div>
            <strong>{selectedFile.name}</strong>
            <small>{formatFileSize(selectedFile.size)}</small>
          </div>

          <button
            type="button"
            onClick={removeSelectedFile}
            aria-label="Remover documento"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="ao-chat-error" role="alert">
          {error}
        </div>
      )}

      {status && (
        <div className="ao-chat-status" role="status">
          {status}
        </div>
      )}

      <form
        className="ao-chat-form"
        onSubmit={handleSubmit}
      >
        <input
          ref={fileInputRef}
          className="ao-chat-file-input"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          onChange={handleFileSelection}
        />

        <button
          type="button"
          className="ao-chat-attach-button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          aria-label="Anexar documento"
          title="Anexar documento"
        >
          <Paperclip size={18} />
        </button>

        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Escreve uma mensagem..."
          maxLength={1000}
          disabled={sending}
        />

        <button
          type="submit"
          disabled={
            (!message.trim() && !selectedFile) || sending
          }
          aria-label="Enviar mensagem"
          title="Enviar"
        >
          {sending ? (
            <span className="ao-chat-send-spinner" />
          ) : (
            <Send size={17} />
          )}
        </button>
      </form>

      <p className="ao-chat-notice">
        Mensagens guardadas no ALDAIR ONE. Documentos até 5 MB.
      </p>
    </aside>
  );
}

/* ==========================================
   SALA DE AULA
========================================== */

function LiveClassroom({ session, canManage }) {
  const participants = useParticipants();

  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled
  } = useLocalParticipant();

  const [chatOpen, setChatOpen] = useState(false);

  const [screenShareError, setScreenShareError] = useState("");
  const [screenShareLoading, setScreenShareLoading] = useState(false);

  async function handleScreenShare() {
    if (!localParticipant || screenShareLoading) return;

    setScreenShareError("");
    setScreenShareLoading(true);

    try {
      if (isScreenShareEnabled) {
        await localParticipant.setScreenShareEnabled(false);
        return;
      }

      if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getDisplayMedia
      ) {
        throw new Error(
          "Este navegador não permite partilhar o ecrã. No Android, utiliza a aplicação ALDAIR ONE."
        );
      }

      await localParticipant.setScreenShareEnabled(true);
    } catch (error) {
      console.error("Erro na partilha de ecrã:", error);

      setScreenShareError(
        error.name === "NotAllowedError"
          ? "A autorização para partilhar o ecrã foi cancelada."
          : error.message || "Não foi possível iniciar a partilha."
      );
    } finally {
      setScreenShareLoading(false);
    }
  }

  const tracks = useTracks([
    Track.Source.Camera,
    Track.Source.ScreenShare
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
                  {isMicrophoneEnabled
                    ? "Microfone"
                    : "Silenciado"}
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
                  {isCameraEnabled
                    ? "Câmara"
                    : "Câmara desligada"}
                </span>
              </TrackToggle>

              <button
                type="button"
                className={`ao-control-button ${
                  isScreenShareEnabled ? "is-active" : ""
                }`}
                onClick={handleScreenShare}
                disabled={screenShareLoading}
              >
                <MonitorUp size={19} />

                <span>
                  {screenShareLoading
                    ? "A iniciar..."
                    : isScreenShareEnabled
                      ? "Parar partilha"
                      : "Partilhar ecrã"}
                </span>
              </button>
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

          {screenShareError && (
            <div
              className="ao-screen-share-error"
              role="alert"
            >
              {screenShareError}
            </div>
          )}

          <div className="ao-classroom-footer">
            <span>
              ALDAIR ONE · ONE PLATFORM. MULTIPLE SOLUTIONS.
            </span>

            <span>Formação online</span>
          </div>
        </main>

        {chatOpen && (
          <LiveChatPanel
            sessionId={session._id}
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
