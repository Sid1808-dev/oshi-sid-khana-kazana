import { useRef, useState } from 'react';
import { Camera, ImagePlus, ScanSearch, Trash2, Upload } from 'lucide-react';
import type { FridgeImage, SampleFridgePreset } from '../types/recipe';
import { SAMPLE_FRIDGE_PRESETS } from '../data/presets';
import { compressImageFile } from '../utils/imageCompress';

interface FridgeUploaderProps {
  images: FridgeImage[];
  onAddImages: (newImages: FridgeImage[]) => void;
  onRemoveImage: (id: string) => void;
  onLoadSample: (preset: SampleFridgePreset) => void;
  onScanPhotos: () => void;
  isScanning: boolean;
}

export function FridgeUploader({
  images,
  onAddImages,
  onRemoveImage,
  onLoadSample,
  onScanPhotos,
  isScanning,
}: FridgeUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploadError(null);

    const remainingSlots = Math.max(0, 4 - images.length);
    if (remainingSlots === 0) {
      setUploadError('Maximum of 4 fridge photos reached. Remove one to add another.');
      return;
    }

    const selected = Array.from(fileList)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, remainingSlots);

    if (selected.length === 0) {
      setUploadError('Please select valid image files (JPG, PNG, or WebP).');
      return;
    }

    try {
      const processed: FridgeImage[] = await Promise.all(
        selected.map(async (file, index) => {
          const compressed = await compressImageFile(file);
          return {
            id: `upload-${Date.now()}-${index}`,
            name: file.name,
            mimeType: compressed.mimeType,
            data: compressed.data,
            previewUrl: compressed.previewUrl,
            source: 'upload',
          };
        })
      );
      onAddImages(processed);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not process image.');
    }
  };

  return (
    <section aria-labelledby="fridge-upload-heading" className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 id="fridge-upload-heading" className="font-display text-lg font-semibold tracking-tight text-slate-900">
            1. Fridge &amp; Produce Photos
          </h2>
          <p className="text-sm text-slate-700 mt-0.5">
            Upload up to 4 photos of your fridge shelves or crisper drawer.
          </p>
        </div>
        <span className="text-xs font-mono font-medium text-slate-700 tabular-nums shrink-0">
          {images.length}/4 photos
        </span>
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed p-4 backdrop-blur-md transition-colors ${
          isDragging
            ? 'border-[#15803D] bg-emerald-50/75'
            : 'border-slate-500/45 bg-white/35 hover:bg-white/50 hover:border-slate-600/60'
        }`}
      >
        <input
          ref={fileInputRef}
          id="fridge-photo-input"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/75 border border-white/80 flex items-center justify-center text-[#15803D] shrink-0">
              <Camera className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-950">
                Drop fridge photos here or browse files
              </p>
              <p className="text-xs text-slate-700 mt-0.5">
                JPG, PNG, or WebP · Automatically optimized for fast recognition
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 4}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-950 bg-white/50 hover:bg-white/75 backdrop-blur-md border border-white/75 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px]"
          >
            <Upload className="w-4 h-4" aria-hidden="true" />
            Upload Photo
          </button>
        </div>

        {uploadError && (
          <p role="alert" className="mt-3 text-xs text-red-700 font-medium">
            {uploadError}
          </p>
        )}

        {images.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div
                  key={img.id}
                  className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-200"
                >
                  <img
                    src={img.previewUrl}
                    alt={`Uploaded fridge view ${idx + 1}: ${img.name}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onRemoveImage(img.id)}
                    aria-label={`Remove fridge photo ${idx + 1}`}
                    className="absolute top-1.5 right-1.5 w-8 h-8 rounded-lg bg-slate-900/75 hover:bg-slate-900 text-white flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Extract visible vegetables into your editable basket before cooking, or jump straight to recipes.
              </p>
              <button
                type="button"
                onClick={onScanPhotos}
                disabled={isScanning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#15803D] bg-emerald-50/75 hover:bg-emerald-100/85 backdrop-blur-sm border border-emerald-200/80 disabled:opacity-60 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[36px]"
              >
                <ScanSearch className="w-3.5 h-3.5" aria-hidden="true" />
                {isScanning ? 'Scanning Fridge...' : 'Extract Ingredients from Photo'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div id="sample-fridges" className="pt-1">
        <p className="text-xs font-medium text-slate-800 mb-2">
          Or load a realistic sample fridge to test immediately:
        </p>
        <div className="grid grid-cols-1 gap-2">
          {SAMPLE_FRIDGE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onLoadSample(preset)}
              className="flex items-center gap-3 p-2.5 text-left rounded-xl border border-white/70 bg-white/45 hover:bg-white/70 hover:border-[#15803D] backdrop-blur-md transition-colors cursor-pointer min-h-[48px]"
            >
              <div className="w-12 h-9 rounded-lg overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                <img
                  src={preset.imagePath}
                  alt={preset.label}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-slate-950 flex items-center gap-1.5 truncate">
                  <ImagePlus className="w-3.5 h-3.5 text-[#15803D] shrink-0" aria-hidden="true" />
                  <span className="truncate">{preset.label}</span>
                </div>
                <p className="text-[11px] text-slate-700 truncate">{preset.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
