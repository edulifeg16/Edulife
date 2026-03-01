import React, { useState, useEffect } from 'react';
import api from '../../api/apiConfig';
import AdminSidebar from '../../components/layout/AdminSidebar';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

// Register the components you will use from Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// Reusable component for Stat Cards
const StatCard = ({ title, value, icon }) => (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ fontSize: '2.5rem', color: '#4CAF50' }}>{icon}</div>
        <div>
            <h3 style={{ margin: 0, color: '#6B7280', fontSize: '1rem' }}>{title}</h3>
            <p style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold', color: '#111827' }}>{value}</p>
        </div>
    </div>
);

// Reusable component for Chart Containers
const ChartContainer = ({ title, children }) => (
    <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '20px', color: '#111827' }}>{title}</h3>
        {children}
    </div>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/admin/stats');
                setStats(res.data);
            } catch (error) {
                console.error("Failed to fetch stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    // Return a loading state until data is fetched
    if (loading) {
        return (
            <div className="dashboard-layout">
                <AdminSidebar />
                <main className="main-content"><h1>Loading Dashboard...</h1></main>
            </div>
        );
    }

    // Prepare data for the Bar chart
    const enrollmentChartData = {
        labels: stats?.enrollmentsByStandard.map(item => item.name) || [],
        datasets: [{
            label: 'Number of Students',
            data: stats?.enrollmentsByStandard.map(item => item.value) || [],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)',
            borderWidth: 1,
        }]
    };

    // Prepare data for the Pie chart
    const distributionChartData = {
        labels: stats?.studentDistribution.map(item => item.name) || [],
        datasets: [{
            data: stats?.studentDistribution.map(item => item.value) || [],
            backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
            hoverOffset: 4,
        }]
    };

    return (
        <div className="dashboard-layout">
            <AdminSidebar />
            <main className="main-content">
                <h1>Dashboard</h1>
                <p>An overview of the platform's activity.</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '30px' }}>
                    <StatCard title="Total Students" value={stats?.totalUsers || 0} icon="👥" />
                    <StatCard title="Total Courses" value={stats?.totalCourses || 0} icon="📚" />
                    <StatCard title="Total Quizzes" value={stats?.totalQuizzes || 0} icon="✍️" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginTop: '30px' }}>
                    {/* Only render chart if there is data */}
                    {stats?.enrollmentsByStandard?.length > 0 ? (
                        <ChartContainer title="Enrollments by Class">
                            <Bar data={enrollmentChartData} options={{ responsive: true }} />
                        </ChartContainer>
                    ) : (
                        <ChartContainer title="Enrollments by Class">
                            <p>No student enrollment data to display.</p>
                        </ChartContainer>
                    )}

                    {/* Only render chart if there is data */}
                    {stats?.studentDistribution?.length > 0 ? (
                        <ChartContainer title="Student Distribution">
                            <Pie data={distributionChartData} options={{ responsive: true }}/>
                        </ChartContainer>
                    ) : (
                        <ChartContainer title="Student Distribution">
                            <p>No student distribution data to display.</p>
                        </ChartContainer>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;