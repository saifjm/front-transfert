import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { AlertCircle, Copy, Check } from 'lucide-react';
import { Card } from './ui/card';

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errorMessage: string;
  errorDetails?: string;
}

export function ErrorDialog({
  open,
  onOpenChange,
  errorMessage,
  errorDetails,
}: ErrorDialogProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const fullError = errorDetails
      ? `${errorMessage}\n\nDétails techniques:\n${errorDetails}`
      : errorMessage;
    
    navigator.clipboard.writeText(fullError).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <DialogTitle className="text-xl">Erreur Technique</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            Une erreur technique est survenue lors de l'exécution de l'opération.
            <br />
            Veuillez contacter l'administrateur du système avec les informations
            ci-dessous.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Card className="p-4 bg-red-50 border-red-200">
            <div className="space-y-2">
              <div className="font-semibold text-sm text-red-900">
                Message d'erreur :
              </div>
              <div className="text-sm text-red-800 font-mono bg-white p-3 rounded border border-red-200 break-words">
                {errorMessage}
              </div>
            </div>
          </Card>

          {errorDetails && (
            <Card className="p-4 bg-gray-50 border-gray-200">
              <div className="space-y-2">
                <div className="font-semibold text-sm text-gray-900">
                  Détails techniques :
                </div>
                <div className="text-xs text-gray-700 font-mono bg-white p-3 rounded border border-gray-200 max-h-[200px] overflow-auto break-words">
                  {errorDetails}
                </div>
              </div>
            </Card>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="text-sm text-blue-900">
                <div className="font-semibold mb-1">
                  Que faire maintenant ?
                </div>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Copiez le message d'erreur avec le bouton ci-dessous</li>
                  <li>Contactez l'administrateur système</li>
                  <li>Transmettez-lui le message copié</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleCopy}
            className="w-full sm:w-auto"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copier l'erreur
              </>
            )}
          </Button>
          <Button
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto bg-[#435B7B] hover:bg-[#2D3E54]"
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
