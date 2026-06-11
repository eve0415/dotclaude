import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useCallback, useState } from 'react';

import { useDataSource } from '#lib/data/data-source';

import { OnboardingScreen } from './-onboarding/onboarding-screen';

const Home = () => {
  const navigate = useNavigate();
  const dataSource = useDataSource();
  const [error, setError] = useState<string | undefined>();

  const runOpen = useCallback(
    async (open: () => Promise<boolean>) => {
      setError(undefined);
      try {
        if (await open()) await navigate({ to: '/overview' });
      } catch (openError) {
        setError(openError instanceof Error ? openError.message : String(openError));
      }
    },
    [navigate],
  );

  return <OnboardingScreen dataSource={dataSource} error={error} runOpen={runOpen} />;
};

export const Route = createFileRoute('/')({
  component: Home,
});
