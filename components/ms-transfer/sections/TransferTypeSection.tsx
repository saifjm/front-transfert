import React from 'react';
import { Banknote, CheckCircle2, FileText } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../ui/card';

import type { TransferType } from '../transfer.types';

export function TransferTypeSection({
  selected,
  onSelect,
}: {
  selected: TransferType | null;
  onSelect: (type: TransferType) => void;
}) {
  const cards = [
    {
      type: 'commercial' as const,
      icon: FileText,
      title: 'Transfert commercial',
      badge: 'TCE / FI',
      description:
        'Transfert lié à une opération commerciale. Le support dépend du statut exportateur du client.',
      points: [
        'TCE obligatoire hors totalement exportateur',
        'TCE ou FI pour un client totalement exportateur',
        'Contrôle préalable du titre de commerce extérieur',
        'Réservation du montant lors de la validation',
      ],
    },
    {
      type: 'financier' as const,
      icon: Banknote,
      title: 'Transfert financier',
      badge: 'FI / BCT',
      description:
        'Transfert non commercial traité selon la nature de l’opération et les éventuelles autorisations BCT.',
      points: [
        'Fiche d’information comme support règlementaire',
        'Code nature opération obligatoire',
        'Autorisation BCT F1 ou F2 le cas échéant',
        'Sélection parmi les autorisations actives du client',
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Choix du type de transfert
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Le transfert est initié en agence. Le cas reçu d’une autre
          banque de la place sera intégré dans une évolution ultérieure.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {cards.map(card => {
          const selectedCard = selected === card.type;
          const Icon = card.icon;

          return (
            <Card
              key={card.type}
              className={
                selectedCard
                  ? 'border-primary ring-1 ring-primary'
                  : undefined
              }
            >
              <CardHeader>
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge variant="secondary">{card.badge}</Badge>
                </div>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                <ul className="space-y-2">
                  {card.points.map(point => (
                    <li
                      key={point}
                      className="flex items-start gap-2 text-sm text-muted-foreground"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  type="button"
                  className="w-full"
                  variant={selectedCard ? 'secondary' : 'default'}
                  onClick={() => onSelect(card.type)}
                >
                  {selectedCard
                    ? 'Type sélectionné'
                    : `Choisir ${card.title.toLowerCase()}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
