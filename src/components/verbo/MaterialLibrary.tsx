import { useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Card, GhostButton, Pill, PrimaryButton, SectionTitle } from "@/components/verbo/ui";
import { hasUploadedFile, useCategories, type StoredMaterial } from "@/lib/materials-store";
import type { MaterialType } from "@/lib/mock-data";
import { PremiumBadge } from "@/components/verbo/PremiumGate";
import { useAuth } from "@/lib/auth";
import { groupsByStudentId } from "@/lib/groups-store";
import spotlightArt from "@/assets/spotlight1.png.asset.json";

import {
  Book,
  FileText,
  ListChecks,
  Video,
  Image as ImageIcon,
  Download,
  Eye,
  ChevronRight,
  ArrowLeft,
  X,
  Search,
  Sparkles,
  Lock,
} from "lucide-react";

const TYPE_ICON: Record<MaterialType, typeof Book> = {
  book: Book,
  pdf: FileText,
  "verb-list": ListChecks,
  video: Video,
  image: ImageIcon,
};

const TYPE_TINT: Record<MaterialType, string> = {
  book: "bg-amber-500/15 text-amber-400",
  pdf: "bg-rose-500/15 text-rose-400",
  "verb-list": "bg-emerald-500/15 text-emerald-400",
  video: "bg-sky-500/15 text-sky-400",
  image: "bg-violet-500/15 text-violet-400",
};

/**
 * Cover placeholders for category cards — reuses the existing project palette
 * (PRODUCT_GRADIENTS + CATEGORY_RING_COLORS from student.courses.tsx). Purely
 * visual until real per-category cover images land.
 */
const CATEGORY_COVERS = [
  "from-[#01304a] via-[#024366] to-[#0a5e88]",
  "from-[#7c2d12] via-[#c2410c] to-[#f97316]",
  "from-[#134e4a] via-[#0f766e] to-[#14b8a6]",
  "from-[#4a044e] via-[#7e22ce] to-[#a855f7]",
  "from-[#cb6ce6] via-[#a855f7] to-[#7e22ce]",
  "from-[#69d11d] via-[#14b8a6] to-[#0f766e]",
  "from-[#92dfd4] via-[#14b8a6] to-[#024366]",
];

const PREMIUM_KEY = "__premium__";
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ#".split("");

