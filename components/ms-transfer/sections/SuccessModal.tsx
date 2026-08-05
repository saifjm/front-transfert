import React from 'react';
import { CheckCircle2, Eye, Plus } from 'lucide-react';

import { Button } from '../../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';

import type { TransferType } from '../transfer.types';
import { StatusBadge, TypeBadge } from '../transfer.ui';

export function SuccessModal({
  open,
  transferType,
  onClose,
  onNew,
}: {
  open: boolean;
  transferType: TransferType | null;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <DialogTitle>Transfert créé avec succès</DialogTitle>
          <DialogDescription>
            Le dossier a été enregistré et transmis au circuit de
            validation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-lg border bg-muted/40 p-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              Référence opération
            </span>
            <span className="font-mono text-sm font-semibold">
              TR-2026-000001
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              Type transfert
            </span>
            <TypeBadge type={transferType || 'commercial'} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Statut</span>
            <StatusBadge status="en_cours_agence" />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">
              Prochaine étape
            </span>
            <span className="text-sm font-medium">
              Services centraux
            </span>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose}>
            <Eye className="mr-2 h-4 w-4" />
            Consulter dossier
          </Button>
          <Button type="button" onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau transfert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
