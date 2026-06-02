import { CameraIcon, UploadIcon } from "./ui/icons.jsx";

function ActionCard({ Icon, title, subtitle, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-3 p-4 bg-card hover:bg-card-hover border border-border hover:border-accent/30 rounded-xl transition-all cursor-pointer w-full"
    >
      <span className="h-10 w-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center group-hover:bg-accent/20 transition-colors flex-shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="text-left min-w-0">
        <div className="text-sm font-semibold text-text-primary">{title}</div>
        <div className="text-xs text-text-muted">{subtitle}</div>
      </div>
    </button>
  );
}

export default function ScanActions({ onScan, onUpload }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <ActionCard Icon={CameraIcon} title="Scannen" subtitle="Medikament erkennen" onClick={onScan} />
      <ActionCard Icon={UploadIcon} title="Hochladen" subtitle="Bild oder Datei hochladen" onClick={onUpload} />
    </div>
  );
}
