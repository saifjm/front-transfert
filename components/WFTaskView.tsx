import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { CheckCircle2, RotateCcw, Send, RefreshCw, ClipboardList, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getWfTaskList, continueDecision, type WfTask, type DecisionInfo } from '../utils/workflowApi';

const NODE_LABELS: Record<string, string> = {
  SAISIE_AGENCE:       "Saisie à l'agence",
  COMPLEMENT_AGENCE:   'Complémentaire agence',
  SERVICE_CENTRAL:     'Service Central',
};

const DECISION_STYLE: Record<string, { variant: 'default' | 'outline' | 'destructive'; icon: React.ReactNode }> = {
  APPROVE:           { variant: 'default',      icon: <CheckCircle2 className="w-4 h-4 mr-1" /> },
  APPROUVER:         { variant: 'default',      icon: <CheckCircle2 className="w-4 h-4 mr-1" /> },
  VALIDER:           { variant: 'default',      icon: <CheckCircle2 className="w-4 h-4 mr-1" /> },
  SUBMIT:            { variant: 'default',      icon: <Send className="w-4 h-4 mr-1" /> },
  REJECT:            { variant: 'destructive',  icon: <AlertTriangle className="w-4 h-4 mr-1" /> },
  REJETER:           { variant: 'destructive',  icon: <AlertTriangle className="w-4 h-4 mr-1" /> },
  RETOUR_AGENCE:     { variant: 'outline',      icon: <RotateCcw className="w-4 h-4 mr-1" /> },
};

export function WFTaskView() {
  const [tasks, setTasks] = useState<WfTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Comment dialog state
  const [commentDialog, setCommentDialog] = useState<{
    open: boolean;
    task: WfTask | null;
    decision: DecisionInfo | null;
    comment: string;
    submitting: boolean;
  }>({ open: false, task: null, decision: null, comment: '', submitting: false });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWfTaskList();
      setTasks(data);
    } catch {
      showError('Vérifiez que le moteur de workflow est démarré.', undefined, 'Impossible de charger les tâches');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const executeDecision = async (task: WfTask, decision: DecisionInfo, comment?: string) => {
    if (!task.businessKey) {
      showError('Clé métier manquante pour cette tâche.');
      return;
    }
    try {
      const response = await continueDecision(task.businessKey, decision.tag, {}, comment);
      if (response.result === 'OK') {
        toast.success(`Décision "${decision.label}" appliquée`, {
          description: `Référence: ${task.businessKey}`,
        });
        await loadTasks();
        setExpandedTaskId(null);
      } else if (response.result === 'REJECTED') {
        showError(response.errorMessage, undefined, 'Opération rejetée');
      } else if (response.result === 'WARN_REQUIRED') {
        toast.warning('Justification SoD requise — contactez votre administrateur.');
      } else {
        showError(response.errorMessage ?? String(response.result), undefined, 'Erreur workflow');
      }
    } catch {
      showError('Erreur de communication avec le moteur de workflow.');
    }
  };

  const handleDecisionClick = (task: WfTask, decision: DecisionInfo) => {
    if (decision.requiresComment) {
      setCommentDialog({ open: true, task, decision, comment: '', submitting: false });
    } else {
      void executeDecision(task, decision);
    }
  };

  const submitWithComment = async () => {
    const { task, decision, comment } = commentDialog;
    if (!task || !decision) return;
    if (!comment.trim()) {
      toast.warning('Un commentaire est requis pour cette décision.');
      return;
    }
    setCommentDialog(prev => ({ ...prev, submitting: true }));
    await executeDecision(task, decision, comment.trim());
    setCommentDialog({ open: false, task: null, decision: null, comment: '', submitting: false });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ClipboardList className="w-8 h-8" />
            Tâches en attente
          </h1>
          <p className="text-muted-foreground mt-1">
            Tâches workflow — Dossiers AVA à traiter
          </p>
        </div>
        <Button variant="outline" onClick={loadTasks} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Task list */}
      {loading && tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Chargement des tâches...
          </CardContent>
        </Card>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            Aucune tâche en attente
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const isExpanded = expandedTaskId === task.taskId;
            return (
              <Card
                key={task.taskId}
                className={`cursor-pointer transition-all ${isExpanded ? 'ring-2 ring-primary/40' : 'hover:shadow-md'}`}
                onClick={() => setExpandedTaskId(isExpanded ? null : task.taskId)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary">
                        {NODE_LABELS[task.currentNodeKey] ?? task.currentNodeKey}
                      </Badge>
                      {task.businessKey && (
                        <span className="text-sm font-mono text-muted-foreground">
                          Réf. {task.businessKey}
                        </span>
                      )}
                    </div>
                    {task.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(task.createdAt).toLocaleString('fr-FR')}
                      </span>
                    )}
                  </div>
                  <CardTitle className="text-base">{task.nodeLabel}</CardTitle>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0 border-t mt-2">
                    {task.assignee && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Assignée à : <span className="font-medium">{task.assignee}</span>
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {task.decisions.map((decision) => {
                        const style = DECISION_STYLE[decision.tag] ?? { variant: 'outline' as const, icon: <Send className="w-4 h-4 mr-1" /> };
                        return (
                          <Button
                            key={decision.tag}
                            variant={style.variant}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDecisionClick(task, decision);
                            }}
                          >
                            {style.icon}
                            {decision.label}
                          </Button>
                        );
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Comment dialog for decisions that require a comment */}
      <Dialog
        open={commentDialog.open}
        onOpenChange={(open) => !open && setCommentDialog(prev => ({ ...prev, open: false }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{commentDialog.decision?.label}</DialogTitle>
            <DialogDescription>
              Cette décision nécessite un commentaire obligatoire.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Label htmlFor="wf-comment">Commentaire *</Label>
            <Textarea
              id="wf-comment"
              placeholder="Saisissez votre commentaire..."
              value={commentDialog.comment}
              onChange={(e) => setCommentDialog(prev => ({ ...prev, comment: e.target.value }))}
              rows={4}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setCommentDialog({ open: false, task: null, decision: null, comment: '', submitting: false })}
                disabled={commentDialog.submitting}
              >
                Annuler
              </Button>
              <Button onClick={submitWithComment} disabled={commentDialog.submitting}>
                <Send className="w-4 h-4 mr-2" />
                Confirmer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