function letterOf(title: string): string {
  const c = (title.trim()[0] ?? "#").toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

function CoverArt({ m, className = "" }: { m: StoredMaterial; className?: string }) {
  const Icon = TYPE_ICON[m.material_type];
  if (m.cover_image) {
    return <img src={m.cover_image} alt={m.title} className={`h-full w-full object-cover ${className}`} />;
  }
  return (
    <div className={`flex h-full w-full items-center justify-center ${TYPE_TINT[m.material_type]} ${className}`}>
      <Icon className="h-10 w-10" />
    </div>
  );
}

function PreviewModal({ m, onClose }: { m: StoredMaterial; onClose: () => void }) {
  const isPdf = m.material_type === "pdf";
  const isVideo = m.material_type === "video";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <Pill tone="muted">{m.material_type}</Pill>
            <h3 className="text-sm font-semibold text-foreground">{m.title}</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-secondary/30 p-5">
          {isPdf ? (
            <iframe title={m.title} src={m.upload_url} className="h-[60vh] w-full rounded-lg border border-border bg-background" />
          ) : isVideo ? (
            <video src={m.upload_url} controls className="h-[60vh] w-full rounded-lg bg-black">
              Your browser does not support embedded video.
            </video>
          ) : (
            <div className="mx-auto flex max-w-sm flex-col items-center">
              <div className="aspect-[3/4] w-full overflow-hidden rounded-xl border border-border">
                <CoverArt m={m} />
              </div>
              <p className="mt-4 text-center text-sm text-muted-foreground">Open or download this resource to view its full contents.</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <GhostButton onClick={onClose}>Close</GhostButton>
          <a href={m.upload_url} target="_blank" rel="noreferrer">
            <PrimaryButton>
              <Download className="h-3.5 w-3.5" /> Download
            </PrimaryButton>
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * Upgrade modal for the dedicated Premium category. Same access rule and the
 * same group-vs-individual distinction as AccessGateNotice, with warmer,
 * benefit-led copy for this commercial showcase.
 */
function PremiumUpsellModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const isGroup = !!(user && groupsByStudentId().has(user.id));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <PremiumBadge />
            <h3 className="text-sm font-semibold text-foreground">Premium resources</h3>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
            <Lock className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold text-foreground">There's a whole library waiting for you</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {isGroup
              ? "Premium resources — deep-dive guides, curated workbooks and exclusive practice packs — come with Advance tier and up. They're not part of your group's plan yet: ask your admin to expand access and unlock them for everyone."
              : "Premium resources — deep-dive guides, curated workbooks and exclusive practice packs — come with Advance tier and up. Move up an access level and they're all yours, instantly."}
          </p>
          {!isGroup && (
            <Link
              to="/student/access-levels"
              className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-600 transition-colors hover:bg-amber-500/25"
            >
              <Sparkles className="h-3.5 w-3.5" /> See what Premium unlocks
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Category card — reuses the "Spotlight Session" visual language from
 * student.sessions.tsx (gradient surface, artwork pinned bottom-right, label,
 * paragraph, wide pill button), without the Sparkles icon.
 */
function SpotlightCategoryCard({
  name,
  subtitle,
  bgClass,
  textStyle,
  buttonStyle,
  neutral = false,
  compact = false,
  onClick,
}: {
  name: string;
  subtitle: string;
  bgClass: string;
  textStyle: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
  neutral?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      className={`${bgClass} relative h-full ${compact ? "min-h-[140px]" : "min-h-[200px]"} overflow-hidden rounded-3xl border border-border p-6 shadow-elevated`}
    >
      <img
        src={spotlightArt.url}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 right-0 h-[110%] w-auto translate-y-[6%] select-none object-contain"
      />
      <div className="relative z-10 w-[58%]">
        <h3
          className={`text-base font-semibold tracking-tight ${neutral ? "text-foreground" : ""}`}
          style={neutral ? undefined : textStyle}
        >
          {name}
        </h3>
        <p
          className={`mt-3 text-xs leading-relaxed ${neutral ? "text-muted-foreground" : ""}`}
          style={neutral ? undefined : { ...textStyle, opacity: 0.8 }}
        >
          {subtitle}
        </p>
        {neutral ? (
          <PrimaryButton className="mt-4 w-full !text-xs" onClick={onClick}>
            Browse Material
          </PrimaryButton>
        ) : (
          <button
            type="button"
            onClick={onClick}
            className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-3 py-2.5 text-xs font-semibold transition-transform duration-200 active:scale-[0.97]"
            style={buttonStyle ?? { color: "#01304a" }}
          >
            Browse Material
          </button>
        )}
      </div>
    </div>
  );
}

function MaterialCard({ m, onPreview }: { m: StoredMaterial; onPreview: (m: StoredMaterial) => void }) {
  return (
    <Card className="!p-0 overflow-hidden verbo-card-hover">
      <div className="aspect-video w-full overflow-hidden border-b border-border">
        <CoverArt m={m} />
      </div>
      <div className="space-y-3 p-4">
        <div>
          <div className="text-base font-semibold text-foreground">{m.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${TYPE_TINT[m.material_type]}`}
            >
              {m.material_type}
            </span>
            {m.premium && <PremiumBadge />}
          </div>
        </div>

        {hasUploadedFile(m) ? (
          <div className="flex gap-2">
            <GhostButton className="flex-1 justify-center" onClick={() => onPreview(m)}>
              <Eye className="h-3.5 w-3.5" /> Preview
            </GhostButton>
            <a href={m.upload_url} target="_blank" rel="noreferrer" className="flex-1">
              <PrimaryButton className="w-full justify-center">
                <Download className="h-3.5 w-3.5" /> Download
              </PrimaryButton>
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <GhostButton disabled className="flex-1 justify-center cursor-not-allowed opacity-50">
                <Eye className="h-3.5 w-3.5" /> Preview
              </GhostButton>
              <GhostButton disabled className="flex-1 justify-center cursor-not-allowed opacity-50">
                <Download className="h-3.5 w-3.5" /> Download
              </GhostButton>
            </div>
            <p className="text-xs text-muted-foreground">Coming soon — file pending upload</p>
          </div>
        )}
      </div>
    </Card>
  );
}

export function MaterialLibrary({
  items,
  title = "Resources",
  hasPremiumAccess = true,
}: {
  items: StoredMaterial[];
  title?: string;
  hasPremiumAccess?: boolean;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [preview, setPreview] = useState<StoredMaterial | null>(null);
  const [upsell, setUpsell] = useState(false);
  const [query, setQuery] = useState("");
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Premium materials leave their original category and live in the dedicated
  // "Premium" showcase instead.
  const { grouped, premiumItems } = useMemo(() => {
    const g: Record<string, StoredMaterial[]> = {};
    const prem: StoredMaterial[] = [];
    for (const m of items) {
      if (m.premium) prem.push(m);
      else (g[m.category] ||= []).push(m);
    }
    return { grouped: g, premiumItems: prem };
  }, [items]);

  const categories = Object.keys(grouped).sort();
  const isPremiumView = category === PREMIUM_KEY;
  const active = isPremiumView ? premiumItems : category ? grouped[category] ?? [] : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? active.filter((m) => m.title.toLowerCase().includes(q)) : active;
    return [...list].sort((a, b) => a.title.localeCompare(b.title));
  }, [active, query]);

  const availableLetters = useMemo(() => new Set(filtered.map((m) => letterOf(m.title))), [filtered]);

  const byLetter = useMemo(() => {
    const map: Record<string, StoredMaterial[]> = {};
    for (const m of filtered) (map[letterOf(m.title)] ||= []).push(m);
    return map;
  }, [filtered]);

  const openCategory = (key: string) => {
    if (key === PREMIUM_KEY && !hasPremiumAccess) {
      setUpsell(true);
      return;
    }
    setQuery("");
    setCategory(key);
  };

  const scrollToLetter = (l: string) => {
    letterRefs.current[l]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const headerLabel = isPremiumView ? "Premium" : category;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <button onClick={() => setCategory(null)} className={category ? "hover:text-foreground" : "font-medium text-foreground"}>
          {title}
        </button>
        {category && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{headerLabel}</span>
          </>
        )}
      </div>

      {!category ? (
        <>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Complementary resources to help you keep improving between sessions.
              </p>
            </div>
            {/* Troubleshooting — deliberately detached from the content categories */}
            <div className="w-full lg:w-80">
              <SpotlightCategoryCard
                name="Troubleshooting"
                subtitle="Quick fixes and answers for common technical issues."
                bgClass="bg-secondary border-border"
                textStyle={{}}
                neutral
                compact
                onClick={() => openCategory("Troubleshooting")}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mainCards.map((c) => (
              <SpotlightCategoryCard
                key={c.name}
                name={c.name}
                subtitle={c.subtitle}
                bgClass={c.bgClass}
                textStyle={c.textStyle}
                buttonStyle={c.buttonStyle}
                onClick={c.onClick}
              />
            ))}
          </div>
        </>

      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{headerLabel}</h1>
              {isPremiumView && <PremiumBadge />}
            </div>
            <GhostButton onClick={() => setCategory(null)}>
              <ArrowLeft className="h-3.5 w-3.5" /> All categories
            </GhostButton>
          </div>

          {/* Search + A-Z index (single compact row) */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card/95 px-2 py-2 backdrop-blur">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title…"
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-1">
              {LETTERS.filter((l) => availableLetters.has(l)).map((l) => (
                <button
                  key={l}
                  onClick={() => scrollToLetter(l)}
                  className="h-7 w-7 rounded-md text-xs font-semibold text-foreground transition-colors hover:bg-secondary"
                >
                  {l}
                </button>
              ))}
            </div>
          </div>


          <SectionTitle>
            {filtered.length} {filtered.length === 1 ? "resource" : "resources"}
          </SectionTitle>

          {filtered.length === 0 ? (
            <Card className="text-sm text-muted-foreground">
              {isPremiumView && premiumItems.length === 0
                ? "Premium resources are on their way — we're curating them right now. Check back soon."
                : query
                  ? "No resources match your search."
                  : "No resources in this category yet."}
            </Card>
          ) : (
            <div className="space-y-8">
              {LETTERS.filter((l) => byLetter[l]?.length).map((l) => (
                <div
                  key={l}
                  ref={(el) => {
                    letterRefs.current[l] = el;
                  }}
                  className="scroll-mt-20 space-y-3"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{l}</div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {byLetter[l].map((m) => (
                      <MaterialCard key={m.id} m={m} onPreview={setPreview} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {preview && <PreviewModal m={preview} onClose={() => setPreview(null)} />}
      {upsell && <PremiumUpsellModal onClose={() => setUpsell(false)} />}
    </div>
  );
}
