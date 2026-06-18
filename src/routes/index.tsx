import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ShieldCheck, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QrScanner } from "@/components/qr-scanner";
import { SafetyReportView } from "@/components/safety-report";
import { analyzeUrl, type SafetyReport } from "@/lib/url-safety";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QR Safety Checker — Scan QR codes safely" },
      { name: "description", content: "Scan QR codes with your camera and instantly see if the destination link is safe, suspicious, or dangerous." },
      { property: "og:title", content: "QR Safety Checker" },
      { property: "og:description", content: "Scan a QR code and analyze the link before you open it." },
    ],
  }),
  component: Index,
});

function Index() {
  const [scanning, setScanning] = useState(false);
  const [report, setReport] = useState<SafetyReport | null>(null);

  const handleDecoded = (value: string) => {
    setReport(analyzeUrl(value));
    setScanning(false);
  };

  const reset = () => {
    setReport(null);
    setScanning(true);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-4 py-6 sm:py-10">
        <header className="flex items-center gap-2 mb-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-foreground">QR Safety Checker</h1>
            <p className="text-xs text-muted-foreground">Scan first, open second.</p>
          </div>
        </header>

        {!report && !scanning && (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Camera className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-base font-semibold text-foreground">Check a QR code</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We'll decode it, inspect the destination, and warn you about phishing or suspicious links.
              </p>
              <Button size="lg" className="mt-5 w-full" onClick={() => setScanning(true)}>
                <Camera className="mr-2 h-5 w-5" /> Start scanning
              </Button>
            </div>

            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2"><span className="text-primary">•</span> Detects fake HTTPS, IP addresses, and lookalike domains</li>
              <li className="flex gap-2"><span className="text-primary">•</span> Flags URL shorteners and brand spoofing</li>
              <li className="flex gap-2"><span className="text-primary">•</span> All checks run on your device — nothing is uploaded</li>
            </ul>
          </div>
        )}

        {scanning && (
          <div className="space-y-4">
            <QrScanner active={scanning} onDecoded={handleDecoded} />
            <p className="text-center text-sm text-muted-foreground">
              Point your camera at a QR code.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setScanning(false)}>
              Cancel
            </Button>
          </div>
        )}

        {report && <SafetyReportView report={report} onReset={reset} />}
      </div>
    </main>
  );
}
