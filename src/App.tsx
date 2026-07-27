import { lazy, Suspense } from 'react';

import { ErrorBoundary } from 'react-error-boundary';
import { ToastContainer } from 'react-toastify';

import ErrorBoundaryFallback from '@/components/errorBoundaryFallback/ErrorBoundaryFallback';

import LoadingIcon from './components/shared/LoadingIcon';

const EquationBuilderPage = lazy(() => import('@/pages/equationBuilderPage/EquationBuilderPage'));

const App = () => (
  <ErrorBoundary
    FallbackComponent={ErrorBoundaryFallback}
    onReset={() => {
      console.log('Try again clicked');
    }}
  >
    <Suspense
      fallback={
        <div className="loader-wrapper">
          <LoadingIcon />
        </div>
      }
    >
      <EquationBuilderPage />
    </Suspense>
    <ToastContainer
      position="bottom-center"
      autoClose={3000}
      limit={1}
      pauseOnHover
      hideProgressBar
    />
  </ErrorBoundary>
);

export default App;
