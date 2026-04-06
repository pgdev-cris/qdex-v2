import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { Layout } from '@/components/Layout'

import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { RemittancePage } from '@/pages/transaction/remittance'
import { MonitoringPage } from '@/pages/transaction/MonitoringPage'
import { UsersPage } from '@/pages/maintenance/UsersPage'
import { SuppliersPage } from '@/pages/maintenance/SuppliersPage'
import { EventsPage } from '@/pages/maintenance/EventsPage'
import { RemittanceStatusPage } from '@/pages/reports/RemittanceStatusPage'

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<LoginPage />} />

                    {/* Protected — Layout handles redirect to /login if unauthenticated */}
                    <Route
                        path="/dashboard"
                        element={
                            <Layout>
                                <DashboardPage />
                            </Layout>
                        }
                    />

                    {/* Transaction */}
                    <Route
                        path="/transaction/remittance"
                        element={
                            <Layout>
                                <RemittancePage />
                            </Layout>
                        }
                    />
                    <Route
                        path="/transaction/monitoring"
                        element={
                            <Layout>
                                <MonitoringPage />
                            </Layout>
                        }
                    />

                    {/* Maintenance */}
                    <Route
                        path="/maintenance/users"
                        element={
                            <Layout>
                                <UsersPage />
                            </Layout>
                        }
                    />
                    <Route
                        path="/maintenance/suppliers"
                        element={
                            <Layout>
                                <SuppliersPage />
                            </Layout>
                        }
                    />
                    <Route
                        path="/maintenance/events"
                        element={
                            <Layout>
                                <EventsPage />
                            </Layout>
                        }
                    />

                    {/* Reports */}
                    <Route
                        path="/reports/remittance-status"
                        element={
                            <Layout>
                                <RemittanceStatusPage />
                            </Layout>
                        }
                    />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    )
}

export default App
