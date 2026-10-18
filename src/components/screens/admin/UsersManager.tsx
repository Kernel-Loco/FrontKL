"use client";

import { useState, type FormEvent } from "react";
import { UserPlus } from "lucide-react";
import { ActionButton } from "@/components/ui/ActionButton";
import { Badge } from "@/components/ui/Badge";
import { Card, TableWrap, TD, TH, TR } from "@/components/ui/Card";
import { Field, INPUT, SELECT } from "@/components/ui/Field";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { Modal } from "@/components/ui/Modal";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/config/permissions";
import { formatDateTime } from "@/lib/format";
import { getErrorMessage } from "@/services/errors";
import { changeUserRole, inviteUser } from "@/services/userService";
import { ROLES, type OrgUser, type Role } from "@/types";

export function UsersManager({ initial, currentUserEmail }: { initial: OrgUser[]; currentUserEmail: string }) {
  const [users, setUsers] = useState(initial);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const onRoleChange = async (user: OrgUser, role: Role) => {
    setBusyId(user.id);
    setMessage(null);
    try {
      const updated = await changeUserRole(user.id, role);
      setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
      setMessage({ tone: "success", text: `${user.full_name} ahora es ${ROLE_LABELS[role]}.` });
    } catch (error) {
      setMessage({ tone: "error", text: getErrorMessage(error) });
    } finally {
      setBusyId(null);
    }
  };

  const onInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const full_name = String(data.get("full_name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const role = String(data.get("role")) as Role;
    if (!full_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setInviteError("Escribe el nombre y un correo válido.");
      return;
    }
    setInviting(true);
    setInviteError(null);
    try {
      const user = await inviteUser({ full_name, email, role });
      setUsers((current) => [...current, user]);
      setInviteOpen(false);
      setMessage({ tone: "success", text: `Enviamos la invitación a ${email}. Deberá activar MFA al entrar.` });
    } catch (error) {
      setInviteError(getErrorMessage(error));
    } finally {
      setInviting(false);
    }
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card
        title="Usuarios"
        padded={false}
        action={
          <ActionButton size="sm" onClick={() => { setInviteError(null); setInviteOpen(true); }}>
            <UserPlus aria-hidden="true" className="h-3.5 w-3.5" /> Invitar usuario
          </ActionButton>
        }
      >
        {message && <InlineAlert tone={message.tone} className="mx-5 mt-4">{message.text}</InlineAlert>}
        <TableWrap>
          <table className="mt-2 w-full min-w-[680px]">
            <thead>
              <tr>
                <th scope="col" className={TH}>Usuario</th>
                <th scope="col" className={TH}>Rol</th>
                <th scope="col" className={TH}>MFA</th>
                <th scope="col" className={TH}>Estado</th>
                <th scope="col" className={TH}>Último acceso</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isMe = u.email === currentUserEmail;
                return (
                  <tr key={u.id} className={TR}>
                    <td className={TD}>
                      <span className="block font-medium">
                        {u.full_name}
                        {isMe && <span className="ml-2 text-xs font-normal text-lt-faint">(tú)</span>}
                      </span>
                      <span className="block text-xs text-lt-muted">{u.email}</span>
                    </td>
                    <td className={TD}>
                      <select
                        aria-label={`Rol de ${u.full_name}`}
                        value={u.role}
                        disabled={isMe || busyId === u.id}
                        title={isMe ? "No puedes cambiar tu propio rol" : undefined}
                        onChange={(e) => onRoleChange(u, e.target.value as Role)}
                        className={`${SELECT} h-8 w-40 text-xs`}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className={TD}>{u.mfa_enabled ? <Badge tone="teal">Activo</Badge> : <Badge tone="amber">Pendiente</Badge>}</td>
                    <td className={TD}>{u.is_active ? <Badge tone="green" dot>Activo</Badge> : <Badge tone="gray" dot>Invitado</Badge>}</td>
                    <td className={`${TD} whitespace-nowrap text-[13px] text-lt-muted`}>{u.last_login_at ? formatDateTime(u.last_login_at) : "Nunca"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>

      <Card title="Roles">
        <ul className="space-y-4">
          {ROLES.map((r) => (
            <li key={r}>
              <p className="text-sm font-semibold text-lt-text">{ROLE_LABELS[r]}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-lt-muted">{ROLE_DESCRIPTIONS[r]}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invitar usuario" description="Recibirá un correo para crear su contraseña y activar MFA.">
        <form onSubmit={onInvite} noValidate className="space-y-4">
          <Field label="Nombre completo" htmlFor="invite-name">
            <input id="invite-name" name="full_name" className={INPUT} autoComplete="off" />
          </Field>
          <Field label="Correo" htmlFor="invite-email">
            <input id="invite-email" name="email" type="email" className={INPUT} autoComplete="off" />
          </Field>
          <Field label="Rol" htmlFor="invite-role">
            <select id="invite-role" name="role" defaultValue="analista" className={SELECT}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
          {inviteError && <InlineAlert tone="error">{inviteError}</InlineAlert>}
          <div className="flex justify-end gap-2">
            <ActionButton variant="ghost" onClick={() => setInviteOpen(false)}>Cancelar</ActionButton>
            <ActionButton type="submit" loading={inviting}>Enviar invitación</ActionButton>
          </div>
        </form>
      </Modal>
    </div>
  );
}
