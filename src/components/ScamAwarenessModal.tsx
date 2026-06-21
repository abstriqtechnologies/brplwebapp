"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export const ScamAwarenessModal = () => {
  const [open, setOpen] = useState(true);

  const handleClose = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 rounded-t-xl rounded-b-lg overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2 border-b bg-amber-50 dark:bg-amber-950/30 rounded-t-xl">
          <DialogTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-xl">
            <ShieldAlert className="h-6 w-6 shrink-0" />
            Stay Vigilant Against Scams
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4 overflow-y-auto flex-1 text-sm text-slate-700 dark:text-slate-300 space-y-4">
          <section>
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              English
            </p>
            <p className="leading-relaxed">
              It has come to our notice that certain Fraudsters are impersonating
              Beyond Reach Premier League representatives, tricking people into
              paying for BRPL IDs and registrations through emails, calls, and
              messages.
            </p>
            <p className="leading-relaxed mt-2">
              Please note, Beyond Reach Premier League has never called for any
              BRPL IDs/Personal Details/Financial Details. Please do not send
              any fees or share personal or financial information with
              unauthorized individuals or platforms.
            </p>
            <p className="leading-relaxed mt-2">
              Please be aware that Beyond Reach Premier League will not be liable
              for any loss or damages arising from such fraudulent activities.
              Report any suspicious communication to local law enforcement
              immediately.
            </p>
            <p className="leading-relaxed mt-2">
              For registration inquiries and verification of the authenticity of
              any Beyond Reach Premier League Schemes, please visit our website.
            </p>
          </section>
          <section className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="font-semibold text-slate-900 dark:text-slate-100 mb-2">
              हिंदी
            </p>
            <p className="leading-relaxed">
              हमारी जानकारी में आया है कि कुछ धोखेबाज़, बियॉन्ड रीच प्रीमियर लीग
              के प्रतिनिधि बनकर ईमेल, कॉल और संदेशों के ज़रिए लोगों से बीआरपीएल
              आईडी और रजिस्ट्रेशन के लिए भुगतान करने का झांसा दे रहे हैं।
            </p>
            <p className="leading-relaxed mt-2">
              कृपया ध्यान दें, बियॉन्ड रीच प्रीमियर लीग ने कभी भी किसी बीआरपीएल
              आईडी/व्यक्तिगत विवरण/वित्तीय विवरण की मांग नहीं की है। कृपया किसी भी
              अनधिकृत व्यक्ति या प्लेटफ़ॉर्म को कोई शुल्क न भेजें या व्यक्तिगत या
              वित्तीय जानकारी साझा न करें।
            </p>
            <p className="leading-relaxed mt-2">
              कृपया ध्यान दें कि बियॉन्ड रीच प्रीमियर लीग ऐसी धोखाधड़ी गतिविधियों
              से होने वाले किसी भी नुकसान या क्षति के लिए उत्तरदायी नहीं होगी।
            </p>
          </section>
        </div>
        <DialogFooter className="px-6 py-4 border-t bg-slate-50 dark:bg-slate-900/50">
          <Button onClick={handleClose} className="min-w-[140px]">
            I have read and understood
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
