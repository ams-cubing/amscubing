import { getCoursesUrl } from "@workspace/auth/urls";
import { db } from "@workspace/db";
import {
  formatNotificationTitle,
  formatStaffRoleLabel,
  insertNotifications,
  notifyAllUsers,
} from "@workspace/db/notifications";
import { log } from "@workspace/server/log";

type Course = { id: number; slug: string; title: string };

async function safely(event: string, send: () => Promise<void>) {
  try {
    await send();
  } catch (error) {
    log.error("courses.notification_failed", { event, error });
  }
}

export function notifyCoursePublished(opts: {
  course: Course;
  actorId: string;
}) {
  return safely("course_published", () =>
    notifyAllUsers(db, {
      actorId: opts.actorId,
      type: "course_published",
      title: formatNotificationTitle("course_published", {
        courseTitle: opts.course.title,
      }),
      href: `${getCoursesUrl()}/cursos/${opts.course.slug}`,
      payload: { courseId: opts.course.id, courseTitle: opts.course.title },
    }),
  );
}

export function notifyCourseCompleted(opts: {
  course: Course;
  recipientId: string;
}) {
  return safely("course_completed", () =>
    insertNotifications(db, [
      {
        recipientId: opts.recipientId,
        actorId: null,
        type: "course_completed",
        title: formatNotificationTitle("course_completed", {
          courseTitle: opts.course.title,
        }),
        href: `${getCoursesUrl()}/mis-cursos`,
        payload: { courseId: opts.course.id, courseTitle: opts.course.title },
      },
    ]),
  );
}

export function notifyCourseStaffChanged(opts: {
  recipientId: string;
  actorId: string;
  role: string;
}) {
  const roleLabel =
    opts.role === "none" ? undefined : formatStaffRoleLabel(opts.role);

  return safely("course_staff_changed", () =>
    insertNotifications(db, [
      {
        recipientId: opts.recipientId,
        actorId: opts.actorId,
        type: "course_staff_changed",
        title: formatNotificationTitle("course_staff_changed", { roleLabel }),
        href: `${getCoursesUrl()}${roleLabel ? "/admin" : "/"}`,
        payload: { role: opts.role },
      },
    ]),
  );
}
