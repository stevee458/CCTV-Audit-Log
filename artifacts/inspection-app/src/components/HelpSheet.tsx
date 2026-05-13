import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

export type HelpRole = "inspector" | "maintenance" | "admin" | "general";

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  title: string;
  badge?: string;
  items: FaqItem[];
}

const INSPECTOR_FAQS: FaqSection[] = [
  {
    title: "Inspections",
    badge: "Inspector",
    items: [
      {
        q: "How do I start a new inspection?",
        a: "From your dashboard, tap 'New Inspection'. Select the depot, venue, and footage date, then choose or confirm the drive assigned to that venue. Once created, you'll enter the Inspection Workspace where you can add findings.",
      },
      {
        q: "How do I record a finding or violation?",
        a: "Inside the Inspection Workspace, tap 'Add Finding'. Select the clip, choose an outcome (Violation or No Violation), pick a category, and set the severity (A–E). Add any notes or incident time if needed, then save.",
      },
      {
        q: "What do the severity levels mean?",
        a: "Severity A is the most serious (e.g. criminal activity), down to E which is minor. When in doubt, choose a middle severity and add a note — your admin can adjust it during review.",
      },
      {
        q: "How do I complete and submit an inspection?",
        a: "Once all clips have been reviewed, tap 'Complete Inspection' at the bottom of the Workspace. This locks the record and makes it visible to admins. You cannot add findings after completion.",
      },
      {
        q: "What if the drive assigned to a venue is wrong or missing?",
        a: "Do not start an inspection with the wrong drive. Contact your maintenance coordinator to update the drive assignment. If the drive is missing from the DVR, flag this to maintenance before recording any findings.",
      },
      {
        q: "Can I work without an internet connection?",
        a: "Yes. Findings and inspection updates are saved locally and will sync automatically when you're back online. You'll see a sync indicator in the top bar. Do not close the app while a sync is in progress.",
      },
    ],
  },
  {
    title: "My Drives",
    badge: "Inspector",
    items: [
      {
        q: "Where can I see which drives are assigned to me?",
        a: "Tap 'My Drives' from the dashboard. This shows all drives currently held by you with their status (With Inspector or In DVR).",
      },
      {
        q: "What does 'In DVR' mean for a drive?",
        a: "'In DVR' means the drive is currently installed in a camera DVR at a venue, actively recording footage. You don't physically hold it — it's at the site.",
      },
    ],
  },
];

const MAINTENANCE_FAQS: FaqSection[] = [
  {
    title: "Drives & DVRs",
    badge: "Maintenance",
    items: [
      {
        q: "How do I scan a drive out of a DVR?",
        a: "Go to Home → 'At Depot', then start or continue a maintenance visit. When at a venue, tap the drive swap action. Scan (or manually enter) the drive QR code to record it as removed. The drive status will update to 'In Maintenance possession'.",
      },
      {
        q: "How do I hand a drive to an inspector?",
        a: "Go to Home → 'At Inspector'. Select the inspector from the list, choose 'Deliver', then scan the drive QR code to confirm the handover. The drive status will update to 'With Inspector'.",
      },
      {
        q: "How do I collect a drive back from an inspector?",
        a: "Go to Home → 'At Inspector'. Select the inspector, choose 'Collect', then scan the drive QR code. The drive returns to 'In Maintenance possession' under your name.",
      },
      {
        q: "What are the three drive statuses?",
        a: "'In DVR' — drive is installed at a venue recording. 'With Inspector' — inspector holds it for review. 'In Maintenance possession' — you or another maintainer currently holds it.",
      },
      {
        q: "How do I find which drive is at a specific venue?",
        a: "Ask your admin to use the Whereabouts tool, or check the Drives list and search by venue. Each drive detail page shows its current footage windows including venue history.",
      },
    ],
  },
  {
    title: "Visits & Maintenance",
    badge: "Maintenance",
    items: [
      {
        q: "How do I start a maintenance visit?",
        a: "Go to the Visits tab → tap 'New Visit'. Select your depot and the visit date. You can then add venue inspection records and repair events as you work through the sites.",
      },
      {
        q: "How do I record a repair at a venue?",
        a: "Open a visit, then tap 'Add Repair'. Select the venue, the asset involved, describe the work done, and enter parts and labour costs. Save when complete.",
      },
    ],
  },
  {
    title: "Stock & Requests",
    badge: "Maintenance",
    items: [
      {
        q: "How do I request a stock item?",
        a: "Go to the Stock tab → 'New Request'. Select the item (SKU), enter the quantity needed, and add a reason. Your admin will review and approve or reject the request.",
      },
      {
        q: "How do I check on a request I submitted?",
        a: "Tap your avatar in the top right → 'My Requests'. You'll see all your submitted requests and their current status (Requested, Ordered, Collected, or Rejected).",
      },
    ],
  },
];

