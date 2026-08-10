import {
  Building2,
  CheckCircle2,
  Eye,
  User,
} from 'lucide-react';

import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

import {
  clientPersonKind,
  clientPersonTypeLabel,
  customerIdTypeLabel,
  displayValue,
  formatNat09,
  yesNo,
} from '../transfer.client-profile';
import type { ClientData } from '../transfer.types';

interface ClientOptionalFields {
  nationalite?: string;
  telephone?: string;
  email?: string;
  typeRefClientInterne?: string;
  numRefClientInterne?: string;
  taxable?: boolean;
  clientProhibe?: boolean;
  codeDouane?: string;
  activiteCode?: string;
  activiteLibelle?: string;
  activitePrincipale?: {
    section?: string;
    division?: number;
    groupe?: number;
    classe?: number;
  };
  activiteSecondaire?: {
    section?: string;
    division?: number;
    groupe?: number;
    classe?: number;
  };
}

type ClientView = ClientData & ClientOptionalFields;

interface ClientSearchResultProps {
  client: ClientData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientSearchResult({
  client,
  open,
  onOpenChange,
}: ClientSearchResultProps) {
  const personKind = clientPersonKind(client);
  const isPhysical = personKind === 'P';

  const bannerClassName = isPhysical
    ? 'bg-blue-50/80 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800'
    : 'bg-violet-50/80 border-violet-200 dark:bg-violet-950/40 dark:border-violet-800';

  const iconClassName = isPhysical
    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
    : 'bg-violet-100 text-violet-600 dark:bg-violet-900 dark:text-violet-300';

  const typeClassName = isPhysical
    ? 'text-blue-600 dark:text-blue-400'
    : 'text-violet-600 dark:text-violet-400';

  const checkClassName = isPhysical
    ? 'text-blue-500'
    : 'text-violet-500';

  const buttonClassName = isPhysical
    ? 'border-blue-300 bg-white hover:bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:border-blue-700 dark:text-blue-200 dark:hover:bg-blue-900'
    : 'border-violet-300 bg-white hover:bg-violet-100 text-violet-700 dark:bg-violet-900/60 dark:border-violet-700 dark:text-violet-200 dark:hover:bg-violet-900';

  return (
    <div className="mt-2.5">
      <div
        className={[
          'flex min-h-[58px] items-center gap-3 rounded-lg border px-3.5 py-2.5 shadow-sm',
          bannerClassName,
        ].join(' ')}
      >
        <div
          className={[
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            iconClassName,
          ].join(' ')}
        >
          {isPhysical ? (
            <User className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Building2 className="h-5 w-5" aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p
            className={[
              'text-[11px] font-bold uppercase tracking-wider',
              typeClassName,
            ].join(' ')}
          >
            {clientPersonTypeLabel(client)}
          </p>

          <p
            className="truncate text-sm font-semibold text-foreground"
            title={client.nomRaison || undefined}
          >
            {client.nomRaison || '—'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <CheckCircle2
            className={['h-4 w-4', checkClassName].join(' ')}
            aria-label="Client trouvé"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(true)}
            className={[
              'h-8 gap-1.5 text-xs font-semibold shadow-sm transition-all',
              buttonClassName,
            ].join(' ')}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Consulter la fiche client
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {isPhysical ? (
                <User className="h-5 w-5 text-primary" aria-hidden="true" />
              ) : (
                <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
              )}
              Fiche Signalétique Client
            </DialogTitle>
            <DialogDescription>
              Informations d&apos;identité, de contact et données réglementaires
              du client.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <ClientProfileDetails client={client} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClientProfileDetails({ client }: { client: ClientData }) {
  const view = client as ClientView;
  const activityLabel = view.activiteCode
    ? view.activiteLibelle
      ? `${view.activiteCode} — ${view.activiteLibelle}`
      : view.activiteCode
    : '—';

  return (
    <div className="overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">
            {client.nomRaison || '—'}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {clientPersonTypeLabel(client)} —{' '}
            {customerIdTypeLabel(client.typePiece)} / {client.noPiece || '—'}
          </p>
        </div>

        {view.clientProhibe && (
          <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
            Client prohibé
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <section className="space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Identité &amp; Contact
          </p>

          <Row label="Référence client" value={displayValue(client.idClient)} />
          <Row label="Nationalité" value={displayValue(view.nationalite)} />
          <Row label="Téléphone" value={displayValue(view.telephone)} />
          <Row label="Email" value={displayValue(view.email)} />
          <Row label="Adresse" value={displayValue(client.adresse)} />
          <Row label="Ville" value={displayValue(client.ville)} />

          {(view.typeRefClientInterne || view.numRefClientInterne) && (
            <Row
              label="Réf. interne"
              value={[
                view.typeRefClientInterne,
                view.numRefClientInterne,
              ].filter(Boolean).join(' / ')}
            />
          )}
        </section>

        <section className="space-y-3 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Données réglementaires
          </p>

          <Row label="Nature" value={clientPersonTypeLabel(client)} />
          <Row label="Résident" value={yesNo(client.resident)} />
          <Row label="Taxable" value={yesNo(view.taxable)} />
          <Row
            label="Tot. exportatrice"
            value={yesNo(client.totalementExportatrice)}
          />
          <Row
            label="Pays"
            value={
              client.codePays || client.pays
                ? `${client.codePays || '—'} — ${client.pays || '—'}`
                : '—'
            }
          />

          {view.codeDouane && (
            <Row label="Code douane" value={view.codeDouane} />
          )}

          <Row
            label="Activité princ. (NAT09)"
            value={formatNat09(view.activitePrincipale)}
          />

          {view.activiteSecondaire && (
            <Row
              label="Activité sec. (NAT09)"
              value={formatNat09(view.activiteSecondaire)}
            />
          )}

          <Row label="Code activité" value={activityLabel} />
        </section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">
        {value || '—'}
      </span>
    </div>
  );
}
