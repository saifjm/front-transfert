import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { FileText, Download, FileCheck, Printer, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';

interface Annexe3FormData {
  nomAgence: string;
  codeAgence: string;
  nomPrenomResponsable: string;
  identifiant: string;
  adresse: string;
  qualite: string;
  matriculeFiscale: string;
}

export function AVAGenerationDiverses() {
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null);
  const [showAnnexe3Form, setShowAnnexe3Form] = useState(false);
  const [annexe3Data, setAnnexe3Data] = useState<Annexe3FormData>({
    nomAgence: '',
    codeAgence: '',
    nomPrenomResponsable: '',
    identifiant: '',
    adresse: '',
    qualite: '',
    matriculeFiscale: ''
  });

  // Liste des documents disponibles
  const documentsDisponibles = [
    {
      id: 'annexe3',
      titre: 'ANNEXE N°3 : Engagement',
      description: 'Engagement relatif à l\'allocation pour voyages d\'affaires',
      type: 'Formulaire officiel'
    },
    {
      id: 'attestation',
      titre: 'Attestation de voyage',
      description: 'Attestation de déplacement professionnel',
      type: 'Document administratif'
    },
    {
      id: 'justificatif',
      titre: 'Justificatif de frais',
      description: 'Récapitulatif des frais de voyage',
      type: 'Document comptable'
    }
  ];

  const genererAnnexe3 = () => {
    setGeneratingDoc('annexe3');

    try {
      // Créer un nouveau document PDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 25;
      const contentWidth = pageWidth - (margin * 2);
      let yPosition = 30;

      // Header - Titre principal
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const headerLine1 = 'ANNEXE N°3 A LA CIRCULAIRE AUX INTERMEDIAIRES AGREES';
      const headerLine2 = 'N°2016-08 DU 30 DECEMBRE 2016';
      doc.text(headerLine1, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
      doc.text(headerLine2, pageWidth / 2, yPosition, { align: 'center' });
      
      // Souligner le header
      const headerWidth1 = doc.getTextWidth(headerLine1);
      doc.line((pageWidth - headerWidth1) / 2, yPosition + 1, (pageWidth + headerWidth1) / 2, yPosition + 1);
      yPosition += 15;

      // Section 1 - Informations de l'intermédiaire
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.text('Intermédiaire Agrée : ', margin, yPosition);
      doc.setFont('times', 'bold');
      doc.text('UNION INTERNATIONALE DE BANQUES', margin + 45, yPosition);
      doc.setFont('times', 'normal');
      doc.text('Code : ', margin + 130, yPosition);
      doc.setFont('times', 'bold');
      doc.text('12', margin + 145, yPosition);
      yPosition += 8;

      doc.setFont('times', 'normal');
      doc.text('Agence : ', margin, yPosition);
      doc.setFont('times', 'bold');
      doc.text(annexe3Data.nomAgence || '', margin + 20, yPosition);
      doc.setFont('times', 'normal');
      doc.text('Code : ', margin + 130, yPosition);
      doc.setFont('times', 'bold');
      doc.text(annexe3Data.codeAgence || '', margin + 145, yPosition);
      yPosition += 15;

      // Titre de section centré
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.text('Engagement relatif à l\'allocation pour voyages d\'affaires', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 12;

      // Section 2 - Informations du soussigné
      doc.setFont('times', 'normal');
      doc.setFontSize(11);
      doc.text('Je soussigné (Nom et prénom) : ', margin, yPosition);
      doc.setFont('times', 'bold');
      doc.text(annexe3Data.nomPrenomResponsable || '', margin + 65, yPosition);
      yPosition += 8;

      doc.setFont('times', 'normal');
      doc.text('Code d\'identification', margin, yPosition);
      doc.setFontSize(8);
      doc.text('1', margin + 42, yPosition - 2);
      doc.setFontSize(11);
      doc.text(' : ', margin + 44, yPosition);
      doc.setFont('times', 'bold');
      doc.text(annexe3Data.identifiant || '', margin + 50, yPosition);
      yPosition += 8;

      doc.setFont('times', 'normal');
      doc.text('Adresse : ', margin, yPosition);
      doc.setFont('times', 'bold');
      doc.text(annexe3Data.adresse || '', margin + 22, yPosition);
      yPosition += 8;

      doc.setFont('times', 'normal');
      doc.text('Agissant en ma qualité de', margin, yPosition);
      doc.setFontSize(8);
      doc.text('2', margin + 56, yPosition - 2);
      doc.setFontSize(11);
      doc.text(' : ', margin + 58, yPosition);
      doc.setFont('times', 'bold');
      doc.text(annexe3Data.qualite || '', margin + 64, yPosition);
      yPosition += 8;

      doc.setFont('times', 'normal');
      doc.text('Code d\'identification fiscale : ', margin, yPosition);
      doc.setFont('times', 'bold');
      doc.text(annexe3Data.matriculeFiscale || '', margin + 62, yPosition);
      yPosition += 12;

      // Section 3 - Certification
      doc.setFont('times', 'bold');
      doc.text('Certifie, sous les peines de droits, que :', margin, yPosition);
      yPosition += 8;

      // Liste des engagements
      doc.setFont('times', 'normal');
      const bulletPoints = [
        '- Je ne suis pas titulaire d\'une autre allocation pour voyages d\'affaires.',
        '- Je ne suis pas titulaire d\'un compte « Personne Physique Résidente ».',
        '- Seuls les dirigeants, les employés et les membres du conseil d\'administration dont',
        '  les noms, prénoms, qualité et codes d\'identification figurent sur liste ci-jointe',
        '  peuvent bénéficier de transferts au titre de la présente allocation pour voyages',
        '  d\'affaires.',
        '- Toute modification de cette liste sera portée à votre connaissance.',
        '- Je rapatrierai les reliquats non utilisés et je les rétrocéderai en dinar dans les',
        '  délais prescrits par la réglementation des changes en vigueur.'
      ];

      bulletPoints.forEach((point) => {
        doc.text(point, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 10;

      // Section signature
      doc.text('Fait à : __________________, le __________________', pageWidth - margin - 90, yPosition);
      yPosition += 15;

      doc.setFont('times', 'bold');
      doc.text('Cachet et signature autorisée', pageWidth - margin - 60, yPosition);
      yPosition += 30;

      // Footer - Notes de bas de page
      doc.setFont('times', 'normal');
      doc.setFontSize(9);
      doc.text('1', margin, yPosition - 2);
      doc.setFontSize(9);
      doc.text(' CNI ou CS', margin + 2, yPosition);
      yPosition += 5;

      doc.text('2', margin, yPosition - 2);
      doc.text(' - S\'il s\'agit d\'un représentant d\'une personne morale, indiquer sa fonction.', margin + 2, yPosition);
      yPosition += 4;
      doc.text('  - S\'il s\'agit d\'une personne physique agissant pour son propre compte, indiquer', margin + 2, yPosition);
      yPosition += 4;
      doc.text('    son activité.', margin + 2, yPosition);

      // Générer et télécharger le PDF
      const fileName = `ANNEXE_N3_Engagement_${annexe3Data.nomPrenomResponsable.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      setTimeout(() => {
        setGeneratingDoc(null);
      }, 500);

    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
      setGeneratingDoc(null);
    }
  };

  const genererDocument = (docId: string) => {
    if (docId === 'annexe3') {
      // Ouvrir le formulaire de saisie
      setShowAnnexe3Form(true);
    } else {
      // Pour les autres documents, afficher un message temporaire
      setGeneratingDoc(docId);
      setTimeout(() => {
        alert(`Génération du document "${documentsDisponibles.find(d => d.id === docId)?.titre}" - À implémenter`);
        setGeneratingDoc(null);
      }, 500);
    }
  };

  const handleAnnexe3Submit = () => {
    // Valider les champs obligatoires
    if (!annexe3Data.nomAgence || !annexe3Data.codeAgence || !annexe3Data.nomPrenomResponsable || 
        !annexe3Data.identifiant || !annexe3Data.adresse || !annexe3Data.qualite || !annexe3Data.matriculeFiscale) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Fermer le formulaire
    setShowAnnexe3Form(false);
    
    // Générer le document avec les données
    genererAnnexe3();
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Génération diverses</h1>
          <p className="text-muted-foreground mt-2">
            Génération de documents officiels et formulaires pour les dossiers AVA
          </p>
        </div>
        <Badge variant="secondary" className="text-base px-4 py-2">
          <FileCheck className="w-4 h-4 mr-2" />
          {documentsDisponibles.length} documents disponibles
        </Badge>
      </div>

      {/* Card d'information — thème IBANSYS */}
      <Card style={{ borderLeft: '4px solid #435B7B', background: '#EEF3F7' }}>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <FileText className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#435B7B' }} />
            <div className="space-y-1">
              <p className="font-medium" style={{ color: '#2D3E54' }}>
                Documents officiels et formulaires
              </p>
              <p className="text-sm" style={{ color: '#435B7B' }}>
                Cette section permet de générer des documents officiels conformes aux circulaires de la BCT (Banque Centrale de Tunisie).
                Cliquez sur un document pour le générer et l'imprimer.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documents disponibles</CardTitle>
          <CardDescription>
            Sélectionnez un document à générer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {documentsDisponibles.map((doc) => (
              <Card
                key={doc.id}
                className="border-2 hover:border-primary/50 transition-all cursor-pointer group flex flex-col"
                onClick={() => genererDocument(doc.id)}
              >
                <CardContent className="p-6 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {doc.type}
                    </Badge>
                  </div>

                  <div className="space-y-2 flex-1">
                    <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">
                      {doc.titre}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.description}
                    </p>
                  </div>

                  <div className="mt-4">
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={generatingDoc === doc.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        genererDocument(doc.id);
                      }}
                    >
                      {generatingDoc === doc.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Génération...
                        </>
                      ) : (
                        <>
                          <Printer className="w-4 h-4 mr-2" />
                          Générer
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-xs">1</span>
              </div>
              <p className="text-muted-foreground">
                Sélectionnez le document que vous souhaitez générer en cliquant sur la carte correspondante
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-xs">2</span>
              </div>
              <p className="text-muted-foreground">
                Remplissez les informations requises dans le formulaire
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-xs">3</span>
              </div>
              <p className="text-muted-foreground">
                Le document PDF sera automatiquement téléchargé sur votre appareil
              </p>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary font-semibold text-xs">4</span>
              </div>
              <p className="text-muted-foreground">
                Vous pouvez ensuite imprimer le document ou le signer électroniquement
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Formulaire ANNEXE N°3 */}
      <Dialog open={showAnnexe3Form} onOpenChange={setShowAnnexe3Form}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              ANNEXE N°3 : Engagement
              <Badge variant="outline" className="ml-auto">Formulaire officiel</Badge>
            </DialogTitle>
            <DialogDescription>
              Veuillez remplir les informations suivantes pour générer l'engagement relatif à l'allocation pour voyages d'affaires.
              Tous les champs sont obligatoires.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomAgence" className="flex items-center gap-1">
                  Nom de l'agence <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nomAgence"
                  placeholder="Ex: Agence Centrale Tunis"
                  value={annexe3Data.nomAgence}
                  onChange={(e) => setAnnexe3Data({ ...annexe3Data, nomAgence: e.target.value })}
                  className={!annexe3Data.nomAgence ? 'border-orange-300' : ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="codeAgence" className="flex items-center gap-1">
                  Code de l'agence <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="codeAgence"
                  placeholder="Ex: 001"
                  value={annexe3Data.codeAgence}
                  onChange={(e) => setAnnexe3Data({ ...annexe3Data, codeAgence: e.target.value })}
                  className={!annexe3Data.codeAgence ? 'border-orange-300' : ''}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomPrenomResponsable" className="flex items-center gap-1">
                Nom et prénom du responsable <span className="text-red-500">*</span>
              </Label>
              <Input
                id="nomPrenomResponsable"
                placeholder="Ex: Ben Ali Mohamed"
                value={annexe3Data.nomPrenomResponsable}
                onChange={(e) => setAnnexe3Data({ ...annexe3Data, nomPrenomResponsable: e.target.value })}
                className={!annexe3Data.nomPrenomResponsable ? 'border-orange-300' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="identifiant" className="flex items-center gap-1">
                Code d'identification <span className="text-red-500">*</span>
                <span className="text-xs text-muted-foreground ml-1">(CNI ou CS)</span>
              </Label>
              <Input
                id="identifiant"
                placeholder="Ex: 12345678"
                value={annexe3Data.identifiant}
                onChange={(e) => setAnnexe3Data({ ...annexe3Data, identifiant: e.target.value })}
                className={!annexe3Data.identifiant ? 'border-orange-300' : ''}
              />
              <p className="text-xs text-muted-foreground">
                CNI = Carte Nationale d'Identité | CS = Carte de Séjour
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresse" className="flex items-center gap-1">
                Adresse <span className="text-red-500">*</span>
              </Label>
              <Input
                id="adresse"
                placeholder="Ex: Avenue Habib Bourguiba, Tunis"
                value={annexe3Data.adresse}
                onChange={(e) => setAnnexe3Data({ ...annexe3Data, adresse: e.target.value })}
                className={!annexe3Data.adresse ? 'border-orange-300' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qualite" className="flex items-center gap-1">
                Qualité <span className="text-red-500">*</span>
              </Label>
              <Input
                id="qualite"
                placeholder="Ex: Directeur Général"
                value={annexe3Data.qualite}
                onChange={(e) => setAnnexe3Data({ ...annexe3Data, qualite: e.target.value })}
                className={!annexe3Data.qualite ? 'border-orange-300' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Fonction du représentant (personne morale) ou activité (personne physique)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="matriculeFiscale" className="flex items-center gap-1">
                Code d'identification fiscale <span className="text-red-500">*</span>
              </Label>
              <Input
                id="matriculeFiscale"
                placeholder="Ex: 1234567/A/M/000"
                value={annexe3Data.matriculeFiscale}
                onChange={(e) => setAnnexe3Data({ ...annexe3Data, matriculeFiscale: e.target.value })}
                className={!annexe3Data.matriculeFiscale ? 'border-orange-300' : ''}
              />
              <p className="text-xs text-muted-foreground">
                Matricule fiscal de l'entreprise
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAnnexe3Form(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              onClick={handleAnnexe3Submit}
              className="bg-[#435B7B] hover:bg-[#2D3E54]"
            >
              <Printer className="w-4 h-4 mr-2" />
              Générer le document
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}