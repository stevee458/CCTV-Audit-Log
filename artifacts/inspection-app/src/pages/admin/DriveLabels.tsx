import { useSearch } from "wouter";
import { useGetDrive } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

function DriveLabel({ id }: { id: number }) {
  const { data: drive } = useGetDrive(id);
  const apiBase = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  const qrUrl = `${apiBase}/api/drives/${id}/qr.png`;

  if (!drive) {
    return (
      <div className="label-card" data-testid={`label-${id}`}>
        <div className="label-loading">Loading drive {id}…</div>
      </div>
    );
  }

  return (
    <div className="label-card" data-testid={`label-${id}`}>
      <img src={qrUrl} alt={`QR code for ${drive.name}`} className="label-qr" />
      <div className="label-name">{drive.name}</div>
      <div className="label-type">{drive.type}</div>
    </div>
  );
}

export default function DriveLabels() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const idsParam = params.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map(s => parseInt(s.trim(), 10))
    .filter(n => Number.isInteger(n) && n > 0);

  return (
    <>
      <style>{`
        .labels-page {
          padding: 16px;
          font-family: sans-serif;
        }

        .labels-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .labels-title {
          font-size: 1.25rem;
          font-weight: 600;
        }

        .labels-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8mm;
        }

        .label-card {
          width: 100mm;
          height: 100mm;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          background: white;
          break-inside: avoid;
        }

        .label-qr {
          width: 64mm;
          height: 64mm;
          object-fit: contain;
        }

        .label-name {
          margin-top: 6px;
          font-size: 13px;
          font-weight: 700;
          text-align: center;
          word-break: break-word;
        }

        .label-type {
          margin-top: 2px;
          font-size: 11px;
          color: #6b7280;
          text-align: center;
          border: 1px solid #d1d5db;
          border-radius: 3px;
          padding: 1px 6px;
        }

        .label-loading {
          font-size: 12px;
          color: #9ca3af;
        }

        @media print {
          .labels-toolbar {
            display: none !important;
          }

          .labels-page {
            padding: 0;
          }

          .labels-grid {
            gap: 4mm;
          }

          .label-card {
            border-color: #aaa;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          body {
            margin: 0;
            padding: 10mm;
          }
        }
      `}</style>

      <div className="labels-page">
        <div className="labels-toolbar" data-testid="labels-toolbar">
          <Link href="/admin/drives">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
          <span className="labels-title">
            QR Labels — {ids.length} drive{ids.length !== 1 ? "s" : ""}
          </span>
          <Button
            onClick={() => window.print()}
            data-testid="btn-print"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        {ids.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No drive IDs specified. Go back and select drives to print labels for.</p>
        ) : (
          <div className="labels-grid" data-testid="labels-grid">
            {ids.map(id => (
              <DriveLabel key={id} id={id} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
