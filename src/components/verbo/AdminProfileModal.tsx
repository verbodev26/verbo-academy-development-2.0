import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import { setAvatar, useAvatar } from "@/lib/avatar-store";
import { Camera, Check } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AdminProfileModal({ open, onOpenChange }: Props) {
  const { user, updateProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const avatar = useAvatar(user?.id);

  const [name, setName] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open && user) {
      setName(user.name);
      setCurrent("");
      setNext("");
      setConfirm("");
      setError(null);
      setSaved(false);
    }
  }, [open, user]);

  if (!user) return null;
  const initial = user.name?.[0] ?? "?";

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(user.id, String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const wantsPassword = !!(current || next || confirm);
    if (wantsPassword) {
      if (!current || !next) return setError("Fill in your current and new password.");
      if (next !== confirm) return setError("New passwords do not match.");
    }
    if (!name.trim()) return setError("Name cannot be empty.");

    const res = updateProfile({
      name,
      ...(wantsPassword ? { currentPassword: current, newPassword: next } : {}),
    });
    if (!res.ok) return setError(res.error);

    setSaved(true);
    setCurrent("");
    setNext("");
    setConfirm("");
    setTimeout(() => onOpenChange(false), 700);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle className="text-base font-semibold text-foreground">Admin Profile</DialogTitle>

        <div className="mt-2 flex flex-col items-center">
          <div
            className="group relative h-24 w-24 cursor-pointer overflow-hidden rounded-full shadow-md"
            onClick={() => fileRef.current?.click()}
          >
            {avatar ? (
              <img src={avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#01304a] to-[#0a4a6e] text-3xl font-semibold text-white">
                {initial}
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="mb-1 h-4 w-4" />
              Change Photo
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPick} />
          <div className="mt-2 text-xs capitalize text-muted-foreground">{user.role}</div>
        </div>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Display Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Change Password
            </div>
            <input
              type="password"
              placeholder="Current Password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              placeholder="New Password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="password"
              placeholder="Confirm New Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {error && <div className="text-xs font-medium text-red-500">{error}</div>}
          {saved && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <Check className="h-3.5 w-3.5" /> Profile updated
            </div>
          )}

          <button
            type="submit"
            className="w-full cursor-pointer rounded-lg bg-[#f38934] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#e07a25]"
          >
            Update Profile
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
