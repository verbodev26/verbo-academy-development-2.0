import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAuth, validatePasswordComplexity } from "@/lib/auth";
import { setAvatar, useAvatar } from "@/lib/avatar-store";
import {
  MAX_HEADLINE_CHARS,
  MAX_SPECIALIZATIONS,
  rankLabel,
  roleLabelFor,
  saveStaffProfile,
  staffStats,
  tenureLabel,
  usePresence,
  useStaffProfile,
} from "@/lib/staff-profile-store";
import { Check, KeyRound, Pencil, Plus, Star, Users, Clock, ShieldCheck, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const STAT_ICON = {
  rating: Star,
  students: Users,
  sessions: Clock,
  team: ShieldCheck,
} as const;

export function StaffProfileModal({ open, onOpenChange }: Props) {
  const { user, updateProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const avatar = useAvatar(user?.id);
  const online = usePresence(user?.id, true);
  const stored = useStaffProfile(user?.id);

  const [headline, setHeadline] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [savedTick, setSavedTick] = useState(false);

  const [pwOpen, setPwOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setHeadline(stored.headline);
    setTagDraft("");
    setPwOpen(false);
    setCurrent("");
    setNext("");
    setConfirm("");
    setPwError(null);
    setPwDone(false);
    setSavedTick(false);
  }, [open, stored.headline]);

  const stats = useMemo(() => (user ? staffStats(user) : []), [user]);
  if (!user) return null;

  const initial = user.name?.[0] ?? "?";

  const onPickAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAvatar(user.id, String(reader.result));
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const commitHeadline = () => {
    saveStaffProfile(user.id, { headline });
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1400);
  };

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    saveStaffProfile(user.id, { specializations: [...stored.specializations, t] });
    setTagDraft("");
  };

  const removeTag = (tag: string) => {
    saveStaffProfile(user.id, {
      specializations: stored.specializations.filter((s) => s !== tag),
    });
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwDone(false);
    if (!current) return setPwError("Enter your current password.");
    if (next !== confirm) return setPwError("New passwords do not match.");
    const complexity = validatePasswordComplexity(next);
    if (complexity) return setPwError(complexity);
    const res = updateProfile({ currentPassword: current, newPassword: next });
    if (!res.ok) return setPwError(res.error);
    setPwDone(true);
    setCurrent("");
    setNext("");
    setConfirm("");
    setTimeout(() => setPwOpen(false), 900);
  };

  const chips = [roleLabelFor(user), rankLabel(user), tenureLabel(user)];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden rounded-[28px] border-0 p-0 shadow-elevated">
        <DialogTitle className="sr-only">My profile</DialogTitle>

        {/* Hero banner */}
        <div
          className="relative h-36 w-full"
          style={{
            background:
              "linear-gradient(120deg, #01304a 0%, #0a4a6e 42%, #7e22ce 78%, #f38934 100%)",
          }}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, rgba(255,255,255,0.14) 0 2px, transparent 2px 18px), radial-gradient(circle at 18% 120%, rgba(255,199,0,0.55), transparent 55%), radial-gradient(circle at 82% -20%, rgba(126,224,45,0.45), transparent 55%)",
            }}
          />
        </div>

        <div className="px-8 pb-8">
          {/* Avatar breaking the banner line */}
          <div className="-mt-14 flex justify-center">
            <div className="relative">
              <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-background shadow-elevated">
                {avatar ? (
                  <img src={avatar} alt={user.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#01304a] to-[#0a4a6e] text-4xl font-semibold text-white">
                    {initial}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="Change profile photo"
                className="absolute -right-1 bottom-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#f38934] text-white shadow-md transition-transform hover:scale-105"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <span
                title={online ? "Online" : "Offline"}
                className={`absolute left-1 top-2 h-4 w-4 rounded-full border-2 border-background ${
                  online ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
            </div>
          </div>

          {/* Identity */}
          <div className="mt-5 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{user.name}</h2>
            <p className="mt-1 text-sm font-light text-muted-foreground">{rankLabel(user)}</p>
          </div>

          {/* Chips */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {chips.map((c) => (
              <span
                key={c}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-foreground"
              >
                {c}
              </span>
            ))}
          </div>

          {/* Stats */}
          <div className="mt-8 grid grid-cols-3">
            {stats.map((s, i) => {
              const Icon = STAT_ICON[s.key];
              return (
                <div
                  key={s.key}
                  className={`flex flex-col items-center gap-1 px-2 ${i > 0 ? "border-l border-border" : ""}`}
                >
                  <Icon className="h-5 w-5 text-[#f38934]" />
                  <div className="text-xl font-bold text-foreground">{s.value}</div>
                  <div className="text-center text-xs text-muted-foreground">{s.label}</div>
                </div>
              );
            })}
          </div>

          {/* Specializations */}
          <div className="mt-8">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Specializes in
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {stored.specializations.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#01304a]/[0.06] px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {tag}
                  <button
                    type="button"
                    aria-label={`Remove ${tag}`}
                    onClick={() => removeTag(tag)}
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {stored.specializations.length < MAX_SPECIALIZATIONS && (
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-1">
                  <input
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addTag(); }
                    }}
                    placeholder="Add a focus area"
                    maxLength={40}
                    className="w-32 bg-transparent px-1 text-xs text-foreground outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    aria-label="Add specialization"
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* Headline */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                About me
              </span>
              <span className="text-[11px] text-muted-foreground">
                {headline.length}/{MAX_HEADLINE_CHARS}
              </span>
            </div>
            <textarea
              value={headline}
              maxLength={MAX_HEADLINE_CHARS}
              onChange={(e) => setHeadline(e.target.value)}
              onBlur={commitHeadline}
              rows={3}
              placeholder="Write a short phrase your students will see…"
              className="mt-2 w-full resize-none rounded-2xl bg-secondary/60 px-4 py-3 text-sm leading-relaxed text-foreground outline-none transition-shadow focus:ring-2 focus:ring-ring"
            />
            {savedTick && (
              <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <Check className="h-3.5 w-3.5" /> Saved
              </div>
            )}
          </div>

          {/* Password */}
          <div className="mt-8 space-y-3">
            {!pwOpen ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setPwOpen(true)}
                  className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-[#01304a] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0a4a6e]"
                >
                  <KeyRound className="h-4 w-4" /> Change password
                </button>
                <button
                  type="button"
                  className="flex-1 cursor-pointer rounded-full bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70"
                >
                  Forgot password
                </button>
              </div>
            ) : (
              <form className="space-y-3" onSubmit={submitPassword}>
                <input
                  type="password"
                  placeholder="Current password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  className="w-full rounded-2xl bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  className="w-full rounded-2xl bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full rounded-2xl bg-secondary/60 px-4 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-[11px] text-muted-foreground">
                  Use at least 4 characters, one uppercase letter and one number.
                </p>
                {pwError && <div className="text-xs font-medium text-destructive">{pwError}</div>}
                {pwDone && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                    <Check className="h-3.5 w-3.5" /> Password updated
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 cursor-pointer rounded-full bg-[#f38934] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#e07a25]"
                  >
                    Update password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPwOpen(false); setPwError(null); }}
                    className="cursor-pointer rounded-full bg-secondary px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
