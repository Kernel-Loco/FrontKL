"use client";

// Selector de empresa activa del superadmin de la plataforma (RC-332). Va bajo 'Empresa activa' en la barra lateral.
// Tras cambiar recarga /dashboard entero: el servidor vuelve a leer /auth/me y ninguna vista guarda datos de la otra.
// La empresa activa vive en la sesión del servidor y la comparten todas las pestañas: las demás se enteran por
// BroadcastChannel y también recargan.
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { SELECT } from "@/components/ui/Field";
import { ApiError } from "@/lib/apiClient";
import {
  ORGANIZATION_CHANNEL,
  canWorkIn,
  organizationListState,
  organizationOptionLabel,
  refreshListAfterFailedSwitch,
  reloadAfterFailedSwitch,
  sortOrganizations,
  switchErrorMessage,
} from "@/lib/platform";
import { getErrorMessage } from "@/services/errors";
import { listOrganizations, switchOrganization } from "@/services/platformService";
import type { PlatformOrganization, User } from "@/types";
import { Spinner } from "./Spinner";
import { tx } from "@/i18n/tx";

function reloadDashboard() {
  // Recarga completa a propósito: router.push conserva en memoria datos de la empresa anterior.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign("/dashboard");
}

function announceSwitch() {
  if (typeof BroadcastChannel === "undefined") return;
  const channel = new BroadcastChannel(ORGANIZATION_CHANNEL);
  channel.postMessage("switched");
  channel.close();
}

export function OrganizationSwitcher({ user }: { user: User }) {
  const selectId = useId();
  const errorId = useId();
  const [orgs, setOrgs] = useState<PlatformOrganization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [switching, setSwitching] = useState(false);
  const loading = useRef<AbortController | null>(null);

  // La lista se vuelve a pedir al enfocar el selector y tras un 404 o 409: el estado de cada empresa puede cambiar
  // con la página abierta.
  const load = useCallback((reloadOnFailure = false) => {
    loading.current?.abort();
    const controller = new AbortController();
    loading.current = controller;
    return listOrganizations(controller.signal).then((list) => {
      if (controller.signal.aborted) return;
      const state = organizationListState(list.items, user.organization_id);
      if (state === "changed") {
        announceSwitch();
        reloadDashboard();
        return;
      }
      if (state === "invalid") {
        if (reloadOnFailure) {
          announceSwitch();
          reloadDashboard();
          return;
        }
        setOrgs(null);
        setListError(tx("No pudimos identificar la empresa activa. Intenta cargar la lista de nuevo."));
        return;
      }
      setOrgs(sortOrganizations(list.items));
      setListError(null);
    }).catch((e: unknown) => {
      if (!controller.signal.aborted) {
        if (reloadOnFailure) {
          announceSwitch();
          reloadDashboard();
        } else {
          setListError(getErrorMessage(e));
        }
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingList(false);
    });
  }, [user.organization_id]);

  const refresh = (reloadOnFailure = false) => {
    setLoadingList(true);
    setListError(null);
    return load(reloadOnFailure);
  };

  useEffect(() => {
    void load();
    return () => loading.current?.abort();
  }, [load]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(ORGANIZATION_CHANNEL);
    channel.onmessage = () => reloadDashboard();
    return () => channel.close();
  }, []);

  // La marca de la lista, que se vuelve a pedir al enfocar el selector: así no queda vieja si otra pestaña cambió.
  const active = orgs?.find((o) => o.active)?.id ?? "";

  const handleChange = async (id: string) => {
    if (!id || id === active || switching) return;
    loading.current?.abort();
    setLoadingList(false);
    setSwitching(true);
    setError(null);
    try {
      await switchOrganization(id);
      announceSwitch();
      reloadDashboard();
    } catch (e) {
      const status = e instanceof ApiError ? e.status : undefined;
      setError(e instanceof ApiError ? switchErrorMessage(e.status, e.message) : switchErrorMessage(undefined, undefined));
      if (reloadAfterFailedSwitch(status)) {
        // No se sabe si la sesión ya cambió: todas las pestañas recargan y muestran la empresa real.
        announceSwitch();
        reloadDashboard();
        return;
      }
      if (refreshListAfterFailedSwitch(status)) await refresh(status === 409);
      setSwitching(false);
    }
  };

  return (
    <div>
      <label htmlFor={selectId} className="text-xs font-medium text-lt-faint">
        {tx("Empresa activa")}</label>
      <div className="mt-1 flex items-center gap-2">
        <select
          id={selectId}
          value={orgs ? active : ""}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => {
            if (orgs && !switching) void refresh();
          }}
          disabled={!orgs || switching}
          aria-busy={switching || loadingList || undefined}
          aria-describedby={error || listError ? errorId : undefined}
          className={`${SELECT} h-9 font-semibold`}
        >
          {orgs ? (
            orgs.map((o) => (
              <option key={o.id} value={o.id} disabled={!canWorkIn(o) && o.id !== active}>
                {organizationOptionLabel(o)}
              </option>
            ))
          ) : (
            <option value="">{user.organization_name}</option>
          )}
        </select>
        {switching && <Spinner />}
      </div>
      {user.outside_home && (
        <p className="mt-1.5 text-xs text-lt-amber">
          {tx("Superadmin")}{user.home_organization_name ? tx(" · tu empresa: {0}", user.home_organization_name) : ""}
        </p>
      )}
      {(error || listError) && (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-lt-red">
          {error}{error && listError ? " " : ""}{listError}
        </p>
      )}
      {listError && (
        <ActionButton variant="secondary" size="sm" className="mt-2" onClick={() => void refresh()} disabled={loadingList || switching}>
          {tx("Reintentar lista")}</ActionButton>
      )}
    </div>
  );
}
