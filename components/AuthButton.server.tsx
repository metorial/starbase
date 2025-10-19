import { auth } from '@/lib/auth';
import { presentSession } from '@/lib/presenters/user';
import LoginModal from './LoginModal';
import UserProfile from './UserProfile.client';

export default async function AuthButton() {
  let session = await auth();
  let publicSession = presentSession(session);

  if (publicSession?.user) {
    return <UserProfile user={publicSession.user} />;
  }

  return <LoginModal />;
}
