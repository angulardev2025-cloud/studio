
import Image from 'next/image';

const SplashScreen = () => {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Image src="/download.jpg" alt="logo" width={100} height={100} />
    </div>
  );
};

export default SplashScreen;
