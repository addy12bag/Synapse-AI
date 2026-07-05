import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./db";

export async function getOrCreateUser() {
  const { userId } = await auth();
  if (!userId) return null;

  // Find user by clerkId
  let dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      preferences: true,
    },
  });

  if (!dbUser) {
    try {
      const clerkUser = await currentUser();
      if (!clerkUser) return null;

      const email = clerkUser.emailAddresses[0]?.emailAddress || "";
      const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "Student";
      const avatarUrl = clerkUser.imageUrl;

      // Check if user exists with the same email
      const existingUser = await prisma.user.findUnique({
        where: { email },
        include: { preferences: true },
      });

      if (existingUser) {
        // Update user's clerkId
        dbUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: { clerkId: userId },
          include: { preferences: true },
        });
      } else {
        // Create new user
        dbUser = await prisma.user.create({
          data: {
            clerkId: userId,
            email,
            name,
            avatarUrl,
            preferences: {
              create: {} // Default preferences
            }
          },
          include: {
            preferences: true,
          },
        });
      }
    } catch (error) {
      console.error("Error synchronizing user with database:", error);
      return null;
    }
  }

  return dbUser;
}
