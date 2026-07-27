import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadLotPhoto, deleteLotPhoto } from "../api/lots";
import { getMediaUrl } from "../api/docs";
import { useAuth } from "../context/AuthContext";
import { ImagePlus, X, Loader } from "lucide-react";

interface Props { lotId: string; photos: string[]; }

const MAX_PHOTOS = 8;

export default function LotPhotos({ lotId, photos }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const canUpload = user?.role === "exporter" || user?.role === "admin";
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["lot", lotId] });

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(""); setUploading(true);
    try {
      await uploadLotPhoto(lotId, file);
      await refresh();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(msg ?? "Upload failed.");
    } finally { setUploading(false); }
  };

  const handleRemove = async (url: string) => {
    setError(""); setRemoving(url);
    try {
      await deleteLotPhoto(lotId, url);
      await refresh();
    } catch {
      setError("Could not remove photo.");
    } finally { setRemoving(null); }
  };

  if (!canUpload && photos.length === 0) return null;

  return (
    <div>
      <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.58rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(28,28,26,0.4)", margin: "0 0 14px" }}>
        Farm Photos
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 96px), 1fr))", gap: "8px" }}>
        {photos.map(url => (
          <div key={url} style={{ position: "relative", aspectRatio: "1", borderRadius: "4px", overflow: "hidden", border: "1px solid rgba(28,28,26,0.08)" }}>
            <img src={getMediaUrl(url) ?? url} alt="Farm" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {canUpload && (
              <button
                onClick={() => handleRemove(url)}
                disabled={removing === url}
                style={{
                  position: "absolute", top: "4px", right: "4px",
                  width: "20px", height: "20px", borderRadius: "50%", border: "none",
                  background: "rgba(28,28,26,0.6)", color: "#FFFFFF",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: removing === url ? "not-allowed" : "pointer",
                }}
                title="Remove photo"
              >
                {removing === url ? <Loader size={10} /> : <X size={11} />}
              </button>
            )}
          </div>
        ))}

        {canUpload && photos.length < MAX_PHOTOS && (
          <button
            onClick={handlePick}
            disabled={uploading}
            style={{
              aspectRatio: "1", borderRadius: "4px",
              border: "1px dashed rgba(28,28,26,0.2)", background: "#F7F5F0",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
              color: "rgba(28,28,26,0.4)", cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? <Loader size={16} /> : <ImagePlus size={16} />}
            <span style={{ fontFamily: "DM Mono, monospace", fontSize: "0.55rem", letterSpacing: "0.06em" }}>
              {uploading ? "UPLOADING" : "ADD PHOTO"}
            </span>
          </button>
        )}
      </div>

      <input
        ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }} onChange={handleFile}
      />

      {error && (
        <p style={{ fontFamily: "DM Mono, monospace", fontSize: "0.6rem", color: "#C0392B", margin: "8px 0 0" }}>
          {error}
        </p>
      )}
      {photos.length === 0 && !canUpload && (
        <p style={{ fontFamily: "Instrument Sans, sans-serif", fontSize: "0.78rem", color: "rgba(28,28,26,0.3)", margin: 0 }}>
          No photos yet.
        </p>
      )}
    </div>
  );
}
