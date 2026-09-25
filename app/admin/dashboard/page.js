"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const STATUS_LABEL = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  nao_confirmado: "Não vai",
};

function toInputDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [guests, setGuests] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [filter, setFilter] = useState("todos");
  const [search, setSearch] = useState("");

  const [eventDraft, setEventDraft] = useState(null);
  const [savingEvent, setSavingEvent] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [guestsRes, eventRes] = await Promise.all([
        fetch("/api/admin/guests"),
        fetch("/api/rsvp/event"),
      ]);
      if (guestsRes.status === 401) {
        router.push("/admin/login");
        return;
      }
      const guestsData = await guestsRes.json();
      const eventData = await eventRes.json();
      setGuests(guestsData.guests || []);
      setEvent(eventData);
      setEventDraft({
        eventName: eventData.eventName || "",
        eventDate: toInputDateTime(eventData.eventDate),
        deadlineDate: toInputDateTime(eventData.deadlineDate),
      });
    } catch {
      setError("Não foi possível carregar os dados.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = guests.length;
    const confirmado = guests.filter((g) => g.status === "confirmado").length;
    const nao = guests.filter((g) => g.status === "nao_confirmado").length;
    const pendente = guests.filter((g) => g.status === "pendente").length;
    return { total, confirmado, nao, pendente };
  }, [guests]);

  const visibleGuests = useMemo(() => {
    return guests.filter((g) => {
      if (filter !== "todos" && g.status !== filter) return false;
      if (search && !g.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [guests, filter, search]);

  async function handleAddGuest(e) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError("");
    try {
      const res = await fetch("/api/admin/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível adicionar o convidado.");
        return;
      }
      setGuests((prev) =>
        [...prev, data.guest].sort((a, b) => a.name.localeCompare(b.name))
      );
      setNewName("");
      setNotice(`"${data.guest.name}" foi adicionado à lista.`);
    } catch {
      setError("Erro de conexão ao adicionar convidado.");
    }
  }

  function startEdit(guest) {
    setEditingId(guest.id);
    setEditDraft({ name: guest.name, status: guest.status, notes: guest.notes || "" });
    setNotice("");
  }

  async function saveEdit(id) {
    setError("");
    try {
      const res = await fetch(`/api/admin/guests/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editDraft),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar as alterações.");
        return;
      }
      setGuests((prev) =>
        prev.map((g) => (g.id === id ? data.guest : g))
      );
      setEditingId(null);
      setNotice(`Dados de "${data.guest.name}" atualizados.`);
    } catch {
      setError("Erro de conexão ao salvar.");
    }
  }

  async function handleDelete(guest) {
    if (!confirm(`Remover "${guest.name}" da lista de convidados?`)) return;
    setError("");
    try {
      const res = await fetch(`/api/admin/guests/${guest.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Não foi possível remover o convidado.");
        return;
      }
      setGuests((prev) => prev.filter((g) => g.id !== guest.id));
      setNotice(`"${guest.name}" foi removido da lista.`);
    } catch {
      setError("Erro de conexão ao remover.");
    }
  }

  async function handleSaveEvent(e) {
    e.preventDefault();
    setSavingEvent(true);
    setError("");
    try {
      const res = await fetch("/api/admin/event", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: eventDraft.eventName,
          eventDate: eventDraft.eventDate || null,
          deadlineDate: eventDraft.deadlineDate || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Não foi possível salvar o evento.");
        return;
      }
      setEvent(data);
      setNotice("Dados do evento atualizados.");
    } catch {
      setError("Erro de conexão ao salvar o evento.");
    } finally {
      setSavingEvent(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <h1>Painel de confirmações</h1>
        <button className="btn btn-secondary" onClick={handleLogout} type="button">
          Sair
        </button>
      </header>

      <main className="admin-main">
        <div role="status" aria-live="polite">
          {notice && <p className="help-text">{notice}</p>}
          {error && <p className="error-text">{error}</p>}
        </div>

        {loading ? (
          <p>Carregando dados...</p>
        ) : (
          <>
            <section className="stat-grid" aria-label="Resumo das confirmações">
              <div className="stat-card">
                <span className="stat-number">{stats.total}</span>
                <span className="stat-label">Convidados</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.confirmado}</span>
                <span className="stat-label">Confirmados</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.nao}</span>
                <span className="stat-label">Não vão</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{stats.pendente}</span>
                <span className="stat-label">Pendentes</span>
              </div>
            </section>

            <section className="card" aria-labelledby="event-settings-title">
              <h2 id="event-settings-title">Dados do evento</h2>
              <form onSubmit={handleSaveEvent} noValidate>
                <div className="form-row">
                  <div className="form-group">
                    <label className="field-label" htmlFor="event-name">
                      Nome do evento
                    </label>
                    <input
                      id="event-name"
                      className="text-input"
                      type="text"
                      value={eventDraft?.eventName || ""}
                      onChange={(e) =>
                        setEventDraft((d) => ({ ...d, eventName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label" htmlFor="event-date">
                      Data do evento
                    </label>
                    <input
                      id="event-date"
                      className="text-input"
                      type="datetime-local"
                      value={eventDraft?.eventDate || ""}
                      onChange={(e) =>
                        setEventDraft((d) => ({ ...d, eventDate: e.target.value }))
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="field-label" htmlFor="deadline-date">
                      Prazo para confirmar
                    </label>
                    <input
                      id="deadline-date"
                      className="text-input"
                      type="datetime-local"
                      value={eventDraft?.deadlineDate || ""}
                      onChange={(e) =>
                        setEventDraft((d) => ({ ...d, deadlineDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <button className="btn btn-primary" type="submit" disabled={savingEvent}>
                  {savingEvent ? "Salvando..." : "Salvar dados do evento"}
                </button>
              </form>
            </section>

            <section className="card" aria-labelledby="add-guest-title">
              <h2 id="add-guest-title">Adicionar convidado</h2>
              <form onSubmit={handleAddGuest} className="form-row" noValidate>
                <div className="form-group">
                  <label className="field-label" htmlFor="new-guest-name">
                    Nome completo
                  </label>
                  <input
                    id="new-guest-name"
                    className="text-input"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <button className="btn btn-primary" type="submit">
                  Adicionar
                </button>
              </form>
            </section>

            <section className="card" aria-labelledby="guests-title">
              <h2 id="guests-title">Lista de convidados</h2>

              <div className="form-row">
                <div className="form-group">
                  <label className="field-label" htmlFor="filter-status">
                    Filtrar por status
                  </label>
                  <select
                    id="filter-status"
                    className="text-input"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="confirmado">Confirmados</option>
                    <option value="nao_confirmado">Não vão</option>
                    <option value="pendente">Pendentes</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="field-label" htmlFor="search-name">
                    Buscar por nome
                  </label>
                  <input
                    id="search-name"
                    className="text-input"
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="table-wrap">
                <table className="guests-table">
                  <caption className="sr-only">
                    Lista de convidados com nome, status de confirmação e ações
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Nome</th>
                      <th scope="col">Status</th>
                      <th scope="col">Observações</th>
                      <th scope="col">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleGuests.length === 0 && (
                      <tr>
                        <td colSpan={4}>Nenhum convidado encontrado.</td>
                      </tr>
                    )}
                    {visibleGuests.map((guest) => {
                      const isEditing = editingId === guest.id;
                      return (
                        <tr key={guest.id}>
                          <td>
                            {isEditing ? (
                              <>
                                <label
                                  className="sr-only"
                                  htmlFor={`edit-name-${guest.id}`}
                                >
                                  Nome de {guest.name}
                                </label>
                                <input
                                  id={`edit-name-${guest.id}`}
                                  className="text-input"
                                  type="text"
                                  value={editDraft.name}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({ ...d, name: e.target.value }))
                                  }
                                />
                              </>
                            ) : (
                              guest.name
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <>
                                <label
                                  className="sr-only"
                                  htmlFor={`edit-status-${guest.id}`}
                                >
                                  Status de {guest.name}
                                </label>
                                <select
                                  id={`edit-status-${guest.id}`}
                                  className="text-input"
                                  value={editDraft.status}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({ ...d, status: e.target.value }))
                                  }
                                >
                                  <option value="pendente">Pendente</option>
                                  <option value="confirmado">Confirmado</option>
                                  <option value="nao_confirmado">Não vai</option>
                                </select>
                              </>
                            ) : (
                              <span className={`badge badge-${guest.status}`}>
                                {STATUS_LABEL[guest.status]}
                              </span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <>
                                <label
                                  className="sr-only"
                                  htmlFor={`edit-notes-${guest.id}`}
                                >
                                  Observações sobre {guest.name}
                                </label>
                                <input
                                  id={`edit-notes-${guest.id}`}
                                  className="text-input"
                                  type="text"
                                  value={editDraft.notes}
                                  onChange={(e) =>
                                    setEditDraft((d) => ({ ...d, notes: e.target.value }))
                                  }
                                />
                              </>
                            ) : (
                              guest.notes || "—"
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div className="row-actions">
                                <button
                                  className="btn btn-primary"
                                  type="button"
                                  onClick={() => saveEdit(guest.id)}
                                >
                                  Salvar
                                </button>
                                <button
                                  className="btn btn-secondary"
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <div className="row-actions">
                                <button
                                  className="btn btn-secondary"
                                  type="button"
                                  onClick={() => startEdit(guest)}
                                >
                                  Editar
                                  <span className="sr-only"> {guest.name}</span>
                                </button>
                                <button
                                  className="btn btn-danger"
                                  type="button"
                                  onClick={() => handleDelete(guest)}
                                >
                                  Remover
                                  <span className="sr-only"> {guest.name}</span>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
