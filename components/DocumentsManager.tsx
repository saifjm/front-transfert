import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Upload, PlusCircle, Trash2, CheckCircle2 } from 'lucide-react';
import { buildDocumentPath, getCurrentDocumentPathParts } from '../utils';

interface DocumentItem {
  id: string;
  typeDocument?: number;
  nomImage?: string;
  pathAnnee?: string;
  pathMois?: string;
  cheminFichier?: string;
  fichier?: File | null;
}

interface DocumentsManagerProps {
  documents: DocumentItem[];
  onAddDocument: () => void;
  onRemoveDocument: (id: string) => void;
  onUpdateDocument: (id: string, field: string, value: any) => void;
  onFileChange: (id: string, file: File | null) => void;
  typesDocuments?: Array<{ code: number; libelle: string }>;
  title?: string;
  description?: string;
}

const DEFAULT_TYPES_DOCUMENTS = [
  { code: 1, libelle: 'Passeport' },
  { code: 2, libelle: 'Billet d\'avion' },
  { code: 3, libelle: 'Facture hébergement' },
  { code: 4, libelle: 'Justificatif de frais' },
  { code: 5, libelle: 'Autorisation BCT' },
  { code: 6, libelle: 'Contrat' },
  { code: 7, libelle: 'Facture commerciale' },
  { code: 8, libelle: 'Document douanier' },
  { code: 9, libelle: 'Justificatif bancaire' },
  { code: 10, libelle: 'Autre document' }
];

export function DocumentsManager({
  documents,
  onAddDocument,
  onRemoveDocument,
  onUpdateDocument,
  onFileChange,
  typesDocuments = DEFAULT_TYPES_DOCUMENTS,
  title = 'Documents Joints',
  description = 'Pièces justificatives pour le dossier (optionnel)'
}: DocumentsManagerProps) {
  const documentsBasePath = String(import.meta.env.VITE_DOCUMENTS_BASE_PATH || '').trim();

  const recomputeDocumentPath = (document: DocumentItem, overrides?: Partial<DocumentItem>) => {
    const next = { ...document, ...overrides };
    if (!next.nomImage) return next;
    const built = buildDocumentPath({
      fileName: next.nomImage,
      basePath: documentsBasePath,
      pathAnnee: next.pathAnnee,
      pathMois: next.pathMois,
    });
    next.pathAnnee = built.pathAnnee;
    next.pathMois = built.pathMois;
    next.cheminFichier = built.fullPath;
    return next;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button onClick={onAddDocument} size="sm">
          <PlusCircle className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {documents.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun document ajouté</p>
            <Button onClick={onAddDocument} variant="outline" className="mt-4" size="sm">
              <PlusCircle className="w-4 h-4 mr-2" />
              Ajouter le premier document
            </Button>
          </div>
        ) : (
          documents.map((document, index) => (
            <div key={document.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Badge variant="outline">Document {index + 1}</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveDocument(document.id)}
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label>Type de Document</Label>
                  <Select
                    value={document.typeDocument?.toString() || ''}
                    onValueChange={(value) => onUpdateDocument(document.id, 'typeDocument', Number(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {typesDocuments.map(type => (
                        <SelectItem key={type.code} value={type.code.toString()}>
                          {type.code} - {type.libelle}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4 col-span-2">
                  <div className="space-y-2">
                    <Label>Path Année</Label>
                    <Input
                      readOnly
                      value={document.pathAnnee || ''}
                      placeholder="YYYY"
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Path Mois</Label>
                    <Input
                      readOnly
                      value={document.pathMois || ''}
                      placeholder="MM"
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Chemin document</Label>
                  <Input
                    readOnly
                    value={document.cheminFichier || ''}
                    placeholder="/YYYY/MM/nom-du-fichier.ext"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Fichier</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        if (!file) {
                          onFileChange(document.id, null);
                          return;
                        }
                        const fallback = getCurrentDocumentPathParts();
                        const normalized = recomputeDocumentPath(document, {
                          nomImage: file.name,
                          pathAnnee: document.pathAnnee || fallback.pathAnnee,
                          pathMois: document.pathMois || fallback.pathMois,
                        });
                        onUpdateDocument(document.id, 'nomImage', normalized.nomImage);
                        onUpdateDocument(document.id, 'pathAnnee', normalized.pathAnnee);
                        onUpdateDocument(document.id, 'pathMois', normalized.pathMois);
                        onUpdateDocument(document.id, 'cheminFichier', normalized.cheminFichier);
                        onFileChange(document.id, file);
                      }}
                      className="flex-1"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    {document.nomImage && (
                      <Badge variant="secondary" className="self-center">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {document.nomImage}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formats acceptés : PDF, JPG, PNG (Max 5 Mo)
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
