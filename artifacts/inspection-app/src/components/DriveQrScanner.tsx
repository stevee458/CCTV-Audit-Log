import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Camera, QrCode } from "lucide-react";

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

export interface ScannedDrive {
  id: number;
  name: string;
}

interface Props {
  label: string;
  expectedDriveId?: number;
  expectedDriveName?: string;
  candidateDrives?: Array<{ id: number; name: string; status: string }>;
  onDetected: (drive: ScannedDrive) => void;
  onSkip?: () => void;
  skipLabel?: string;
}

function parseDriveQr(raw: string): ScannedDrive | null {
  try {
    const parsed = JSON.parse(raw) as { kind?: string; id?: number; name?: string };
    if (parsed?.kind === "drive" && typeof parsed.id === "number" && typeof parsed.name === "string") {
      return { id: parsed.id, name: parsed.name };
    }
  } catch {
    // not JSON
  }
  return null;
}

export function DriveQrScanner({ label, expectedDriveId, expectedDriveName, candidateDrives, onDetected, onSkip, skipLabel = "Skip" }: Props) {
  const [typed, setTyped] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [matched, setMatched] = useState<ScannedDrive | null>(null);
  const [mismatch, setMismatch] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const scannerSupported = typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    if (scannerSupported && !matched) {
      setScanning(true);
    }
  }, [scannerSupported, matched]);

  useEffect(() => {
    let cancelled = false;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!scanning || !Detector) return;
    const detector = new Detector({ formats: ["qr_code"] });
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            if (raw) {
              handleRawScan(raw);
              return;
            }
          } catch {
            // ignore frame decode errors
          }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      } catch (err) {
        setScanError(err instanceof Error ? err.message : "Camera unavailable");
        setScanning(false);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  function handleRawScan(raw: string) {
    setScanning(false);
    const parsed = parseDriveQr(raw);
    if (!parsed) {
      setMismatch("QR code is not a recognised drive. Try again.");
      return;
    }
    resolveScanned(parsed);
  }

  function resolveScanned(drive: ScannedDrive) {
    if (expectedDriveId !== undefined) {
      if (drive.id !== expectedDriveId) {
        setMismatch(`Scanned "${drive.name}" but expected "${expectedDriveName ?? expectedDriveId}". Try again.`);
        return;
      }
    } else if (candidateDrives && candidateDrives.length > 0) {
      const found = candidateDrives.find((c) => c.id === drive.id);
      if (!found) {
        setMismatch(`Drive "${drive.name}" is not at this venue. Try again.`);
        return;
      }
    }
    setMismatch(null);
    setMatched(drive);
    onDetected(drive);
  }

  function handleTypedSubmit() {
    const name = typed.trim();
    if (!name) return;
    if (expectedDriveId !== undefined && expectedDriveName) {
      if (name !== expectedDriveName) {
        setMismatch(`"${name}" does not match expected drive "${expectedDriveName}". Try again.`);
        return;
      }
      resolveScanned({ id: expectedDriveId, name });
      return;
    }
    if (candidateDrives && candidateDrives.length > 0) {
      const found = candidateDrives.find((c) => c.name === name);
      if (!found) {
        setMismatch(`"${name}" not found at this venue. Try again.`);
        return;
      }
      resolveScanned({ id: found.id, name: found.name });
      return;
    }
    setMismatch(null);
    setMatched({ id: 0, name });
    onDetected({ id: 0, name });
  }

  if (matched) {
    return (
      <div className="flex items-center gap-2 text-emerald-600 text-sm py-1" data-testid="scanner-matched">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
        <span>{matched.name} confirmed</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>

      {scanning && (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded border bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline data-testid="scanner-video" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 border-2 border-white/70 rounded-lg" />
            </div>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => setScanning(false)}>
            Cancel scan
          </Button>
        </div>
      )}

      {!scanning && (
        <div className="space-y-2">
          {scannerSupported && (
            <Button type="button" variant="outline" size="sm" onClick={() => { setScanError(null); setMismatch(null); setScanning(true); }} data-testid="btn-scan-qr">
              <Camera className="h-4 w-4 mr-2" />Scan QR
            </Button>
          )}
          {!scannerSupported && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <QrCode className="h-3 w-3" />Camera not available — enter drive name below
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={typed}
              onChange={(e) => { setTyped(e.target.value); setMismatch(null); }}
              placeholder={expectedDriveName ?? (candidateDrives ? "Type drive name" : "Drive name")}
              data-testid="input-drive-name-fallback"
              onKeyDown={(e) => e.key === "Enter" && handleTypedSubmit()}
            />
            <Button type="button" size="sm" onClick={handleTypedSubmit} disabled={!typed.trim()} data-testid="btn-confirm-typed">
              OK
            </Button>
          </div>
          {candidateDrives && candidateDrives.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Drives here: {candidateDrives.map((d) => d.name).join(", ")}
            </p>
          )}
        </div>
      )}

      {mismatch && (
        <div className="flex items-start gap-2 text-destructive text-xs" data-testid="scanner-mismatch">
          <XCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>{mismatch}</span>
        </div>
      )}
      {scanError && (
        <p className="text-xs text-destructive" data-testid="scanner-error">{scanError}</p>
      )}

      {onSkip && (
        <Button type="button" variant="ghost" size="sm" onClick={onSkip} data-testid="btn-skip-scan">
          {skipLabel}
        </Button>
      )}
    </div>
  );
}

export { Label };
