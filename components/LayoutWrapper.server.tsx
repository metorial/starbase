import { Suspense } from 'react';
import AuthButton from './AuthButton.server';
import LayoutWrapperClient from './LayoutWrapper.client';

let LayoutWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <LayoutWrapperClient
      authComponent={
        <Suspense fallback={null}>
          <AuthButton />
        </Suspense>
      }
    >
      {children}
    </LayoutWrapperClient>
  );
}

export default LayoutWrapper;
