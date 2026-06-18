import { useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck, ShieldX, Copy, ExternalLink, RotateCcw, Info, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { SafetyReport, SafetyCheck } from "@/lib/url-safety";

interface Props {
  report: SafetyReport;
  onReset: () => void;
}

const verdictMeta = {
  safe: {
    label: "Looks safe",
    description: "No common phishing indicators detected. Still review the URL before signing in.",
    icon: ShieldCheck,
    className: "bg-success text-success-foreground border-success",
  },
  caution: {
    label: "Use caution",
    description: "We found suspicious traits. Open only if you trust the source.",
    icon: ShieldAlert,
    className: "bg-warning text-warning-foreground border-warning",
  },
  danger: {
    label: "Dangerous",
    description: "Strong phishing indicators. We recommend not opening this link.",
    icon: ShieldX,
    className: "bg-danger text-danger-foreground border-danger",
  },
  "not-url": {
    label: "Not a web link",
    description: "This QR code doesn't contain a website URL.",
    icon: Info,
    className: "bg-muted text-foreground border-border",
  },
} as const;

function CheckRow({ check }: { check: SafetyCheck }) {
  const Icon = check.passed
    ? CheckCircle2
    : check.severity === "danger"
    ? XCircle
    : check.severity === "caution"
    ? AlertTriangle
    : Info;
  const color = check.passed
    ? "text-success"
    : check.severity === "danger"
    ? "text-danger"
    : check.severity === "caution"
    ? "text-warning"
    : "text-muted-foreground";
  return (
    <li className="flex gap-3 py-2.5">
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${color}`} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{check.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
      </div>
    </li>
  );
}

export function SafetyReportView({ report, onReset }: Props) {
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const meta = verdictMeta[report.verdict];
  const VerdictIcon = meta.icon;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(report.rawValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleOpen = () => {
    if (report.verdict === "safe" || confirmOpen) {
      window.open(report.url?.toString() ?? report.rawValue, "_blank", "noopener,noreferrer");
      setConfirmOpen(false);
    } else {
      setConfirmOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl border-2 p-5 ${meta.className}`}>
        <div className="flex items-center gap-3">
          <VerdictIcon className="h-8 w-8 shrink-0" />
          <div>
            <h2 className="text-lg font-bold leading-tight">{meta.label}</h2>
            <p className="text-sm opacity-90 mt-0.5">{meta.description}</p>
          </div>
        </div>
      </div>

      <Card className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          {report.verdict === "not-url" ? "Decoded content" : "Destination URL"}
        </p>
        <p className="text-sm font-mono break-all text-foreground">{report.rawValue}</p>
        {report.url && (
          <p className="text-xs text-muted-foreground mt-2">
            Host: <span className="font-mono">{report.url.hostname}</span>
          </p>
        )}
      </Card>

      {report.checks.length > 0 && (
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Safety checks
          </p>
          <ul className="divide-y">
            {report.checks.map((c) => (
              <CheckRow key={c.id} check={c} />
            ))}
          </ul>
        </Card>
      )}

      {confirmOpen && report.verdict !== "safe" && report.url && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Open anyway?</AlertTitle>
          <AlertDescription className="mt-2">
            This link was flagged as <strong>{report.verdict}</strong>. Tap "Open" again to continue, or cancel.
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="destructive" onClick={handleOpen}>
                Open anyway
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            {copied ? "Copied" : "Copy"}
          </Button>
          {report.url && !confirmOpen && (
            <Button className="flex-1" onClick={handleOpen}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Open
            </Button>
          )}
        </div>
        <Button variant="secondary" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Scan another
        </Button>
      </div>
    </div>
  );
}