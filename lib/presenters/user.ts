import type { User } from '@prisma/client';
import type { Session } from 'next-auth';

export type PublicUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export let presentUser = (user: User | null | undefined): PublicUser | null => {
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image
  };
};

export let presentSession = (session: Session | null): {
  user: PublicUser | null;
} | null => {
  if (!session?.user) return null;

  return {
    user: {
      id: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null
    }
  };
};

export let presentUsers = (users: User[]): PublicUser[] => {
  return users.map(presentUser).filter((user): user is PublicUser => user !== null);
};
