// ─── App.tsx ─ Main application with routing ───
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useSocket } from '@/hooks/useSocket';
import { AuthProvider } from '@/lib/authContext';
import { LandingPage } from '@/pages/LandingPage';
import { CommandCentre } from '@/pages/CommandCentre';
import { DriverDashboard } from '@/pages/DriverDashboard';
import { CarDashboardPage } from '@/pages/CarDashboardPage';
import { MonitorPage } from '@/pages/MonitorPage';
import { ReportEmergencyPage } from '@/pages/ReportEmergencyPage';
import { ModeratorPage } from '@/pages/ModeratorPage';
import { LoginPage } from '@/pages/LoginPage';
import { DEMO_COORDS } from '@/types';

function MainLayout({
  connected,
  error,
  children,
}: {
  connected: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  const location = useLocation();
  const isCarDashboard = location.pathname.startsWith('/car');

  return (
    <div className="min-h-screen bg-midnight text-primary-text">
      {/* Hide regular navbar when in specialized full-screen car dashboard HUD */}
      {!isCarDashboard && <Navbar connected={connected} />}

      {/* Global error toast */}
      {error && (
        <div className="fixed top-20 right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm animate-slide-in-right max-w-sm">
          {error}
        </div>
      )}

      {children}
    </div>
  );
}

export default function App() {
  const {
    connected,
    vehicles,
    emergency,
    timeline,
    alert,
    reports,
    reportError,
    networkStatus,
    error,
    registrationNumber,
    shareConsent,
    setVehicleRegistration,
    submitReport,
    updateReportStatus,
    escalateReport,
    startEmergency,
    cancelEmergency,
    completeEmergency,
    createSimVehicle,
    moveSimVehicle,
    stopSimulation,
    clearAlert,
  } = useSocket('monitor', 'Web Dashboard');

  return (
    <AuthProvider>
      <BrowserRouter>
        <MainLayout connected={connected} error={error}>
          <Routes>
            <Route
              path="/"
              element={
                <LandingPage
                  networkStatus={networkStatus}
                  connected={connected}
                />
              }
            />
            <Route
              path="/login"
              element={
                <LoginPage
                  onDriverLogin={(reg) => {
                    if (reg) setVehicleRegistration(reg, true);
                  }}
                />
              }
            />
            <Route
              path="/command"
              element={
                <ErrorBoundary fallbackTitle="Emergency Command Centre — Display Recovery">
                  <CommandCentre
                    vehicles={vehicles}
                    emergency={emergency}
                    timeline={timeline}
                    connected={connected}
                    onStartEmergency={startEmergency}
                    onCancelEmergency={cancelEmergency}
                    onCompleteEmergency={completeEmergency}
                  />
                </ErrorBoundary>
              }
            />
            <Route
              path="/driver"
              element={
                <DriverDashboard
                  connected={connected}
                  alert={alert}
                  onClearAlert={clearAlert}
                  vehicleLocation={DEMO_COORDS.vehicleA}
                  registrationNumber={registrationNumber}
                  shareConsent={shareConsent}
                  onSaveRegistration={setVehicleRegistration}
                />
              }
            />
            {/* ─── Dedicated Car Dashboard Routes ─── */}
            <Route path="/car" element={<CarDashboardPage />} />
            <Route path="/car-dashboard" element={<CarDashboardPage />} />

            <Route
              path="/report"
              element={
                <ReportEmergencyPage
                  connected={connected}
                  onSubmitReport={submitReport}
                  reportError={reportError}
                />
              }
            />
            <Route
              path="/moderator"
              element={
                <ModeratorPage
                  connected={connected}
                  reports={reports}
                  reportError={reportError}
                  onUpdateStatus={updateReportStatus}
                  onEscalateReport={escalateReport}
                />
              }
            />
            <Route
              path="/monitor"
              element={
                <MonitorPage
                  vehicles={vehicles}
                  emergency={emergency}
                  timeline={timeline}
                  networkStatus={networkStatus}
                  connected={connected}
                  onCreateSimVehicle={createSimVehicle}
                  onMoveSimVehicle={moveSimVehicle}
                  onStopSimulation={stopSimulation}
                  onStartEmergency={startEmergency}
                  onCancelEmergency={cancelEmergency}
                  onCompleteEmergency={completeEmergency}
                />
              }
            />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}