const ADMIN_FAQS: FaqSection[] = [
  {
    title: "Users & Team",
    badge: "Admin",
    items: [
      {
        q: "How do I add a new user?",
        a: "Go to Team → 'New User'. Enter their name, email, and assign a role (Inspector, Maintenance, or Admin). They'll receive login credentials and can access the app immediately.",
      },
      {
        q: "How do I change a user's role?",
        a: "Go to Team, find the user, and open their profile. Edit their role from the dropdown. Changes take effect on their next login.",
      },
      {
        q: "How do I deactivate a user who has left?",
        a: "Open the user's profile in Team and toggle them to inactive. Inactive users cannot log in but their historical data is preserved.",
      },
    ],
  },
  {
    title: "Inspections & Drives",
    badge: "Admin",
    items: [
      {
        q: "How do I view all inspections?",
        a: "Click 'Inspections' in the top nav. Use the search and filter controls to narrow by inspector, venue, date range, or status. Click any inspection to see its full findings.",
      },
      {
        q: "How do I register a new drive?",
        a: "Go to Drives → 'New Drive'. Enter the drive name, type (venue or inspector), and assign a home venue if applicable. A QR code is automatically generated — print it from the Drive Labels page.",
      },
      {
        q: "How do I register a new venue?",
        a: "Go to Depots, select the depot this venue belongs to, and click 'Add Venue'. Enter the venue name and unique code. The venue becomes available for inspections and drive assignments immediately.",
      },
      {
        q: "How do I track where a drive is right now?",
        a: "Use the Whereabouts tool — enter a venue and date/time to see which drive was installed there. For a specific drive's current location, open the drive detail page and check the current holder and status.",
      },
    ],
  },
  {
    title: "Dashboard & Reporting",
    badge: "Admin",
    items: [
      {
        q: "What do the dashboard stats show?",
        a: "The overview shows total inspections, how many are in-progress, and violation counts broken down by severity (A–E). Use these to spot trends or venues with recurring issues.",
      },
      {
        q: "Can I export inspection data?",
        a: "Yes — on the Inspections list, look for the CSV export option to download a filtered list of inspections and their findings for offline analysis.",
      },
    ],
  },
];

const GENERAL_FAQS: FaqSection[] = [
  {
    title: "General",
    items: [
      {
        q: "What do the drive status badge colours mean?",
        a: "Green = In DVR (installed at a venue). Amber = With Inspector (inspector holds it). Blue = In Maintenance possession (a maintainer holds it).",
      },
      {
        q: "How does offline mode work?",
        a: "The app works without internet. Actions are saved locally and synced automatically when you reconnect. The sync icon in the top bar shows pending items. Avoid force-closing the app while a sync is running.",
      },
      {
        q: "How do I log out?",
        a: "Tap your avatar (initials) in the top-right corner, then tap 'Log out'. Your locally cached data remains available offline until you next log in.",
      },
      {
        q: "I can't see the page I expect — what should I do?",
        a: "Check that you're logged in with the right account and role. If you see a blank page, try pulling down to refresh (Inspector/Maintenance) or reloading the page. If the problem persists, contact your administrator.",
      },
    ],
  },
];

const ROLE_SECTIONS: Record<HelpRole, FaqSection[]> = {
  inspector: [...INSPECTOR_FAQS, ...GENERAL_FAQS],
  maintenance: [...MAINTENANCE_FAQS, ...GENERAL_FAQS],
  admin: [...ADMIN_FAQS, ...GENERAL_FAQS],
  general: [...GENERAL_FAQS],
};

interface HelpSheetProps {
  role: HelpRole;
}

function FaqContent({ sections }: { sections: FaqSection[] }) {
  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-sm font-semibold text-foreground">{section.title}</h2>
            {section.badge && (
              <Badge variant="outline" className="text-xs py-0">
                {section.badge}
              </Badge>
            )}
          </div>
          <Accordion type="multiple" className="w-full space-y-1">
            {section.items.map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`${section.title}-${idx}`}
                className="border rounded-lg px-3 data-[state=open]:bg-muted/40"
              >
                <AccordionTrigger className="text-sm text-left py-3 hover:no-underline font-medium leading-snug">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  );
}

export function HelpSheet({ role }: HelpSheetProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const sections = ROLE_SECTIONS[role];

  const trigger = (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Help"
      onClick={() => setOpen(true)}
      className="rounded-full text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8 shrink-0"
    >
      <HelpCircle className="h-4 w-4" />
    </Button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="h-[85dvh] flex flex-col p-0 rounded-t-2xl"
          >
            <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
              <SheetTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="h-5 w-5 text-primary" />
                Help &amp; FAQs
              </SheetTitle>
            </SheetHeader>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <FaqContent sections={sections} />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <HelpCircle className="h-5 w-5 text-primary" />
              Help &amp; FAQs
            </DialogTitle>
            <DialogDescription className="sr-only">
              Frequently asked questions and guidance for using this app.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <FaqContent sections={sections} />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
