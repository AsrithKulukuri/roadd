"use client";

import React, { useState, useRef } from "react";
import { 
  Upload, FileText, RefreshCw, AlertCircle, 
  CheckCircle2, ExternalLink, X, Loader2, Link2, LucideIcon 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { uploadToS3, StorageFolder, resolveMediaUrl } from "@/lib/aws/storage-utils";

export interface AdminFileUploadProps {
  label: string;
  hint?: string;
  currentUrl?: string;
  onUrlChange: (url: string) => void;
  folder?: StorageFolder;
  entityId?: string;
  accept?: string;
  maxSizeMB?: number;
  compress?: boolean;
  watermark?: boolean;
  icon?: LucideIcon;
  allowDirectUrl?: boolean;
  className?: string;
}

interface UploadStats {
  percent: number;
  loadedMB: number;
  totalMB: number;
  speedMBs: number;
  remainingSec: number;
}

export function AdminFileUpload({
  label,
  hint = "Supports PDF, DOC, DOCX, Images up to 500MB",
  currentUrl = "",
  onUrlChange,
  folder = "brochures",
  entityId,
  accept = ".pdf,.doc,.docx,image/*",
  maxSizeMB = 500,
  compress = false,
  watermark = false,
  icon: Icon = FileText,
  allowDirectUrl = true,
  className = "",
}: AdminFileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [stats, setStats] = useState<UploadStats | null>(null);
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDirectUrl, setShowDirectUrl] = useState(false);
  const [directUrlValue, setDirectUrlValue] = useState(currentUrl);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const executeUpload = async (file: File) => {
    // 1. Client-side Size Validation
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      const err = `File size (${fileSizeMB.toFixed(1)}MB) exceeds limit of ${maxSizeMB}MB.`;
      toast.error(err);
      setErrorMessage(err);
      setFailedFile(file);
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setFailedFile(null);
    setStats({
      percent: 2,
      loadedMB: 0,
      totalMB: +(fileSizeMB.toFixed(1)),
      speedMBs: 0,
      remainingSec: 0,
    });

    try {
      const result = await uploadToS3({
        file,
        folder,
        entityId,
        compress: compress && file.type.startsWith("image/"),
        watermark: watermark && file.type.startsWith("image/"),
        onProgress: (info) => {
          setStats({
            percent: info.percent,
            loadedMB: +(info.loaded / (1024 * 1024)).toFixed(1),
            totalMB: +(info.total / (1024 * 1024)).toFixed(1),
            speedMBs: +(info.speedBytesPerSec / (1024 * 1024)).toFixed(1),
            remainingSec: info.remainingSec,
          });
        },
      });

      if (result.success && result.fileUrl) {
        onUrlChange(result.fileUrl);
        setDirectUrlValue(result.fileUrl);
        setFailedFile(null);
        setErrorMessage(null);
        toast.success(`${label || "File"} uploaded successfully! (${fileSizeMB.toFixed(1)} MB)`);
      } else {
        const errorText = result.error || "Upload failed. Please check your network connection and retry.";
        setFailedFile(file);
        setErrorMessage(errorText);
        toast.error(errorText);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload encountered an error";
      setFailedFile(file);
      setErrorMessage(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      setStats(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    executeUpload(file);
  };

  const handleRetry = () => {
    if (failedFile) {
      toast.info(`Retrying upload for "${failedFile.name}"...`);
      executeUpload(failedFile);
    }
  };

  const handleClearError = () => {
    setFailedFile(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDirectUrlApply = () => {
    onUrlChange(directUrlValue.trim());
    toast.success("URL updated!");
  };

  const resolvedUrl = resolveMediaUrl(currentUrl);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
          <Icon className="w-4 h-4" /> {label}
        </label>
        <div className="flex items-center gap-3">
          {allowDirectUrl && (
            <button
              type="button"
              onClick={() => setShowDirectUrl(!showDirectUrl)}
              className="text-xs font-semibold text-text-tertiary hover:text-amber-500 flex items-center gap-1 transition-colors"
            >
              <Link2 className="w-3.5 h-3.5" />
              {showDirectUrl ? "Hide Direct URL" : "Paste URL"}
            </button>
          )}
          {currentUrl && (
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1"
            >
              View Document <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Main Upload Box */}
      <div className="border border-border-default/80 rounded-2xl bg-bg-primary/40 p-4 transition-all hover:border-border-default">
        {/* State 1: Active Uploading with Live Progress */}
        {isUploading && stats && (
          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-primary flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500 shrink-0" />
                Uploading {stats.loadedMB} MB of {stats.totalMB} MB
              </span>
              <span className="font-black text-amber-500 text-sm">{stats.percent}%</span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 relative">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300 relative shadow-sm"
                style={{ width: `${Math.max(4, stats.percent)}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite] rounded-full" />
              </div>
            </div>

            {/* Speed & ETA stats */}
            <div className="flex items-center justify-between text-[11px] text-text-tertiary">
              <span>
                {stats.speedMBs > 0 ? `Speed: ${stats.speedMBs} MB/s` : "Uploading to cloud storage..."}
              </span>
              <span>
                {stats.remainingSec > 0 ? `~${stats.remainingSec}s remaining` : "Finalizing upload..."}
              </span>
            </div>
          </div>
        )}

        {/* State 2: Upload Failed - 1-Click Retry UI */}
        {!isUploading && failedFile && (
          <div className="space-y-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-red-600 dark:text-red-400 truncate">
                  Failed: {failedFile.name} ({(failedFile.size / (1024 * 1024)).toFixed(1)} MB)
                </p>
                <p className="text-[11px] text-red-500/80 mt-0.5">
                  {errorMessage || "Upload was interrupted or timed out."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                onClick={handleRetry}
                className="h-9 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearError}
                className="h-9 px-3 text-xs text-text-secondary hover:text-text-primary rounded-xl cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* State 3: Idle / Ready to Upload */}
        {!isUploading && !failedFile && (
          <div>
            {currentUrl ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {label} is uploaded & active
                    </p>
                    <p className="text-[10px] text-text-tertiary truncate max-w-xs sm:max-w-md">
                      {currentUrl}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <label className="h-8 px-3 text-xs font-semibold bg-bg-card hover:bg-bg-primary border border-border-default rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors text-text-primary">
                    <Upload className="w-3.5 h-3.5 text-amber-500" />
                    Replace File
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={accept}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onUrlChange("");
                      setDirectUrlValue("");
                    }}
                    className="h-8 px-2 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-amber-500" /> Choose file to upload
                  </p>
                  <p className="text-[11px] text-text-tertiary">
                    {hint}
                  </p>
                </div>

                <label className="h-10 px-5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0">
                  <Upload className="w-4 h-4" />
                  Upload File
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={accept}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* State 4: Optional Direct URL Input field */}
        {showDirectUrl && (
          <div className="mt-3 pt-3 border-t border-border-default/50 space-y-2">
            <label className="text-[11px] font-medium text-text-secondary block">
              Direct File URL (e.g. AWS S3, Google Drive, or CDN link)
            </label>
            <div className="flex items-center gap-2">
              <Input
                value={directUrlValue}
                onChange={(e) => setDirectUrlValue(e.target.value)}
                placeholder="https://..."
                className="h-9 text-xs"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleDirectUrlApply}
                className="h-9 px-3 text-xs bg-bg-card hover:bg-bg-primary border border-border-default rounded-xl shrink-0"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
