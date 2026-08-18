import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from 'lucide-react';

import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

import type {
  AccountRow,
  CbprOtherIdentification,
  CbprPartyData,
  CountryOption,
  TransferPartyRole,
} from '../transfer.types';
import {
  createEmptyCbprOtherIdentification,
  getOtherIdentificationSchemeMode,
  normalizeCbprParty,
  isCbprPartyPathLocked,
  isCbprPartyPathOrChildLocked,
  setOtherIdentificationSchemeMode,
  switchAddressMode,
  switchPartyKind,
  type CbprPartyFieldPath,
} from '../transfer.cbpr-party';
import { FI } from '../transfer.ui';

interface CbprPartyFormProps {
  title: string;
  value: CbprPartyData;
  onChange: (value: CbprPartyData) => void;
  role: TransferPartyRole;
  countries: CountryOption[];
  countriesLoading?: boolean;
  accountLov?: boolean;
  accountOptions?: AccountRow[];
  accountRequired?: boolean;
  countryRequired?: boolean;
  lockedFields?: readonly CbprPartyFieldPath[];
}

function labelForRole(
  role: CbprPartyFormProps['role'],
): string {
  switch (role) {
    case 'DEBTOR':
      return 'donneur d’ordre';
    case 'CREDITOR':
      return 'bénéficiaire';
    case 'ULTIMATE_DEBTOR':
      return 'donneur d’ordre final';
    case 'ULTIMATE_CREDITOR':
      return 'bénéficiaire final';
  }
}

