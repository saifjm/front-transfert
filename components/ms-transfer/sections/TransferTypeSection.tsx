import React from 'react';
import { Banknote, Check, FileText } from 'lucide-react';
import type { TransferType } from '../transfer.types';
import { HDR } from '../transfer.ui';

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
      color: '#1D4ED8',
      bg: '#EFF6FF',
      icon: FileText,
      title: 'Transfert commercial',
      badge: 'TCE / FI',
      desc: "Transfert lié à une opération commerciale. Le support dépend du statut totalement exportateur du client.",
      points: [
        'TCE obligatoire hors totalement exportateur',
        'TCE ou FI pour un client totalement exportateur',
        'Contrôle préalable du titre de commerce extérieur',
        'Réservation du montant lors de la validation',
      ],
      cta: 'Choisir transfert commercial',
      grad: HDR,
    },
    {
      type: 'financier' as const,
      color: '#7C3AED',
      bg: '#F5F3FF',
      icon: Banknote,
      title: 'Transfert financier',
      badge: 'FI / BCT',
      desc: "Transfert non commercial traité selon la nature de l'opération et les éventuelles autorisations BCT.",
      points: [
        "Fiche d'information comme support règlementaire",
        'Code nature opération obligatoire',
        'Autorisation BCT F1 ou F2 le cas échéant',
        'Sélection parmi les autorisations actives du client',
      ],
      cta: 'Choisir transfert financier',
      grad: { background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' },
    },
  ];

  return (
    <div className="space-y-6 anim-fade-in-up">
      <div className="text-center">
        <h2 className="text-xl font-bold text-[#2D3E54] mb-2">Choix du type de transfert</h2>
        <p className="text-sm text-[#7A90A4]">
          Le transfert est initié en agence. Le cas « reçu d’une autre banque de la place » est réservé à une évolution ultérieure.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {cards.map(card => {
          const active = selected === card.type;
          const Icon = card.icon;
          return (
            <button
              key={card.type}
              type="button"
              onClick={() => onSelect(card.type)}
              className="group text-left bg-white border-2 rounded-2xl p-7 shadow-sm hover:shadow-xl transition-all duration-300 card-lift"
              style={{ borderColor: active ? card.color : '#d1dce6' }}
              onMouseEnter={event => { event.currentTarget.style.borderColor = card.color; }}
              onMouseLeave={event => { event.currentTarget.style.borderColor = active ? card.color : '#d1dce6'; }}
            >
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={card.grad}>
                <Icon size={26} className="text-white" />
              </div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-[#2D3E54]">{card.title}</h3>
                <span className="px-2 py-0.5 rounded text-xs font-bold" style={{ background: card.bg, color: card.color }}>
                  {card.badge}
                </span>
              </div>
              <p className="text-sm text-[#7A90A4] mb-5 leading-relaxed">{card.desc}</p>
              <ul className="space-y-2 mb-6">
                {card.points.map(point => (
                  <li key={point} className="flex items-center gap-2 text-xs text-[#6B7A8D]">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: card.bg }}>
                      <Check size={10} style={{ color: card.color }} />
                    </div>
                    {point}
                  </li>
                ))}
              </ul>
              <div className="w-full py-3 rounded-xl text-sm font-semibold text-white text-center" style={card.grad}>
                {active ? 'Type sélectionné' : card.cta}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
