"use server";

import { db } from "@workspace/db";
import { user } from "@workspace/db/schema";
import { eq, ilike, or } from "drizzle-orm";
import { requireDelegate } from "@/lib/session";
import { getErrorMessage } from "@/lib/handle-error";

type WCAPerson = {
  person: {
    wca_id: string;
    name: string;
    avatar: {
      url: string;
      thumb_url: string;
    };
  };
};

export async function fetchAndCreateWCAUser(wcaId: string) {
  try {
    const authResult = await requireDelegate();
    if (!authResult.ok) {
      return { success: false, message: authResult.message };
    }

    const existingUser = await db.query.user.findFirst({
      where: eq(user.wcaId, wcaId),
    });

    if (existingUser) {
      return {
        success: true,
        user: { ...existingUser, wcaId },
        message: "Usuario ya existe en la base de datos",
      };
    }

    const response = await fetch(
      `https://www.worldcubeassociation.org/api/v0/persons/${wcaId}`,
    );

    if (!response.ok) {
      return {
        success: false,
        message: "No se encontró el usuario en la WCA",
      };
    }

    const data: WCAPerson = await response.json();

    // Stub row so the person can be assigned as organizer/delegate before they
    // have logged in. First WCA OAuth login claims this row
    // (replaces the placeholder email) via claimWcaStubUser in @workspace/auth.
    const [newUser] = await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        wcaId: data.person.wca_id,
        name: data.person.name,
        email: `${data.person.wca_id}@ams.placeholder`,
        image: data.person.avatar.url,
        role: "user",
      })
      .returning();

    return {
      success: true,
      user: newUser ? { ...newUser, wcaId: data.person.wca_id } : undefined,
      message: `Organizador ${data.person.name} añadido exitosamente`,
    };
  } catch (error) {
    console.error("Error fetching WCA person:", error);
    return {
      success: false,
      message: getErrorMessage(error),
    };
  }
}

export async function searchUsers(query: string) {
  try {
    const authResult = await requireDelegate();
    if (!authResult.ok) {
      return [];
    }

    const columns = {
      id: user.id,
      wcaId: user.wcaId,
      name: user.name,
      email: user.email,
      image: user.image,
    };

    if (!query) {
      return await db.select(columns).from(user).limit(5);
    }

    const pattern = `%${query}%`;
    return await db
      .select(columns)
      .from(user)
      .where(
        or(
          ilike(user.name, pattern),
          ilike(user.wcaId, pattern),
          ilike(user.email, pattern),
        ),
      )
      .limit(5);
  } catch (error) {
    console.error("Error searching users:", error);
    return [];
  }
}
