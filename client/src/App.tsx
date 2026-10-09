// ─── App.tsx — Main application with routing ───
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { useSocket } from '@/hooks/useSocket';
import { LandingPage } from '@/pages/LandingPage';
import { CommandCentre } from '@/pages/CommandCentre';
import { DriverDashboard } from '@/pages/DriverDashboard';
import { MonitorPage } from '@/pages/MonitorPage';
import { ReportEmergencyPage } from '@/pages/ReportEmergencyPage';
import { ModeratorPage } from '@/pages/ModeratorPage';
import { DEMO_COORDS } from '@/types';

export default function App() {
  const {
    connected,
    vehicleId,
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
    updateLocation,
    createSimVehicle,
    moveSimVehicle,
    stopSimulation,
    clearAlert,
  } = useSocket('monitor', 'Web Dashboard');

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-midnight text-primary-text">
        <Navbar connected={connected} />

        {/* Global error toast */}
        {error && (
          <div className="fixed top-20 right-4 z-50 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm animate-slide-in-right max-w-sm">
            {error}
          </div>
        )}

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
            path="/command"
            element={
              <CommandCentre
                vehicles={vehicles}
                emergency={emergency}
                timeline={timeline}
                connected={connected}
                onStartEmergency={startEmergency}
                onCancelEmergency={cancelEmergency}
                onCompleteEmergency={completeEmergency}
              />
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
      </div>
    </BrowserRouter>
  );
}
