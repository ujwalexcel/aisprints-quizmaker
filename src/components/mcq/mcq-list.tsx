"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";

import { LogoutButton } from "@/components/auth/logout-button";
import { DeleteMcqDialog } from "@/components/mcq/delete-mcq-dialog";
import { McqPreviewDialog } from "@/components/mcq/mcq-preview-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Mcq, McqSummary } from "@/lib/services/mcq-service";

type McqListProps = {
  mcqs: McqSummary[];
  displayName: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function truncateText(value: string, maxLength = 80) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function McqList({ mcqs, displayName }: McqListProps) {
  const router = useRouter();
  const [previewMcq, setPreviewMcq] = useState<Mcq | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<McqSummary | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  async function openPreview(mcqId: string) {
    setActionError(null);
    setIsLoadingPreview(true);

    try {
      const response = await fetch(`/api/mcqs/${mcqId}`);
      const data = (await response.json()) as { mcq?: Mcq; error?: string };

      if (!response.ok || !data.mcq) {
        setActionError(data.error ?? "Unable to load MCQ preview");
        return;
      }

      setPreviewMcq(data.mcq);
      setPreviewOpen(true);
    } catch {
      setActionError("Unable to load MCQ preview");
    } finally {
      setIsLoadingPreview(false);
    }
  }

  return (
    <div className="flex min-h-svh w-full justify-center p-6 md:p-10">
      <Card className="w-full max-w-6xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle>MCQ Test Bank</CardTitle>
            <CardDescription>Signed in as {displayName}.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/mcqs/new">
              <Button>
                <Plus />
                Create MCQ
              </Button>
            </Link>
            <LogoutButton />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionError ? (
            <p className="text-sm text-destructive">{actionError}</p>
          ) : null}
          {mcqs.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="mb-4 text-sm text-muted-foreground">
                No MCQs yet. Create your first question to get started.
              </p>
              <Link href="/mcqs/new">
                <Button>
                  <Plus />
                  Create MCQ
                </Button>
              </Link>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mcqs.map((mcq) => (
                  <TableRow key={mcq.id}>
                    <TableCell className="font-medium">{mcq.name}</TableCell>
                    <TableCell className="max-w-md">
                      <span className="line-clamp-2">
                        {truncateText(mcq.question)}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(mcq.createdAt)}</TableCell>
                    <TableCell>{formatDate(mcq.updatedAt)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${mcq.name}`}
                            >
                              <MoreVertical />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/mcqs/${mcq.id}/edit`)}
                          >
                            <Pencil />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openPreview(mcq.id)}
                            disabled={isLoadingPreview}
                          >
                            <Eye />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setDeleteTarget(mcq);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <McqPreviewDialog
        mcq={previewMcq}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
      <DeleteMcqDialog
        mcq={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}
