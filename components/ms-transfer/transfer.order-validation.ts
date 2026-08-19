import type {
  PartyData,
  TransferOrder,
} from './transfer.types';

import {
  normalizePartyData,
} from './transfer.party-structured';

function text(
  value: unknown,
): string {
  return String(
    value ?? '',
  ).trim();
}

function positiveAmount(
  value: unknown,
): boolean {
  const parsed =
    Number(
      text(value)
        .replace(/\s/g, '')
        .replace(',', '.'),
    );

  return (
    Number.isFinite(parsed)
    && parsed > 0
  );
}

interface PartyRequiredOptions {
  account?: boolean;
  country?: boolean;
  town?: boolean;
}

function getPartyRequiredFieldErrors(
  label: string,
  rawParty: PartyData,
  options:
    PartyRequiredOptions = {},
): string[] {
  const party =
    normalizePartyData(rawParty);

  const errors: string[] = [];

  if (!text(party.nomRaison)) {
    errors.push(
      `${label} : le nom / raison sociale est obligatoire.`,
    );
  }

  if (!party.type) {
    errors.push(
      `${label} : le type de partie est obligatoire.`,
    );
  }

  if (
    options.account
    && !text(party.compte)
  ) {
    errors.push(
      `${label} : le compte / IBAN est obligatoire.`,
    );
  }

  if (
    options.country
    && !text(
      party.postalAddress.country,
    )
  ) {
    errors.push(
      `${label} : le pays est obligatoire.`,
    );
  }

  if (
    options.town
    && !text(
      party.postalAddress.townName,
    )
  ) {
    errors.push(
      `${label} : la ville est obligatoire.`,
    );
  }

  return errors;
}

/**
 * Mirrors the fields currently marked required by OrderSection / PartyForm.
 *
 * Complementary structured-address and identification fields under "Autre"
 * are intentionally not readiness blockers.
 */
export function getOrderRequiredFieldErrors(
  order: TransferOrder,
): string[] {
  const errors: string[] = [];

  if (!text(order.deviseOrdre)) {
    errors.push(
      'La devise de l’ordre est obligatoire.',
    );
  }

  if (!positiveAmount(order.montantOrdre)) {
    errors.push(
      'Le montant de l’ordre doit être supérieur à zéro.',
    );
  }

  if (!text(order.deviseTransfert)) {
    errors.push(
      'La devise du transfert est obligatoire.',
    );
  }

  if (!text(order.dateValeur)) {
    errors.push(
      'La date de valeur est obligatoire.',
    );
  }

  errors.push(
    ...getPartyRequiredFieldErrors(
      'Donneur d’ordre',
      order.debtor,
      {
        account: true,
        country: true,
      },
    ),
  );

  if (order.ultimateDebtorEnabled) {
    errors.push(
      ...getPartyRequiredFieldErrors(
        'Donneur d’ordre final',
        order.ultimateDebtor,
        {
          country: true,
        },
      ),
    );
  }

  errors.push(
    ...getPartyRequiredFieldErrors(
      'Bénéficiaire',
      order.beneficiary,
      {
        account: true,
        country: true,
        town: true,
      },
    ),
  );

  if (order.ultimateCreditorEnabled) {
    errors.push(
      ...getPartyRequiredFieldErrors(
        'Bénéficiaire final',
        order.ultimateCreditor,
        {
          account: true,
          country: true,
          town: true,
        },
      ),
    );
  }

  if (!text(order.beneficiaryBank.bicfi)) {
    errors.push(
      'Le BIC de la banque bénéficiaire est obligatoire.',
    );
  }

  if (!text(order.beneficiaryBank.nom)) {
    errors.push(
      'Recherchez et validez la banque bénéficiaire à partir du BIC.',
    );
  }

  if (!text(order.motifPaiement)) {
    errors.push(
      'Le motif de paiement est obligatoire.',
    );
  }

  if (!text(order.chargeBearer)) {
    errors.push(
      'La répartition des frais est obligatoire.',
    );
  }

  return errors;
}

export function isOrderRequiredFieldsComplete(
  order: TransferOrder,
): boolean {
  return (
    getOrderRequiredFieldErrors(
      order,
    ).length === 0
  );
}
