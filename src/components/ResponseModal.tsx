import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

interface ResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  type: "success" | "error";
}

const ResponseModal = ({
  isOpen,
  onClose,
  title,
  description,
  type,
}: ResponseModalProps) => {
  const isError = type === "error";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col items-center justify-center space-y-3 pt-6">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${
              isError ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
            }`}
          >
            {isError ? (
              <AlertCircle className="h-6 w-6" />
            ) : (
              <CheckCircle2 className="h-6 w-6" />
            )}
          </div>
          <DialogTitle className="text-xl text-center">{title}</DialogTitle>
          <DialogDescription className="text-center text-base">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center pb-4">
          <Button
            type="button"
            variant={isError ? "destructive" : "default"}
            onClick={onClose}
            className="w-full sm:w-auto min-w-[120px]"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ResponseModal;
