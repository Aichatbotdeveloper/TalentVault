import Link from "next/link";
import { getPublicSettings } from "@/lib/cms/content";
import { Icon } from "../ui/icon";
import { LogoMark } from "../ui/logo";

export async function PublicFooter() {
  const { contact } = await getPublicSettings();
  return (
    <footer className="w-full bg-surface-alt text-surface-bright pt-space-4xl pb-space-2xl">
      <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop grid grid-cols-1 md:grid-cols-4 gap-space-2xl pb-space-3xl">
        <div className="space-y-space-md">
          <div className="flex items-center gap-space-xs">
            <LogoMark className="h-8 w-8" />
            <span className="font-heading-md text-heading-md text-surface-bright font-bold">TalentVault</span>
          </div>
          <p className="font-body-sm text-body-sm text-surface-variant max-w-xs">
            A recruitment company pairing reviewed, anonymised candidate profiles with approved employers through consent-led introductions.
          </p>
          <div className="inline-flex items-center gap-space-xs px-space-sm py-xs rounded-full bg-surface-container/10 text-secondary-fixed text-label-sm font-label-sm">
            <Icon name="verified_user" className="text-sm" /> Identity shared only with consent
          </div>
        </div>
        <div className="space-y-space-sm">
          <h2 className="font-label-md text-label-md uppercase tracking-wider text-surface-bright font-semibold">Platform</h2>
          <ul className="space-y-space-xs font-body-sm text-body-sm text-surface-variant">
            <li><Link className="hover:text-surface-bright transition-colors" href="/services">Recruitment Services</Link></li>
            <li><Link className="hover:text-surface-bright transition-colors" href="/employers">For Employers</Link></li>
            <li><Link className="hover:text-surface-bright transition-colors" href="/candidates">For Candidates</Link></li>
            <li><Link className="hover:text-surface-bright transition-colors" href="/submit-cv">Submit Your CV</Link></li>
          </ul>
        </div>
        <div className="space-y-space-sm">
          <h2 className="font-label-md text-label-md uppercase tracking-wider text-surface-bright font-semibold">Company</h2>
          <ul className="space-y-space-xs font-body-sm text-body-sm text-surface-variant">
            <li><Link className="hover:text-surface-bright transition-colors" href="/about">About TalentVault</Link></li>
            <li><Link className="hover:text-surface-bright transition-colors" href="/contact">Contact Us</Link></li>
            <li><Link className="hover:text-surface-bright transition-colors" href="/login">Employer Sign In</Link></li>
            <li><Link className="hover:text-surface-bright transition-colors" href="/employer/register">Employer Registration</Link></li>
          </ul>
        </div>
        <div className="space-y-space-sm">
          <h2 className="font-label-md text-label-md uppercase tracking-wider text-surface-bright font-semibold">Get in touch</h2>
          {contact.address && <p className="font-body-sm text-body-sm text-surface-variant leading-relaxed whitespace-pre-line">{contact.address}</p>}
          {contact.email && <p className="font-body-sm text-body-sm text-surface-variant"><a className="hover:text-surface-bright" href={`mailto:${contact.email}`}>{contact.email}</a></p>}
          {contact.phone && <p className="font-body-sm text-body-sm text-surface-variant">{contact.phone}</p>}
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-margin lg:px-margin-desktop pt-space-xl border-t border-surface-container/10 flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="font-body-sm text-body-sm text-surface-variant">© {new Date().getFullYear()} TalentVault. All rights reserved.</div>
        <div className="flex items-center gap-space-lg font-body-sm text-body-sm text-surface-variant">
          <Link className="hover:text-surface-bright transition-colors" href="/privacy">Privacy Policy</Link>
          <Link className="hover:text-surface-bright transition-colors" href="/terms">Terms &amp; Conditions</Link>
          <Link className="hover:text-surface-bright transition-colors" href="/admin/login">Staff Login</Link>
        </div>
      </div>
    </footer>
  );
}
