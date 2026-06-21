import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { X } from "lucide-react";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

interface VideoModalProps {
    isOpen: boolean;
    onClose: () => void;
    videoSrc: string;
}

const VideoModal: React.FC<VideoModalProps> = ({ isOpen, onClose, videoSrc }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-4xl p-0 bg-black overflow-hidden border-none text-white">
                <VisuallyHidden.Root>
                    <DialogTitle>Video Player</DialogTitle>
                    <DialogDescription>A video player modal</DialogDescription>
                </VisuallyHidden.Root>
                <div className="relative aspect-video w-full">
                    {/* <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-50 p-2 text-white/80 hover:text-white bg-black/40 hover:bg-black/60 rounded-full transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button> */}
                    <video
                        src={videoSrc}
                        className="w-full h-full object-contain"
                        controls
                        autoPlay
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default VideoModal;