export function CbprPartyForm({
  title,
  value: rawValue,
  onChange,
  role,
  countries,
  countriesLoading = false,
  accountLov = false,
  accountOptions = [],
  accountRequired = false,
  countryRequired = true,
  lockedFields = [],
}: CbprPartyFormProps) {
  // Complementary CBPR+ data is intentionally collapsed by default
  // for every transfer party (Dbtr, UltmtDbtr, Cdtr, UltmtCdtr).
  const [expanded, setExpanded] = useState(false);
  const complementaryRegionId =
    `cbpr-complementary-${role.toLowerCase()}`;

  const roleLabel = labelForRole(role);

  // Protect the UI from legacy/draft/HMR party objects that predate the
  // CBPR+ structure. Every nested read below uses this normalized value.
  const value = normalizeCbprParty(rawValue);

  const locked = (path: string) =>
    isCbprPartyPathLocked(
      lockedFields,
      path,
    );

  const subtreeLocked = (path: string) =>
    isCbprPartyPathOrChildLocked(
      lockedFields,
      path,
    );

  const countryOptions = useMemo(
    () => [
      {
        value: '',
        label: countriesLoading
          ? 'Chargement des pays...'
          : 'Sélectionner un pays',
      },
      ...countries.map(country => ({
        value: country.alpha2,
        label: `${country.alpha2} — ${country.label}`,
      })),
    ],
    [countries, countriesLoading],
  );

  const accountSelectOptions = [
    {
      value: '',
      label: 'Sélectionner un compte',
    },
    ...accountOptions.map(account => ({
      value: account.numero,
      label: [
        account.numero,
        account.devise,
        account.type,
      ]
        .filter(Boolean)
        .join(' — '),
    })),
  ];

  const update = (
    producer: (current: CbprPartyData) => CbprPartyData,
  ) => {
    onChange(producer(value));
  };

  const updatePostal = (
    field: keyof CbprPartyData['postalAddress'],
    fieldValue:
      CbprPartyData['postalAddress'][typeof field],
  ) => {
    if (locked(`postalAddress.${String(field)}`)) return;

    update(current => ({
      ...current,
      postalAddress: {
        ...current.postalAddress,
        [field]: fieldValue,
      },
    }));
  };

  const updateCountryOfResidence = (code: string) => {
    if (locked('countryOfResidence')) return;

    update(current => ({
      ...current,
      countryOfResidence: code.toUpperCase(),
    }));
  };

  const changePartyKind = (
    kind: CbprPartyData['partyKind'],
  ) => {
    if (locked('partyKind')) return;
    onChange(switchPartyKind(value, kind));
  };

  const changeAddressMode = (
    mode: CbprPartyData['addressMode'],
  ) => {
    if (locked('addressMode')) return;
    onChange(switchAddressMode(value, mode));
  };

  const identificationCollection =
    value.partyKind === 'ORGANISATION'
      ? value.organisationIdentification.other
      : value.partyKind === 'PRIVATE_PERSON'
        ? value.privateIdentification.other
        : [];

  const identificationPrefix =
    value.partyKind === 'ORGANISATION'
      ? 'organisationIdentification.other'
      : 'privateIdentification.other';

  const setIdentificationCollection = (
    next: CbprOtherIdentification[],
  ) => {
    if (value.partyKind === 'ORGANISATION') {
      update(current => ({
        ...current,
        organisationIdentification: {
          ...current.organisationIdentification,
          other: next,
        },
      }));
      return;
    }

    if (value.partyKind === 'PRIVATE_PERSON') {
      update(current => ({
        ...current,
        privateIdentification: {
          ...current.privateIdentification,
          other: next,
        },
      }));
    }
  };

  const ensureIdentification = (
    index: number,
  ): CbprOtherIdentification[] => {
    const next = identificationCollection.map(item => ({
      ...item,
      schemeName: {
        ...item.schemeName,
      },
    }));

    while (next.length <= index) {
      next.push(createEmptyCbprOtherIdentification());
    }

    return next;
  };

  const updateOtherIdentification = (
    index: number,
    field:
      | 'id'
      | 'issuer'
      | 'schemeCode'
      | 'schemeProprietary'
      | 'schemeMode',
    fieldValue: string,
  ) => {
    const prefix = `${identificationPrefix}.${index}`;

    if (
      field === 'id'
      && locked(`${prefix}.id`)
    ) return;

    if (
      field === 'issuer'
      && locked(`${prefix}.issuer`)
    ) return;

    if (
      field.startsWith('scheme')
      && subtreeLocked(`${prefix}.schemeName`)
    ) return;

    const next = ensureIdentification(index);
    const current = next[index];

    if (field === 'id') {
      next[index] = {
        ...current,
        id: fieldValue,
      };
    } else if (field === 'issuer') {
      next[index] = {
        ...current,
        issuer: fieldValue,
      };
    } else if (field === 'schemeCode') {
      next[index] = {
        ...current,
        schemeName: {
          code: fieldValue,
          proprietary: '',
        },
      };
    } else if (field === 'schemeProprietary') {
      next[index] = {
        ...current,
        schemeName: {
          code: '',
          proprietary: fieldValue,
        },
      };
    } else {
      next[index] = setOtherIdentificationSchemeMode(
        current,
        fieldValue as '' | 'CODE' | 'PROPRIETARY',
      );
    }

    setIdentificationCollection(next);
  };

  const removeOtherIdentification = (
    index: number,
  ) => {
    const prefix = `${identificationPrefix}.${index}`;
    if (subtreeLocked(prefix)) return;

    setIdentificationCollection(
      identificationCollection.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    );
  };

  const primaryIdentification =
    identificationCollection[0]
    ?? createEmptyCbprOtherIdentification();

  const primarySchemeMode =
    getOtherIdentificationSchemeMode(
      primaryIdentification,
    );

  const updateAddressLine = (
    index: number,
    fieldValue: string,
  ) => {
    const path = `postalAddress.addressLines.${index}`;
    if (locked(path)) return;

    const next = [...value.postalAddress.addressLines];
    while (next.length <= index) next.push('');
    next[index] = fieldValue.slice(0, 70);

    updatePostal(
      'addressLines',
      next.slice(0, 7),
    );
  };

  const addAddressLine = () => {
    if (value.postalAddress.addressLines.length >= 7) {
      return;
    }

    updatePostal(
      'addressLines',
      [
        ...value.postalAddress.addressLines,
        '',
      ],
    );
  };

  const removeAddressLine = (index: number) => {
    if (
      locked(`postalAddress.addressLines.${index}`)
    ) {
      return;
    }

    updatePostal(
      'addressLines',
      value.postalAddress.addressLines.filter(
        (_, currentIndex) => currentIndex !== index,
      ),
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">
          {title}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Les informations essentielles apparaissent en premier. Les données
          complémentaires restent disponibles à la demande.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations principales</CardTitle>
          <CardDescription>
            Données prioritaires du {roleLabel}.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <FI
                label="Nom et prénom / Raison sociale"
                value={value.name}
                onChange={name => {
                  if (locked('name')) return;
                  update(current => ({
                    ...current,
                    name: name.slice(0, 140),
                  }));
                }}
                required
                disabled={locked('name')}
              />
            </div>

            <FI
              label="Type de partie"
              value={value.partyKind}
              onChange={fieldValue =>
                changePartyKind(
                  fieldValue as CbprPartyData['partyKind'],
                )
              }
              select
              required
              disabled={locked('partyKind')}
              opts={[
                {
                  value: '',
                  label: 'Sélectionner le type',
                },
                {
                  value: 'ORGANISATION',
                  label: 'Organisation',
                },
                {
                  value: 'PRIVATE_PERSON',
                  label: 'Personne physique',
                },
              ]}
            />

            {accountLov ? (
              <FI
                label={
                  role === 'DEBTOR'
                    ? 'Compte donneur d’ordre'
                    : 'Compte / IBAN'
                }
                value={value.account}
                onChange={account => {
                  if (locked('account')) return;
                  update(current => ({
                    ...current,
                    account,
                  }));
                }}
                select
                required={accountRequired}
                disabled={locked('account')}
                opts={accountSelectOptions}
              />
            ) : (
              <FI
                label="Compte / IBAN"
                value={value.account}
                onChange={account => {
                  if (locked('account')) return;
                  update(current => ({
                    ...current,
                    account: account
                      .replace(/\s/g, '')
                      .toUpperCase(),
                  }));
                }}
                required={accountRequired}
                disabled={locked('account')}
              />
            )}

            <FI
              label="Pays de résidence"
              value={value.countryOfResidence}
              onChange={updateCountryOfResidence}
              select
              required={countryRequired}
              disabled={
                countriesLoading
                || locked('countryOfResidence')
              }
              opts={countryOptions}
            />

            <FI
              label="Format d’adresse postale"
              value={value.addressMode}
              onChange={fieldValue =>
                changeAddressMode(
                  fieldValue as CbprPartyData['addressMode'],
                )
              }
              select
              disabled={locked('addressMode')}
              opts={[
                {
                  value: '',
                  label: 'Non renseigné',
                },
                {
                  value: 'STRUCTURED',
                  label: 'Adresse structurée',
                },
                {
                  value: 'ADDRESS_LINES',
                  label: 'Lignes d’adresse',
                },
              ]}
            />
          </div>

          {value.addressMode === 'STRUCTURED' && (
            <div className="grid grid-cols-1 gap-4 border-t pt-5 md:grid-cols-3">
              <FI
                label="Pays de l’adresse"
                value={value.postalAddress.country}
                onChange={code =>
                  updatePostal(
                    'country',
                    code.toUpperCase(),
                  )
                }
                select
                disabled={
                  countriesLoading
                  || locked('postalAddress.country')
                }
                opts={countryOptions}
              />

              <FI
                label="Ville"
                value={value.postalAddress.townName}
                onChange={fieldValue =>
                  updatePostal(
                    'townName',
                    fieldValue,
                  )
                }
                disabled={locked('postalAddress.townName')}
              />

              <FI
                label="Code postal"
                value={value.postalAddress.postCode}
                onChange={fieldValue =>
                  updatePostal(
                    'postCode',
                    fieldValue,
                  )
                }
                disabled={locked('postalAddress.postCode')}
              />
            </div>
          )}

          {value.addressMode === 'ADDRESS_LINES' && (
            <div className="space-y-3 border-t pt-5">
              {[0, 1].map(index => (
                <FI
                  key={index}
                  label={`Ligne d’adresse ${index + 1} `}
                  value={
                    value.postalAddress.addressLines[index]
                    ?? ''
                  }
                  onChange={fieldValue =>
                    updateAddressLine(index, fieldValue)
                  }
                  disabled={locked(
                    `postalAddress.addressLines.${index}`,
                  )}
                />
              ))}
            </div>
          )}

          {value.partyKind && (
            <div className="space-y-4 border-t pt-5">
              <p className="text-sm font-semibold">
                Identification
              </p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <FI
                  label="Identifiant"
                  value={primaryIdentification.id}
                  onChange={fieldValue =>
                    updateOtherIdentification(
                      0,
                      'id',
                      fieldValue,
                    )
                  }
                  disabled={locked(
                    `${identificationPrefix}.0.id`,
                  )}
                />

                <FI
                  label="Type de schéma"
                  value={primarySchemeMode}
                  onChange={fieldValue =>
                    updateOtherIdentification(
                      0,
                      'schemeMode',
                      fieldValue,
                    )
                  }
                  select
                  disabled={subtreeLocked(
                    `${identificationPrefix}.0.schemeName`,
                  )}
                  opts={[
                    {
                      value: '',
                      label: 'Non renseigné',
                    },
                    {
                      value: 'CODE',
                      label: 'Code standard',
                    },
                    {
                      value: 'PROPRIETARY',
                      label: 'Code spécifique',
                    },
                  ]}
                />

                {primarySchemeMode === 'CODE' && (
                  <FI
                    label="Code du type d’identifiant"
                    value={primaryIdentification.schemeName.code}
                    onChange={fieldValue =>
                      updateOtherIdentification(
                        0,
                        'schemeCode',
                        fieldValue,
                      )
                    }
                    disabled={subtreeLocked(
                      `${identificationPrefix}.0.schemeName`,
                    )}
                  />
                )}

                {primarySchemeMode === 'PROPRIETARY' && (
                  <FI
                    label="Type d’identifiant spécifique"
                    value={
                      primaryIdentification
                        .schemeName
                        .proprietary
                    }
                    onChange={fieldValue =>
                      updateOtherIdentification(
                        0,
                        'schemeProprietary',
                        fieldValue,
                      )
                    }
                    disabled={subtreeLocked(
                      `${identificationPrefix}.0.schemeName`,
                    )}
                  />
                )}

                <FI
                  label="Émetteur"
                  value={primaryIdentification.issuer}
                  onChange={fieldValue =>
                    updateOtherIdentification(
                      0,
                      'issuer',
                      fieldValue,
                    )
                  }
                  disabled={locked(
                    `${identificationPrefix}.0.issuer`,
                  )}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        aria-expanded={expanded}
        aria-controls={complementaryRegionId}
        onClick={() => setExpanded(current => !current)}
      >
        {expanded ? (
          <ChevronUp className="mr-2 h-4 w-4" />
        ) : (
          <ChevronDown className="mr-2 h-4 w-4" />
        )}
        {expanded
          ? 'Masquer les informations complémentaires'
          : 'Afficher les informations complémentaires'}
      </Button>

      {expanded && (
        <div
          id={complementaryRegionId}
          className="space-y-5"
        >
          {value.addressMode === 'STRUCTURED' && (
            <Card>
              <CardHeader>
                <CardTitle>Informations complémentaires sur l’adresse</CardTitle>
                <CardDescription>
                  Renseignez uniquement les informations d’adresse utiles à
                  l’opération.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {[
                    ['department', 'Département'],
                    ['subDepartment', 'Sous-département'],
                    ['streetName', 'Nom de la rue'],
                    ['buildingNumber', 'Numéro du bâtiment'],
                    ['buildingName', 'Nom du bâtiment'],
                    ['floor', 'Étage'],
                    ['postBox', 'Boîte postale'],
                    ['room', 'Pièce / bureau'],
                    ['townLocationName', 'Quartier / lieu-dit'],
                    ['districtName', 'District'],
                    ['countrySubDivision', 'Région / province'],
                  ].map(([field, label]) => (
                    <FI
                      key={field}
                      label={label}
                      value={
                        String(
                          value.postalAddress[
                            field as keyof CbprPartyData['postalAddress']
                          ] ?? '',
                        )
                      }
                      onChange={fieldValue =>
                        updatePostal(
                          field as keyof CbprPartyData['postalAddress'],
                          fieldValue as never,
                        )
                      }
                      disabled={locked(
                        `postalAddress.${field}`,
                      )}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {value.addressMode === 'ADDRESS_LINES' && (
            <Card>
              <CardHeader>
                <CardTitle>Lignes d’adresse complémentaires</CardTitle>
                <CardDescription>
                  Vous pouvez ajouter jusqu’à 7 lignes d’adresse de 70 caractères
                  chacune.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {value.postalAddress.addressLines
                  .slice(2)
                  .map((line, offset) => {
                    const index = offset + 2;

                    return (
                      <div
                        key={index}
                        className="grid grid-cols-[1fr_auto] gap-2"
                      >
                        <FI
                          label={`Ligne d’adresse ${index + 1}`}
                          value={line}
                          onChange={fieldValue =>
                            updateAddressLine(index, fieldValue)
                          }
                          disabled={locked(
                            `postalAddress.addressLines.${index}`,
                          )}
                        />

                        <div className="flex items-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              removeAddressLine(index)
                            }
                            disabled={locked(
                              `postalAddress.addressLines.${index}`,
                            )}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                {value.postalAddress.addressLines.length < 7 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addAddressLine}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une ligne d’adresse
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {value.partyKind === 'ORGANISATION' && (
            <Card>
              <CardHeader>
                <CardTitle>Informations d’identification de l’organisation</CardTitle>
                <CardDescription>
                  Renseignez les identifiants complémentaires disponibles pour
                  l’organisation.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FI
                    label="Code BIC de l’organisation"
                    value={
                      value.organisationIdentification.anyBic
                    }
                    onChange={anyBic => {
                      if (
                        locked(
                          'organisationIdentification.anyBic',
                        )
                      ) return;

                      update(current => ({
                        ...current,
                        organisationIdentification: {
                          ...current.organisationIdentification,
                          anyBic: anyBic
                            .replace(/\s/g, '')
                            .toUpperCase(),
                        },
                      }));
                    }}
                    disabled={locked(
                      'organisationIdentification.anyBic',
                    )}
                  />

                  <FI
                    label="Identifiant LEI"
                    value={value.organisationIdentification.lei}
                    onChange={lei => {
                      if (
                        locked(
                          'organisationIdentification.lei',
                        )
                      ) return;

                      update(current => ({
                        ...current,
                        organisationIdentification: {
                          ...current.organisationIdentification,
                          lei: lei
                            .replace(/\s/g, '')
                            .toUpperCase(),
                        },
                      }));
                    }}
                    disabled={locked(
                      'organisationIdentification.lei',
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {value.partyKind === 'PRIVATE_PERSON' && (
            <Card>
              <CardHeader>
                <CardTitle>Informations complémentaires de la personne physique</CardTitle>
                <CardDescription>
                  Renseignez les informations de naissance lorsque celles-ci sont
                  disponibles.
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <FI
                    label="Date de naissance"
                    type="date"
                    value={
                      value.privateIdentification
                        .dateAndPlaceOfBirth
                        .birthDate
                    }
                    onChange={birthDate => {
                      const path =
                        'privateIdentification.dateAndPlaceOfBirth.birthDate';
                      if (locked(path)) return;

                      update(current => ({
                        ...current,
                        privateIdentification: {
                          ...current.privateIdentification,
                          dateAndPlaceOfBirth: {
                            ...current.privateIdentification
                              .dateAndPlaceOfBirth,
                            birthDate,
                          },
                        },
                      }));
                    }}
                    disabled={locked(
                      'privateIdentification.dateAndPlaceOfBirth.birthDate',
                    )}
                  />

                  <FI
                    label="Province de naissance"
                    value={
                      value.privateIdentification
                        .dateAndPlaceOfBirth
                        .provinceOfBirth
                    }
                    onChange={provinceOfBirth => {
                      const path =
                        'privateIdentification.dateAndPlaceOfBirth.provinceOfBirth';
                      if (locked(path)) return;

                      update(current => ({
                        ...current,
                        privateIdentification: {
                          ...current.privateIdentification,
                          dateAndPlaceOfBirth: {
                            ...current.privateIdentification
                              .dateAndPlaceOfBirth,
                            provinceOfBirth,
                          },
                        },
                      }));
                    }}
                    disabled={locked(
                      'privateIdentification.dateAndPlaceOfBirth.provinceOfBirth',
                    )}
                  />

                  <FI
                    label="Ville de naissance"
                    value={
                      value.privateIdentification
                        .dateAndPlaceOfBirth
                        .cityOfBirth
                    }
                    onChange={cityOfBirth => {
                      const path =
                        'privateIdentification.dateAndPlaceOfBirth.cityOfBirth';
                      if (locked(path)) return;

                      update(current => ({
                        ...current,
                        privateIdentification: {
                          ...current.privateIdentification,
                          dateAndPlaceOfBirth: {
                            ...current.privateIdentification
                              .dateAndPlaceOfBirth,
                            cityOfBirth,
                          },
                        },
                      }));
                    }}
                    disabled={locked(
                      'privateIdentification.dateAndPlaceOfBirth.cityOfBirth',
                    )}
                  />

                  <FI
                    label="Pays de naissance"
                    value={
                      value.privateIdentification
                        .dateAndPlaceOfBirth
                        .countryOfBirth
                    }
                    onChange={countryOfBirth => {
                      const path =
                        'privateIdentification.dateAndPlaceOfBirth.countryOfBirth';
                      if (locked(path)) return;

                      update(current => ({
                        ...current,
                        privateIdentification: {
                          ...current.privateIdentification,
                          dateAndPlaceOfBirth: {
                            ...current.privateIdentification
                              .dateAndPlaceOfBirth,
                            countryOfBirth:
                              countryOfBirth.toUpperCase(),
                          },
                        },
                      }));
                    }}
                    select
                    disabled={
                      countriesLoading
                      || locked(
                        'privateIdentification.dateAndPlaceOfBirth.countryOfBirth',
                      )
                    }
                    opts={countryOptions}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {value.partyKind && (
            <Card>
              <CardHeader>
                <CardTitle>Identifiants complémentaires</CardTitle>
                <CardDescription>
                  Vous pouvez ajouter d’autres identifiants lorsque l’opération
                  l’exige.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {identificationCollection
                  .slice(1)
                  .map((identification, offset) => {
                    const index = offset + 1;
                    const prefix =
                      `${identificationPrefix}.${index}`;
                    const mode =
                      getOtherIdentificationSchemeMode(
                        identification,
                      );

                    return (
                      <div
                        key={index}
                        className="rounded-lg border p-4"
                      >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                          <FI
                            label="Identifiant"
                            value={identification.id}
                            onChange={fieldValue =>
                              updateOtherIdentification(
                                index,
                                'id',
                                fieldValue,
                              )
                            }
                            disabled={locked(`${prefix}.id`)}
                          />

                          <FI
                            label="Type de schéma"
                            value={mode}
                            onChange={fieldValue =>
                              updateOtherIdentification(
                                index,
                                'schemeMode',
                                fieldValue,
                              )
                            }
                            select
                            disabled={subtreeLocked(
                              `${prefix}.schemeName`,
                            )}
                            opts={[
                              {
                                value: '',
                                label: 'Non renseigné',
                              },
                              {
                                value: 'CODE',
                                label: 'Code standard',
                              },
                              {
                                value: 'PROPRIETARY',
                                label: 'Code spécifique',
                              },
                            ]}
                          />

                          {mode === 'CODE' && (
                            <FI
                              label="Code standard"
                              value={
                                identification.schemeName.code
                              }
                              onChange={fieldValue =>
                                updateOtherIdentification(
                                  index,
                                  'schemeCode',
                                  fieldValue,
                                )
                              }
                              disabled={subtreeLocked(
                                `${prefix}.schemeName`,
                              )}
                            />
                          )}

                          {mode === 'PROPRIETARY' && (
                            <FI
                              label="Code spécifique"
                              value={
                                identification
                                  .schemeName
                                  .proprietary
                              }
                              onChange={fieldValue =>
                                updateOtherIdentification(
                                  index,
                                  'schemeProprietary',
                                  fieldValue,
                                )
                              }
                              disabled={subtreeLocked(
                                `${prefix}.schemeName`,
                              )}
                            />
                          )}

                          <FI
                            label="Émetteur"
                            value={identification.issuer}
                            onChange={fieldValue =>
                              updateOtherIdentification(
                                index,
                                'issuer',
                                fieldValue,
                              )
                            }
                            disabled={locked(
                              `${prefix}.issuer`,
                            )}
                          />
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeOtherIdentification(index)
                            }
                            disabled={subtreeLocked(prefix)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIdentificationCollection([
                      ...identificationCollection,
                      createEmptyCbprOtherIdentification(),
                    ]);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter un identifiant
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}