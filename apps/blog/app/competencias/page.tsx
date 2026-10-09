import { redirect } from "next/navigation";
import { getWebUrl } from "@workspace/auth/urls";
export default function Page() {
  redirect(`${getWebUrl()}/competencias`);
}
