"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { User, UserRole } from "@/lib/auth/types";
import { updateUserRole, deleteUser } from "@/lib/admin/actions";

const ROLES: UserRole[] = ["admin", "mentor", "student", "alumni"];

interface Props {
  user: User;
  currentUserId: string | null;
}

export function UserDetailClient({ user, currentUserId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isSelf = currentUserId === user.id;

  const handleRoleChange = (role: UserRole) => {
    startTransition(async () => {
      const result = await updateUserRole(user.id, role);
      if (result.success) {
        toast.success(`Role updated to ${role}`);
      } else {
        toast.error(result.error ?? "Failed to update role");
      }
    });
  };

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteUser(user.id);
    setDeleting(false);
    setDeleteOpen(false);

    if (result.success) {
      toast.success("User deleted");
      router.push("/users");
    } else {
      toast.error(result.error ?? "Failed to delete user");
    }
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="sm"
        className="mb-4 gap-1"
        onClick={() => router.push("/users")}
      >
        <ArrowLeft className="size-4" />
        Back to users
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{user.name || user.email}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* User info */}
          <div className="grid gap-3 text-sm">
            <Row label="Email" value={user.email} />
            <Row label="Name" value={user.name || "-"} />
            <Row
              label="Email Verified"
              value={user.emailVerified ? "Yes" : "No"}
            />
            <Row
              label="Joined"
              value={new Date(user.createdAt).toLocaleDateString()}
            />
          </div>

          {/* Role management */}
          <div>
            <p className="mb-2 text-sm font-medium">Role</p>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <Button
                  key={role}
                  variant={user.role === role ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleRoleChange(role)}
                  disabled={user.role === role || isPending}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Delete */}
          {!isSelf && (
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1">
                  <Trash2 className="size-4" />
                  Delete User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete user?</DialogTitle>
                  <DialogDescription>
                    This will permanently delete {user.name || user.email} and
                    all their sessions. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDeleteOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-muted-foreground w-32 shrink-0">{label}</span>
      <span>{value}</span>
    </div>
  );
}
