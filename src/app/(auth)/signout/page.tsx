'use client';

import { Suspense } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { AuthWidget } from '@/widgets/auth-widget';
import { LogOut, Home, ArrowLeft } from 'lucide-react';

interface SignOutContentProps {}

function SignOutContent({}: SignOutContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const handleSignOut = async () => {
    try {
      await signOut({
        callbackUrl,
        redirect: true,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      // Fallback to hard redirect
      window.location.href = callbackUrl;
    }
  };

  const handleCancel = () => {
    router.back();
  };

  const handleGoHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted">
      <div className="w-full max-w-md space-y-6 p-4">
        {/* Auth Widget for quick reference */}
        <div className="flex justify-center">
          <AuthWidget variant="compact" />
        </div>

        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <LogOut className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-xl">로그아웃 확인</CardTitle>
              <CardDescription className="mt-2">
                정말 로그아웃하시겠습니까?
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                로그아웃하면 현재 세션이 종료되고 다시 로그인해야 서비스를 이용할 수 있습니다.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Button
                onClick={handleSignOut}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <LogOut className="w-4 h-4 mr-2" />
                로그아웃
              </Button>

              <Button
                onClick={handleCancel}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                취소
              </Button>

              <Button
                onClick={handleGoHome}
                variant="ghost"
                className="w-full"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                홈으로 이동
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>로그아웃 후에도 언제든지 다시 로그인할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}

export default function SignOutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <SignOutContent />
    </Suspense>
  );
}