'use client';

import { useRef } from 'react';
import { Camera, ImageIcon } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

interface PhotoSourceSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileSelected: (file: File) => void;
  maxSizeMB?: number;
}

const VALID_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function PhotoSourceSheet({
  open,
  onOpenChange,
  onFileSelected,
  maxSizeMB = 5,
}: PhotoSourceSheetProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;

    if (!VALID_TYPES.includes(file.type)) {
      alert('Only JPEG, PNG, and WebP images are allowed');
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Image must be under ${maxSizeMB}MB`);
      return;
    }

    onOpenChange(false);
    onFileSelected(file);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-8">
        <DrawerHeader className="text-center">
          <DrawerTitle>Add Photo</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 space-y-2">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors min-h-12"
          >
            <Camera className="size-5 text-amber-500" />
            <span className="text-sm font-medium text-foreground">Take Photo</span>
          </button>

          <button
            onClick={() => libraryInputRef.current?.click()}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors min-h-12"
          >
            <ImageIcon className="size-5 text-blue-500" />
            <span className="text-sm font-medium text-foreground">Choose from Library</span>
          </button>
        </div>

        {/* Camera input — capture attribute opens iOS camera directly */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFile}
        />

        {/* Library input — standard photo picker */}
        <input
          ref={libraryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
      </DrawerContent>
    </Drawer>
  );
}
