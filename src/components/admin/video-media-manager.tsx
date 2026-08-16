"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Video, 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  Play, 
  CheckCircle2, 
  Loader2, 
  AlertCircle,
  ExternalLink,
  Film,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Image from "next/image";
import { uploadToS3, resolveMediaUrl } from "@/lib/aws/storage-utils";
import { getYoutubeEmbedUrl, isYoutubeShort, cn } from "@/lib/utils";

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

interface VideoMediaManagerProps {
  videoUrl?: string;
  videoThumbnail?: string;
  onChange: (data: { videoUrl: string; videoThumbnail: string }) => void;
  folder?: "properties" | "projects" | "videos";
  entityId?: string;
  label?: string;
  description?: string;
  suggestedThumbnails?: string[];
}

export function VideoMediaManager({
  videoUrl = "",
  videoThumbnail = "",
  onChange,
  folder = "properties",
  entityId,
  label = "Walkthrough & Tour Video",
  description = "Add a YouTube link or directly upload an MP4/WebM video (up to 50MB) with an optional custom cover photo.",
  suggestedThumbnails = [],
}: VideoMediaManagerProps) {
  // Determine initial mode based on current videoUrl
  const isInitialYoutube = Boolean(videoUrl && (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") || videoUrl.includes("vimeo.com")));
  const [mode, setMode] = useState<"youtube" | "upload">(isInitialYoutube ? "youtube" : (videoUrl ? "upload" : "youtube"));
  
  const [rawYoutubeInput, setRawYoutubeInput] = useState(isInitialYoutube ? videoUrl : "");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const thumbnailFileInputRef = useRef<HTMLInputElement>(null);

  // Sync mode if videoUrl changes externally
  useEffect(() => {
    if (videoUrl) {
      const isYt = videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be") || videoUrl.includes("vimeo.com");
      if (isYt) {
        setRawYoutubeInput(videoUrl);
      }
    }
  }, [videoUrl]);

  // Extract YouTube ID for auto-thumbnail suggestion
  const getYoutubeThumbnail = (url: string) => {
    const embed = getYoutubeEmbedUrl(url);
    if (!embed) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([\w-]{11})/);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/maxresdefault.jpg`;
    }
    return null;
  };

  const handleYoutubeChange = (val: string) => {
    setRawYoutubeInput(val);
    const trimmed = val.trim();
    if (!trimmed) {
      onChange({ videoUrl: "", videoThumbnail: "" });
      return;
    }

    // Auto-set YouTube thumbnail if no thumbnail currently set
    const autoThumb = getYoutubeThumbnail(trimmed);
    onChange({
      videoUrl: trimmed,
      videoThumbnail: videoThumbnail || autoThumb || "",
    });
  };

  // Direct 50MB Video Upload Handler
  const handleVideoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size: 50MB max (50 * 1024 * 1024 bytes)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Video file is too large. Maximum supported size is 50MB.");
      return;
    }

    // Validate file type
    const validVideoTypes = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/mov"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isVideo = validVideoTypes.includes(file.type) || ["mp4", "webm", "mov", "mkv"].includes(ext);

    if (!isVideo) {
      toast.error("Please select a valid video file (.mp4, .webm, or .mov).");
      return;
    }

    try {
      setIsUploadingVideo(true);
      setUploadProgress(20);

      const result = await uploadToS3({
        file,
        folder: "videos",
        entityId,
        compress: false, // Do not compress video binary
      });

      setUploadProgress(100);

      if (!result.success || !result.fileUrl) {
        throw new Error(result.error || "Failed to upload video to S3");
      }

      toast.success(`Video uploaded successfully (${(file.size / (1024 * 1024)).toFixed(1)} MB)!`);
      onChange({
        videoUrl: result.fileUrl,
        videoThumbnail: videoThumbnail || "",
      });
    } catch (err: any) {
      console.error("[Video Upload Error]:", err);
      toast.error(err.message || "Failed to upload video");
    } finally {
      setIsUploadingVideo(false);
      setUploadProgress(0);
      if (videoFileInputRef.current) videoFileInputRef.current.value = "";
    }
  };

  // Thumbnail / Cover Photo Upload Handler
  const handleThumbnailFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingThumbnail(true);
      const result = await uploadToS3({
        file,
        folder: "properties",
        entityId,
        compress: true,
      });

      if (!result.success || !result.fileUrl) {
        throw new Error(result.error || "Failed to upload cover photo");
      }

      toast.success("Video cover photo updated!");
      onChange({
        videoUrl,
        videoThumbnail: result.fileUrl,
      });
    } catch (err: any) {
      console.error("[Cover Photo Upload Error]:", err);
      toast.error(err.message || "Failed to upload cover photo");
    } finally {
      setIsUploadingThumbnail(false);
      if (thumbnailFileInputRef.current) thumbnailFileInputRef.current.value = "";
    }
  };

  const handleClearVideo = () => {
    setRawYoutubeInput("");
    onChange({ videoUrl: "", videoThumbnail: "" });
    toast.info("Video removed.");
  };

  const isUploadedVideo = Boolean(videoUrl && !videoUrl.includes("youtube.com") && !videoUrl.includes("youtu.be") && !videoUrl.includes("vimeo.com"));
  const youtubeEmbedUrl = getYoutubeEmbedUrl(videoUrl);
  const isShort = isYoutubeShort(videoUrl);

  return (
    <div className="space-y-4 p-5 sm:p-6 bg-bg-card border border-border-default rounded-2xl shadow-sm">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-default/60">
        <div>
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-text-primary">{label}</h3>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        </div>

        {/* Mode Toggle Buttons (Mutually Exclusive) */}
        <div className="flex items-center p-1 bg-bg-tertiary rounded-xl border border-border-default shrink-0">
          <button
            type="button"
            onClick={() => {
              if (mode !== "youtube") {
                setMode("youtube");
                if (isUploadedVideo) {
                  onChange({ videoUrl: "", videoThumbnail: "" });
                }
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              mode === "youtube"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <YoutubeIcon className="w-4 h-4 text-red-600" />
            <span>YouTube Link</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (mode !== "upload") {
                setMode("upload");
                if (!isUploadedVideo && videoUrl) {
                  onChange({ videoUrl: "", videoThumbnail: "" });
                  setRawYoutubeInput("");
                }
              }
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
              mode === "upload"
                ? "bg-amber-500 text-slate-950 shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <UploadCloud className="w-4 h-4 text-blue-500" />
            <span>Upload Video (Max 50MB)</span>
          </button>
        </div>
      </div>

      <div className="text-[11px] font-semibold text-text-tertiary flex items-center gap-1.5 bg-bg-primary/50 px-3 py-1.5 rounded-lg border border-border-default/40">
        <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>You can attach <strong>only ONE</strong> video per property/project: either a YouTube URL or a direct uploaded video file.</span>
      </div>

      {/* Mode 1: YouTube Link Input */}
      {mode === "youtube" && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Input
                value={rawYoutubeInput}
                onChange={(e) => handleYoutubeChange(e.target.value)}
                placeholder="https://youtube.com/watch?v=... or youtu.be/... or YouTube Shorts"
                className="h-11 pl-9 pr-10 text-sm font-medium bg-bg-primary"
              />
              <YoutubeIcon className="absolute left-3 top-3.5 w-4 h-4 text-red-500" />
              {rawYoutubeInput && (
                <button
                  type="button"
                  onClick={handleClearVideo}
                  className="absolute right-3 top-3 text-text-tertiary hover:text-red-500"
                  title="Clear"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {videoUrl && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearVideo}
                className="text-xs text-red-500 border-red-500/20 hover:bg-red-500/10 h-11"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> Remove Video
              </Button>
            )}
          </div>

          {/* YouTube Preview */}
          {youtubeEmbedUrl && (
            <div className="p-3 bg-bg-primary rounded-xl border border-border-default/80 flex flex-col sm:flex-row gap-4 items-start">
              <div className={cn(
                "relative bg-black rounded-lg overflow-hidden shrink-0 border border-slate-800",
                isShort ? "w-36 aspect-[9/16]" : "w-full sm:w-64 aspect-video"
              )}>
                <iframe
                  src={youtubeEmbedUrl}
                  title="YouTube Preview"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valid YouTube Video Linked</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Format: {isShort ? "Vertical YouTube Short (9:16)" : "Standard Landscape Video (16:9)"}
                </p>
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-500 hover:underline font-semibold"
                >
                  <span>Open Video in New Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Direct Video File Upload (Up to 50MB) */}
      {mode === "upload" && (
        <div className="space-y-3">
          <input
            type="file"
            ref={videoFileInputRef}
            onChange={handleVideoFileSelect}
            accept="video/mp4,video/webm,video/quicktime,video/mov,video/x-matroska"
            className="hidden"
          />

          {!isUploadedVideo ? (
            <div
              onClick={() => !isUploadingVideo && videoFileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300",
                isUploadingVideo
                  ? "border-amber-500 bg-amber-500/5 cursor-wait"
                  : "border-border-default hover:border-amber-500 hover:bg-amber-500/5"
              )}
            >
              {isUploadingVideo ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-text-primary">Uploading Video to AWS S3...</p>
                    <p className="text-xs text-text-secondary">Streaming directly to secure storage</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2.5">
                  <div className="p-3.5 bg-amber-500/10 text-amber-500 rounded-full">
                    <UploadCloud className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-text-primary">
                      Click or Drag & Drop Video File Here
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Supports <span className="font-bold text-text-primary">MP4, WebM, MOV</span> up to <span className="font-bold text-amber-500">50 MB</span>
                    </p>
                  </div>
                  <Button type="button" size="sm" className="mt-1 font-bold bg-amber-500 hover:bg-amber-600 text-slate-950">
                    Select Video File
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Uploaded Video Player & Actions */
            <div className="p-4 bg-bg-primary rounded-xl border border-border-default flex flex-col sm:flex-row gap-4 items-start">
              <div className="w-full sm:w-64 aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 shrink-0">
                <video
                  src={resolveMediaUrl(videoUrl)}
                  controls
                  className="w-full h-full object-contain"
                  poster={videoThumbnail ? resolveMediaUrl(videoThumbnail) : undefined}
                />
              </div>

              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Custom Video Uploaded & Ready</span>
                </div>
                <p className="text-xs text-text-tertiary font-mono truncate max-w-sm">
                  {videoUrl}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => videoFileInputRef.current?.click()}
                    className="text-xs font-bold h-9"
                  >
                    <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-blue-500" /> Replace Video
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleClearVideo}
                    className="text-xs font-bold h-9"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Remove
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Video Cover Photo / Thumbnail Section (Crucial Polish for Both Modes) */}
      {videoUrl && (
        <div className="pt-4 border-t border-border-default/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-amber-500" />
              <label className="text-xs font-black text-text-primary">
                Video Cover Photo / Thumbnail (Optional)
              </label>
            </div>
            <span className="text-[11px] text-text-tertiary">
              Displayed as preview tile with play badge
            </span>
          </div>

          <input
            type="file"
            ref={thumbnailFileInputRef}
            onChange={handleThumbnailFileSelect}
            accept="image/*"
            className="hidden"
          />

          <div className="flex flex-col sm:flex-row items-start gap-4">
            {/* Current Cover Preview */}
            <div className="relative w-44 aspect-video bg-slate-900 rounded-xl overflow-hidden border border-border-default shrink-0 group">
              {videoThumbnail ? (
                <>
                  <Image
                    src={resolveMediaUrl(videoThumbnail)}
                    alt="Video Thumbnail"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="p-2 rounded-full bg-amber-500/90 text-slate-950 shadow-md group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-slate-950" />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onChange({ videoUrl, videoThumbnail: "" })}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600 text-white rounded-md shadow-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Cover Photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-text-tertiary text-[11px] gap-1 p-2 text-center">
                  <ImageIcon className="w-5 h-5 text-text-secondary opacity-60" />
                  <span>No Custom Cover</span>
                </div>
              )}
            </div>

            {/* Thumbnail Actions & Suggestions */}
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploadingThumbnail}
                  onClick={() => thumbnailFileInputRef.current?.click()}
                  className="text-xs font-bold h-8"
                >
                  {isUploadingThumbnail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Uploading...
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5 mr-1.5 text-amber-500" /> Upload Cover Photo
                    </>
                  )}
                </Button>

                {/* Auto YouTube Thumbnail Button if Available */}
                {youtubeEmbedUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const ytThumb = getYoutubeThumbnail(videoUrl);
                      if (ytThumb) {
                        onChange({ videoUrl, videoThumbnail: ytThumb });
                        toast.success("Loaded official YouTube HD thumbnail!");
                      }
                    }}
                    className="text-xs text-text-secondary hover:text-amber-500 h-8"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-400" /> Use YouTube Cover
                  </Button>
                )}
              </div>

              {/* Quick Pick from Uploaded Property Photos if available */}
              {suggestedThumbnails.length > 0 && (
                <div className="pt-2">
                  <p className="text-[11px] font-bold text-text-secondary mb-1.5">
                    Or select from property gallery photos:
                  </p>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                    {suggestedThumbnails.slice(0, 6).map((imgUrl, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onChange({ videoUrl, videoThumbnail: imgUrl })}
                        className={cn(
                          "relative w-14 h-10 rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer",
                          videoThumbnail === imgUrl
                            ? "border-amber-500 scale-105 shadow-xs"
                            : "border-border-default/80 hover:border-text-secondary"
                        )}
                      >
                        <Image
                          src={resolveMediaUrl(imgUrl)}
                          alt={`Suggestion ${idx + 1}`}
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
