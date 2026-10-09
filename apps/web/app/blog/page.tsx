import { redirect } from "next/navigation";
import { getBlogUrl } from "@workspace/auth/urls";
export default function BlogPage() {
  redirect(getBlogUrl());
}
