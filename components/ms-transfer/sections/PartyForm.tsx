import React, {
  useState,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from 'lucide-react';

import { Button } from '../../ui/button';

import type {
  AccountRow,
  CountryOption,
  PartyData,
  PartyOtherIdentification,
} from '../transfer.types';
import {
  createEmptyOtherIdentification,
  normalizePartyData,
  switchPartyType,
} from '../transfer.party-structured';
import {
  isPartyFieldLocked,
  isPartySubtreeLocked,
  type PartyField,
} from '../transfer.party-locks';
import { FI } from '../transfer.ui';

interface PartyFormProps {
  title: string;
  value: PartyData;
  onChange: (value: PartyData) => void;

  beneficiary?: boolean;

  countryLov?: boolean;
  countryOptions?: CountryOption[];
  countryLoading?: boolean;
  countryRequired?: boolean;

  accountLov?: boolean;
  accountOptions?: AccountRow[];
  accountRequired?: boolean;

  lockedFields?: readonly PartyField[];
}

export function PartyForm({
  title,
  value: rawValue,
  onChange,
  beneficiary = false,
  countryLov = false,
  countryOptions = [],
  countryLoading = false,
  countryRequired = beneficiary,
  accountLov = false,
  accountOptions = [],
  accountRequired = beneficiary,
  lockedFields = [],
}: PartyFormProps) {
  const [showOther, setShowOther] =
    useState(false);

  /**
   * Runtime guard for old flat/partial PartyData values.
   *
   * `rawValue` is never read directly below this line. The whole component
   * works only with the normalized `value`.
   */
  const value =
    normalizePartyData(rawValue);

  const locked = (
    field: PartyField,
  ) =>
    isPartyFieldLocked(
      lockedFields,
      field,
    );

  const subtreeLocked = (
    prefix: string,
  ) =>
    isPartySubtreeLocked(
      lockedFields,
      prefix,
    );

  const countryOptionsForUi = [
    {
      value: '',
      label: countryLoading
        ? 'Chargement des pays...'
        : 'Sélectionner un pays',
    },
    ...countryOptions.map(
      country => ({
        value: country.alpha2,
        label:
          `${country.alpha2} — ${country.label}`,
      }),
    ),
  ];

  const accountOptionsForUi = [
    {
      value: '',
      label: 'Sélectionner un compte',
    },
    ...accountOptions.map(
      account => ({
        value: account.numero,
        label: [
          account.numero,
          account.devise,
          account.type,
        ]
          .filter(Boolean)
          .join(' — '),
      }),
    ),
  ];

  const updateRoot = <
    K extends
      | 'nomRaison'
      | 'type'
      | 'compte'
      | 'countryOfResidence'
  >(
    field: K,
    fieldValue: PartyData[K],
  ) => {
    if (
      locked(
        field as PartyField,
      )
    ) {
      return;
    }

    if (field === 'type') {
      onChange(
        switchPartyType(
          value,
          fieldValue as PartyData['type'],
        ),
      );
      return;
    }

    onChange({
      ...value,
      [field]: fieldValue,
    });
  };

  const updatePostal = <
    K extends
      keyof PartyData['postalAddress']
  >(
    field: K,
    fieldValue:
      PartyData['postalAddress'][K],
  ) => {
    const path =
      `postalAddress.${String(field)}` as PartyField;

    if (locked(path)) {
      return;
    }

    onChange({
      ...value,
      postalAddress: {
        ...value.postalAddress,
        [field]: fieldValue,
      },
    });
  };

  const updateOrganisation = (
    field:
      | 'anyBic'
      | 'lei',
    fieldValue: string,
  ) => {
    const path =
      `organisationIdentification.${field}` as PartyField;

    if (locked(path)) {
      return;
    }

    onChange({
      ...value,
      organisationIdentification: {
        ...value.organisationIdentification,
        [field]: fieldValue,
      },
    });
  };

  const updateBirth = (
    field:
      keyof PartyData[
        'privateIdentification'
      ][
        'dateAndPlaceOfBirth'
      ],
    fieldValue: string,
  ) => {
    const path =
      `privateIdentification.dateAndPlaceOfBirth.${String(field)}` as PartyField;

    if (locked(path)) {
      return;
    }

    onChange({
      ...value,
      privateIdentification: {
        ...value.privateIdentification,
        dateAndPlaceOfBirth: {
          ...value
            .privateIdentification
            .dateAndPlaceOfBirth,
          [field]: fieldValue,
        },
      },
    });
  };

  const identificationCollection =
    value.type
      === 'PERSONNE_MORALE'
      ? value
          .organisationIdentification
          .other
      : value.type
          === 'PERSONNE_PHYSIQUE'
        ? value
            .privateIdentification
            .other
        : [];

  const identificationPrefix =
    value.type
      === 'PERSONNE_MORALE'
      ? 'organisationIdentification.other'
      : 'privateIdentification.other';

  const setIdentificationCollection = (
    next:
      PartyOtherIdentification[],
  ) => {
    if (
      value.type
      === 'PERSONNE_MORALE'
    ) {
      onChange({
        ...value,
        organisationIdentification: {
          ...value
            .organisationIdentification,
          other: next,
        },
      });
      return;
    }

    if (
      value.type
      === 'PERSONNE_PHYSIQUE'
    ) {
      onChange({
        ...value,
        privateIdentification: {
          ...value
            .privateIdentification,
          other: next,
        },
      });
    }
  };

  const updateIdentification = (
    index: number,
    field:
      | 'id'
      | 'issuer'
      | 'schemeMode'
      | 'schemeCode'
      | 'schemeProprietary',
    fieldValue: string,
  ) => {
    const prefix =
      `${identificationPrefix}.${index}`;

    if (
      field === 'id'
      && locked(
        `${prefix}.id` as PartyField,
      )
    ) {
      return;
    }

    if (
      field === 'issuer'
      && locked(
        `${prefix}.issuer` as PartyField,
      )
    ) {
      return;
    }

    if (
      field.startsWith('scheme')
      && subtreeLocked(
        `${prefix}.schemeName`,
      )
    ) {
      return;
    }

    const next =
      identificationCollection
        .map(item => ({
          ...item,
          schemeName: {
            ...item.schemeName,
          },
        }));

    while (
      next.length <= index
    ) {
      next.push(
        createEmptyOtherIdentification(),
      );
    }

    const current = next[index];

    if (field === 'id') {
      next[index] = {
        ...current,
        id: fieldValue,
      };
    }

    if (field === 'issuer') {
      next[index] = {
        ...current,
        issuer: fieldValue,
      };
    }

    if (
      field === 'schemeMode'
    ) {
      next[index] = {
        ...current,
        schemeName:
          fieldValue === 'CODE'
            ? {
                code:
                  current
                    .schemeName
                    .code,
                proprietary: '',
              }
            : fieldValue
                === 'PROPRIETARY'
              ? {
                  code: '',
                  proprietary:
                    current
                      .schemeName
                      .proprietary,
                }
              : {
                  code: '',
                  proprietary: '',
                },
      };
    }

    if (
      field === 'schemeCode'
    ) {
      next[index] = {
        ...current,
        schemeName: {
          code: fieldValue,
          proprietary: '',
        },
      };
    }

    if (
      field
      === 'schemeProprietary'
    ) {
      next[index] = {
        ...current,
        schemeName: {
          code: '',
          proprietary: fieldValue,
        },
      };
    }

    setIdentificationCollection(
      next,
    );
  };

  const removeIdentification = (
    index: number,
  ) => {
    const prefix =
      `${identificationPrefix}.${index}`;

    if (
      subtreeLocked(prefix)
    ) {
      return;
    }

    setIdentificationCollection(
      identificationCollection.filter(
        (_, currentIndex) =>
          currentIndex !== index,
      ),
    );
  };

  const schemeMode = (
    item:
      PartyOtherIdentification,
  ):
    | ''
    | 'CODE'
    | 'PROPRIETARY' => {
    if (
      item.schemeName.code
    ) {
      return 'CODE';
    }

    if (
      item
        .schemeName
        .proprietary
    ) {
      return 'PROPRIETARY';
    }

    return '';
  };

  const renderCountry = (
    label: string,
    valueCode: string,
    onCountryChange:
      (code: string) => void,
    required = false,
    disabled = false,
  ) => {
    if (countryLov) {
      return (
        <FI
          label={label}
          value={valueCode}
          onChange={onCountryChange}
          select
          required={required}
          disabled={
            countryLoading
            || disabled
          }
          opts={
            countryOptionsForUi
          }
        />
      );
    }

    return (
      <FI
        label={label}
        value={valueCode}
        onChange={code =>
          onCountryChange(
            code
              .trim()
              .toUpperCase(),
          )
        }
        required={required}
        disabled={disabled}
      />
    );
  };

  return (
    <div className="space-y-5">
      <h3 className="text-sm font-semibold">
        {title}
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <FI
            label="Nom et prénom / Raison sociale"
            value={value.nomRaison}
            onChange={fieldValue =>
              updateRoot(
                'nomRaison',
                fieldValue.slice(
                  0,
                  140,
                ),
              )
            }
            required
            disabled={
              locked('nomRaison')
            }
          />
        </div>

        <FI
          label="Type"
          value={value.type}
          onChange={fieldValue =>
            updateRoot(
              'type',
              fieldValue as PartyData['type'],
            )
          }
          select
          required
          disabled={locked('type')}
          opts={[
            {
              value: '',
              label:
                'Sélectionner le type',
            },
            {
              value:
                'PERSONNE_MORALE',
              label:
                'Personne morale',
            },
            {
              value:
                'PERSONNE_PHYSIQUE',
              label:
                'Personne physique',
            },
          ]}
        />

        {accountLov ? (
          <FI
            label={
              beneficiary
                ? 'Compte bénéficiaire / IBAN'
                : 'Compte donneur d’ordre'
            }
            value={value.compte}
            onChange={fieldValue =>
              updateRoot(
                'compte',
                fieldValue,
              )
            }
            select
            required={accountRequired}
            disabled={locked('compte')}
            opts={
              accountOptionsForUi
            }
          />
        ) : (
          <FI
            label={
              beneficiary
                ? 'Compte bénéficiaire / IBAN'
                : 'Compte'
            }
            value={value.compte}
            onChange={fieldValue =>
              updateRoot(
                'compte',
                fieldValue
                  .replace(/\s/g, '')
                  .toUpperCase(),
              )
            }
            required={accountRequired}
            disabled={locked('compte')}
          />
        )}

        {renderCountry(
          'Pays de résidence',
          value.countryOfResidence,
          code =>
            updateRoot(
              'countryOfResidence',
              code.toUpperCase(),
            ),
          false,
          locked(
            'countryOfResidence',
          ),
        )}
      </div>

      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="mb-4">
          <p className="text-sm font-semibold">
            Adresse
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Renseignez les informations principales de l’adresse.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FI
            label="Nom de la rue"
            value={
              value.postalAddress
                .streetName
            }
            onChange={fieldValue =>
              updatePostal(
                'streetName',
                fieldValue,
              )
            }
            disabled={locked(
              'postalAddress.streetName',
            )}
          />

          <FI
            label="Numéro de bâtiment"
            value={
              value.postalAddress
                .buildingNumber
            }
            onChange={fieldValue =>
              updatePostal(
                'buildingNumber',
                fieldValue,
              )
            }
            disabled={locked(
              'postalAddress.buildingNumber',
            )}
          />

          <FI
            label="Nom du bâtiment"
            value={
              value.postalAddress
                .buildingName
            }
            onChange={fieldValue =>
              updatePostal(
                'buildingName',
                fieldValue,
              )
            }
            disabled={locked(
              'postalAddress.buildingName',
            )}
          />

          <FI
            label="Code postal"
            value={
              value.postalAddress
                .postCode
            }
            onChange={fieldValue =>
              updatePostal(
                'postCode',
                fieldValue,
              )
            }
            disabled={locked(
              'postalAddress.postCode',
            )}
          />

          <FI
            label="Nom de la ville"
            value={
              value.postalAddress
                .townName
            }
            onChange={fieldValue =>
              updatePostal(
                'townName',
                fieldValue,
              )
            }
            required={beneficiary}
            disabled={locked(
              'postalAddress.townName',
            )}
          />

          {renderCountry(
            'Pays',
            value.postalAddress
              .country,
            code =>
              updatePostal(
                'country',
                code.toUpperCase(),
              ),
            countryRequired,
            locked(
              'postalAddress.country',
            ),
          )}
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full"
        aria-expanded={showOther}
        onClick={() =>
          setShowOther(
            current => !current,
          )
        }
      >
        {showOther ? (
          <ChevronUp className="mr-2 h-4 w-4" />
        ) : (
          <ChevronDown className="mr-2 h-4 w-4" />
        )}

        {showOther
          ? 'Masquer les informations complémentaires'
          : 'Autre'}
      </Button>

      {showOther && (
        <div className="space-y-5">
          <div className="rounded-lg border p-4">
            <p className="mb-4 text-sm font-semibold">
              Compléments d’adresse
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FI
                label="Département"
                value={
                  value.postalAddress
                    .department
                }
                onChange={fieldValue =>
                  updatePostal(
                    'department',
                    fieldValue,
                  )
                }
                disabled={locked(
                  'postalAddress.department',
                )}
              />

              <FI
                label="Sous-département"
                value={
                  value.postalAddress
                    .subDepartment
                }
                onChange={fieldValue =>
                  updatePostal(
                    'subDepartment',
                    fieldValue,
                  )
                }
                disabled={locked(
                  'postalAddress.subDepartment',
                )}
              />

              <FI
                label="Étage"
                value={
                  value.postalAddress
                    .floor
                }
                onChange={fieldValue =>
                  updatePostal(
                    'floor',
                    fieldValue,
                  )
                }
                disabled={locked(
                  'postalAddress.floor',
                )}
              />

              <FI
                label="Boîte postale"
                value={
                  value.postalAddress
                    .postBox
                }
                onChange={fieldValue =>
                  updatePostal(
                    'postBox',
                    fieldValue,
                  )
                }
                disabled={locked(
                  'postalAddress.postBox',
                )}
              />

              <FI
                label="Pièce / bureau"
                value={
                  value.postalAddress
                    .room
                }
                onChange={fieldValue =>
                  updatePostal(
                    'room',
                    fieldValue,
                  )
                }
                disabled={locked(
                  'postalAddress.room',
                )}
              />

              <FI
                label="Quartier / lieu-dit"
                value={
                  value.postalAddress
                    .townLocationName
                }
                onChange={fieldValue =>
                  updatePostal(
                    'townLocationName',
                    fieldValue,
                  )
                }
                disabled={locked(
                  'postalAddress.townLocationName',
                )}
              />

              <FI
                label="District"
                value={
                  value.postalAddress
                    .districtName
                }
                onChange={fieldValue =>
                  updatePostal(
                    'districtName',
                    fieldValue,
                  )
                }
                disabled={locked(
                  'postalAddress.districtName',
                )}
              />

              <FI
                label="Région / province"
                value={
                  value.postalAddress
                    .countrySubDivision
                }
                onChange={fieldValue =>
                  updatePostal(
                    'countrySubDivision',
                    fieldValue,
                  )
                }
                disabled={locked(
                  'postalAddress.countrySubDivision',
                )}
              />
            </div>
          </div>

          {value.type
            === 'PERSONNE_MORALE'
            && (
              <div className="rounded-lg border p-4">
                <p className="mb-4 text-sm font-semibold">
                  Identification de l’organisation
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FI
                    label="Code BIC de l’organisation"
                    value={
                      value
                        .organisationIdentification
                        .anyBic
                    }
                    onChange={fieldValue =>
                      updateOrganisation(
                        'anyBic',
                        fieldValue
                          .replace(/\s/g, '')
                          .toUpperCase(),
                      )
                    }
                    disabled={locked(
                      'organisationIdentification.anyBic',
                    )}
                  />

                  <FI
                    label="Identifiant LEI"
                    value={
                      value
                        .organisationIdentification
                        .lei
                    }
                    onChange={fieldValue =>
                      updateOrganisation(
                        'lei',
                        fieldValue
                          .replace(/\s/g, '')
                          .toUpperCase()
                          .slice(0, 20),
                      )
                    }
                    disabled={locked(
                      'organisationIdentification.lei',
                    )}
                  />
                </div>
              </div>
            )}

          {value.type
            === 'PERSONNE_PHYSIQUE'
            && (
              <div className="rounded-lg border p-4">
                <p className="mb-4 text-sm font-semibold">
                  Date et lieu de naissance
                </p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <FI
                    label="Date de naissance"
                    type="date"
                    value={
                      value
                        .privateIdentification
                        .dateAndPlaceOfBirth
                        .birthDate
                    }
                    onChange={fieldValue =>
                      updateBirth(
                        'birthDate',
                        fieldValue,
                      )
                    }
                    disabled={locked(
                      'privateIdentification.dateAndPlaceOfBirth.birthDate',
                    )}
                  />

                  <FI
                    label="Province de naissance"
                    value={
                      value
                        .privateIdentification
                        .dateAndPlaceOfBirth
                        .provinceOfBirth
                    }
                    onChange={fieldValue =>
                      updateBirth(
                        'provinceOfBirth',
                        fieldValue,
                      )
                    }
                    disabled={locked(
                      'privateIdentification.dateAndPlaceOfBirth.provinceOfBirth',
                    )}
                  />

                  <FI
                    label="Ville de naissance"
                    value={
                      value
                        .privateIdentification
                        .dateAndPlaceOfBirth
                        .cityOfBirth
                    }
                    onChange={fieldValue =>
                      updateBirth(
                        'cityOfBirth',
                        fieldValue,
                      )
                    }
                    disabled={locked(
                      'privateIdentification.dateAndPlaceOfBirth.cityOfBirth',
                    )}
                  />

                  {renderCountry(
                    'Pays de naissance',
                    value
                      .privateIdentification
                      .dateAndPlaceOfBirth
                      .countryOfBirth,
                    code =>
                      updateBirth(
                        'countryOfBirth',
                        code.toUpperCase(),
                      ),
                    false,
                    locked(
                      'privateIdentification.dateAndPlaceOfBirth.countryOfBirth',
                    ),
                  )}
                </div>
              </div>
            )}

          {value.type && (
            <div className="rounded-lg border p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">
                    Identifiants complémentaires
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Ajoutez uniquement les identifiants utiles à l’opération.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setIdentificationCollection([
                      ...identificationCollection,
                      createEmptyOtherIdentification(),
                    ])
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter
                </Button>
              </div>

              <div className="space-y-3">
                {identificationCollection.map(
                  (
                    identification,
                    index,
                  ) => {
                    const prefix =
                      `${identificationPrefix}.${index}`;

                    const mode =
                      schemeMode(
                        identification,
                      );

                    return (
                      <div
                        key={index}
                        className="rounded-lg border bg-muted/20 p-4"
                      >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                          <FI
                            label="Identifiant"
                            value={
                              identification.id
                            }
                            onChange={fieldValue =>
                              updateIdentification(
                                index,
                                'id',
                                fieldValue,
                              )
                            }
                            disabled={locked(
                              `${prefix}.id` as PartyField,
                            )}
                          />

                          <FI
                            label="Type d’identifiant"
                            value={mode}
                            onChange={fieldValue =>
                              updateIdentification(
                                index,
                                'schemeMode',
                                fieldValue,
                              )
                            }
                            select
                            disabled={
                              subtreeLocked(
                                `${prefix}.schemeName`,
                              )
                            }
                            opts={[
                              {
                                value: '',
                                label:
                                  'Non renseigné',
                              },
                              {
                                value:
                                  'CODE',
                                label:
                                  'Code standard',
                              },
                              {
                                value:
                                  'PROPRIETARY',
                                label:
                                  'Code spécifique',
                              },
                            ]}
                          />

                          {mode === 'CODE' && (
                            <FI
                              label="Code du type d’identifiant"
                              value={
                                identification
                                  .schemeName
                                  .code
                              }
                              onChange={fieldValue =>
                                updateIdentification(
                                  index,
                                  'schemeCode',
                                  fieldValue,
                                )
                              }
                              disabled={
                                subtreeLocked(
                                  `${prefix}.schemeName`,
                                )
                              }
                            />
                          )}

                          {mode
                            === 'PROPRIETARY'
                            && (
                              <FI
                                label="Type d’identifiant spécifique"
                                value={
                                  identification
                                    .schemeName
                                    .proprietary
                                }
                                onChange={fieldValue =>
                                  updateIdentification(
                                    index,
                                    'schemeProprietary',
                                    fieldValue,
                                  )
                                }
                                disabled={
                                  subtreeLocked(
                                    `${prefix}.schemeName`,
                                  )
                                }
                              />
                            )}

                          <FI
                            label="Émetteur"
                            value={
                              identification
                                .issuer
                            }
                            onChange={fieldValue =>
                              updateIdentification(
                                index,
                                'issuer',
                                fieldValue,
                              )
                            }
                            disabled={locked(
                              `${prefix}.issuer` as PartyField,
                            )}
                          />
                        </div>

                        <div className="mt-3 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              removeIdentification(
                                index,
                              )
                            }
                            disabled={
                              subtreeLocked(
                                prefix,
                              )
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
