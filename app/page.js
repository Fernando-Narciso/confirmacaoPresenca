"use client";

import { useEffect, useState } from "react";

function formatDate(value) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return null;
  }
}

export default function RsvpPage() {
  const [event, setEvent] = useState(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    fetch("/api/rsvp/event")
      .then((r) => r.json())
      .then(setEvent)
      .catch(() => setEvent({}));
  }, []);

  const deadlinePassed =
    event?.deadlineDate && new Date(event.deadlineDate) < new Date();

  async function handleSearch(e) {
    e.preventDefault();
    setError("");
    setStatusMsg("");
    setSelected(null);
    const term = name.trim();
    if (!term) {
      setError("Digite seu nome para continuar.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/rsvp/search?name=${encodeURIComponent(term)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível buscar agora.");
        setMatches(null);
        return;
      }
      if (data.matches.length === 0) {
        setMatches([]);
        setStatusMsg(
          "Nome não encontrado na lista de convidados. Verifique a grafia ou fale com quem organizou o evento."
        );
      } else if (data.matches.length === 1) {
        setMatches(data.matches);
        setSelected(data.matches[0]);
      } else {
        setMatches(data.matches);
        setStatusMsg(
          `Encontramos ${data.matches.length} nomes parecidos. Selecione o seu na lista abaixo.`
        );
      }
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRespond(status) {
    if (!selected) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/rsvp/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível registrar sua resposta.");
        return;
      }
      setSelected(data.guest);
      setStatusMsg(
        status === "confirmado"
          ? "Presença confirmada. Agradecemos a resposta!"
          : "Registramos que você não poderá comparecer. Obrigado por avisar!"
      );
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const eventDateText = formatDate(event?.eventDate);
  const deadlineText = formatDate(event?.deadlineDate);

  return (
    <main className="invite-page">
      <div className="invite-card">
        <p className="invite-eyebrow">Confirmação de presença</p>
        <h1 className="invite-title">{event?.eventName || "Carregando..."}</h1>
        <p className="invite-meta">
          {eventDateText && <>Data do evento: {eventDateText}. </>}
          {deadlineText && (
            <>
              Prazo para confirmar: {deadlineText}
              {deadlinePassed ? " (encerrado)" : "."}
            </>
          )}
        </p>

        {!selected && (
          <form onSubmit={handleSearch} noValidate>
            <label className="field-label" htmlFor="guest-name">
              Digite seu nome completo
            </label>
            <input
              id="guest-name"
              className="text-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              aria-describedby="search-help"
            />
            <p id="search-help" className="help-text">
              Vamos verificar se seu nome está na lista de convidados.
            </p>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? "Buscando..." : "Buscar meu nome"}
            </button>
          </form>
        )}

        <div role="status" aria-live="polite">
          {error && <p className="error-text">{error}</p>}

          {matches && matches.length === 0 && (
            <div className="result-box status-not-found">
              <p style={{ margin: 0 }}>{statusMsg}</p>
            </div>
          )}

          {matches && matches.length > 1 && !selected && (
            <ul className="guest-list">
              {matches.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => setSelected(m)}>
                    {m.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected && (
            <div
              className={`result-box status-${selected.status}`}
              style={{ marginTop: matches?.length > 1 ? "1rem" : "1.5rem" }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>{selected.name}</p>

              {selected.status === "pendente" && !deadlinePassed && (
                <>
                  <p style={{ margin: "0.5rem 0 0" }}>
                    Você vai comparecer ao evento?
                  </p>
                  <div className="btn-row">
                    <button
                      className="btn btn-confirm"
                      type="button"
                      disabled={loading}
                      onClick={() => handleRespond("confirmado")}
                    >
                      Confirmar presença
                    </button>
                    <button
                      className="btn btn-decline"
                      type="button"
                      disabled={loading}
                      onClick={() => handleRespond("nao_confirmado")}
                    >
                      Não poderei ir
                    </button>
                  </div>
                </>
              )}

              {selected.status === "pendente" && deadlinePassed && (
                <p style={{ margin: "0.5rem 0 0" }}>
                  O prazo para confirmar presença já encerrou. Fale com quem
                  organizou o evento se precisar alterar sua resposta.
                </p>
              )}

              {selected.status === "confirmado" && (
                <p style={{ margin: "0.5rem 0 0" }}>
                  Presença confirmada. Agradecemos a resposta!
                </p>
              )}

              {selected.status === "nao_confirmado" && (
                <p style={{ margin: "0.5rem 0 0" }}>
                  Você informou que não poderá comparecer.
                </p>
              )}

              <button
                type="button"
                className="btn btn-secondary"
                style={{ marginTop: "1rem", width: "100%" }}
                onClick={() => {
                  setSelected(null);
                  setMatches(null);
                  setName("");
                  setStatusMsg("");
                }}
              >
                Buscar outro nome
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
