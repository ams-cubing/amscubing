import { AmsSiteFooter } from "@workspace/ui/components/ams-site-footer";
import { CONTACT_EMAIL } from "@/lib/content";
import {
  getBlogUrl,
  getCalendarUrl,
  getCoursesUrl,
  getWebUrl,
} from "@/lib/urls";

export function SiteFooter() {
  return (
    <AmsSiteFooter
      webUrl={getWebUrl()}
      calendarUrl={getCalendarUrl()}
      blogUrl={getBlogUrl()}
      coursesUrl={getCoursesUrl()}
      contactEmail={CONTACT_EMAIL}
    />
  );
}
