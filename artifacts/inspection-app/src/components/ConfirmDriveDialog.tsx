import { useEffect, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QrCode } from "lucide-react";

type BarcodeDetectorCtor = new (opts: { formats: string[] }) => {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

interface Props {
  trigger: ReactNode;
  driveName: string;
  title: string;
  description?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busy?: boolean;
  onConfirm: (confirmDriveName: string) => void;
  extra?: ReactNode;
  confirmDisabled?: boolean;
}

export function ConfirmDriveDialog({ trigger, driveName, title, description, open, onOpenChange, busy, onConfirm, extra, confirmDisabled }: Props) {
  const [typed, setTyped] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) {
      setTyped("");
      setScanning(false);
      setScanError(null);
    }
  }, [open]);

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
            if (codes[0]?.rawValue) {
              setTyped(codes[0].rawValue);
              setScanning(false);
              return;
            }
          } catch {
            // ignore frame errors
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
  }, [scanning]);

  const matches = typed.trim() === driveName;
  const scannerSupported = typeof window !== "undefined" && "BarcodeDetector" in window;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          {extra}
          <div className="space-y-1">
            <Label htmlFor="confirm-drive-name">Type drive name to confirm</Label>
            <Input
              id="confirm-drive-name"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={driveName}
              data-testid="input-confirm-drive-name"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">Expected: <span className="font-mono">{driveName}</span></p>
          </div>
          {scannerSupported && !scanning && (
            <Button type="button" variant="outline" size="sm" onClick={() => { setScanError(null); setScanning(true); }} data-testid="btn-scan-qr">
              <QrCode className="h-4 w-4 mr-2" />Scan QR
            </Button>
          )}
          {scanning && (
            <div className="space-y-2">
              <video ref={videoRef} className="w-full rounded border bg-black" muted playsInline />
              <Button type="button" variant="ghost" size="sm" onClick={() => setScanning(false)}>Cancel scan</Button>
            </div>
          )}
          {scanError && <p className="text-xs text-destructive">{scanError}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={!matches || busy || confirmDisabled}
            onClick={() => onConfirm(typed.trim())}
            data-testid="btn-confirm-custody"
          >
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
