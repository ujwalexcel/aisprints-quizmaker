"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Mcq } from "@/lib/services/mcq-service";

type McqPreviewDialogProps = {
  mcq: Mcq | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function McqPreviewDialog({
  mcq,
  open,
  onOpenChange,
}: McqPreviewDialogProps) {
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>("");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setSelectedChoiceId("");
      setResultMessage(null);
      setError(null);
    }

    onOpenChange(nextOpen);
  }

  async function handleSubmit() {
    if (!mcq || !selectedChoiceId) {
      setError("Select a choice before submitting.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/mcqs/${mcq.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choiceId: selectedChoiceId }),
      });

      const data = (await response.json()) as {
        error?: string;
        attempt?: { isCorrect: boolean };
      };

      if (!response.ok) {
        setError(data.error ?? "Unable to submit attempt");
        return;
      }

      setResultMessage(
        data.attempt?.isCorrect ? "Correct!" : "Incorrect. Try again.",
      );
    } catch {
      setError("Unable to submit attempt");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mcq?.name}</DialogTitle>
          <DialogDescription>Preview this MCQ and submit an answer.</DialogDescription>
        </DialogHeader>
        {mcq ? (
          <div className="space-y-4">
            <p className="text-sm">{mcq.question}</p>
            <RadioGroup
              value={selectedChoiceId}
              onValueChange={setSelectedChoiceId}
              className="gap-3"
            >
              {mcq.choices.map((choice) => (
                <div key={choice.id} className="flex items-center gap-2">
                  <RadioGroupItem
                    value={choice.id}
                    id={`preview-choice-${choice.id}`}
                  />
                  <Label htmlFor={`preview-choice-${choice.id}`}>
                    {choice.choiceText}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {resultMessage ? (
              <p className="text-sm font-medium">{resultMessage}</p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !mcq}
          >
            {isSubmitting ? "Submitting..." : "Submit answer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
